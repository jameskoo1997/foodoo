import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClientSLM } from '@/hooks/useClientSLM';
import { MessageCircle, Send, Sparkles, ShoppingCart, Loader2, Cpu, Cloud, Zap } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  is_active: boolean;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  suggestions?: MenuItem[];
  timestamp: Date;
}

interface AIMenuChatProps {
  onAddToCart: (item: MenuItem) => void;
}

export const AIMenuChat = ({ onAddToCart }: AIMenuChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiModel, setAiModel] = useState<'openai' | 'huggingface' | 'client-slm'>('openai');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const { toast } = useToast();
  const { generateRecommendations, isLoading: slmLoading, loadModel } = useClientSLM();

  // Load menu items for client-side SLM
  useEffect(() => {
    const fetchMenuItems = async () => {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true);
      if (data) setMenuItems(data);
    };
    fetchMenuItems();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      let aiMessage: ChatMessage;

      if (aiModel === 'client-slm') {
        // Use client-side SLM
        const result = await generateRecommendations(query, menuItems);
        aiMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: result.response,
          suggestions: result.suggestions,
          timestamp: new Date(),
        };
      } else {
        // Use server-side AI (OpenAI or HuggingFace)
        const functionName = aiModel === 'openai' ? 'ai-menu-assistant' : 'huggingface-assistant';
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { query }
        });

        if (error) {
          // Fallback to client-side SLM if server fails
          console.log('Server AI failed, falling back to client-side SLM');
          const result = await generateRecommendations(query, menuItems);
          aiMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: `${result.response} (Powered by client-side AI)`,
            suggestions: result.suggestions,
            timestamp: new Date(),
          };
        } else {
          aiMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: data.response,
            suggestions: data.suggestions || [],
            timestamp: new Date(),
          };
        }
      }

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling AI assistant:', error);
      
      // Final fallback to client-side SLM
      try {
        const result = await generateRecommendations(query, menuItems);
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `${result.response} (Offline mode)`,
          suggestions: result.suggestions,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (slmError) {
        toast({
          title: 'Error',
          description: 'All AI services are currently unavailable. Please try again later.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="mb-6">
      {/* AI Model Selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium">AI Model:</span>
        <div className="flex gap-1">
          <Button
            variant={aiModel === 'openai' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAiModel('openai')}
            className="h-7 text-xs"
          >
            <Cloud className="w-3 h-3 mr-1" />
            OpenAI
          </Button>
          <Button
            variant={aiModel === 'huggingface' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAiModel('huggingface')}
            className="h-7 text-xs"
          >
            <Zap className="w-3 h-3 mr-1" />
            HuggingFace
          </Button>
          <Button
            variant={aiModel === 'client-slm' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setAiModel('client-slm');
              loadModel();
            }}
            className="h-7 text-xs"
          >
            <Cpu className="w-3 h-3 mr-1" />
            Local AI
          </Button>
        </div>
      </div>

      {/* Chat Toggle/Input */}
      <div className="relative">
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
          <MessageCircle className="w-5 h-5 text-primary" />
          <Input
            placeholder="Ask me for food recommendations... (e.g., 'Suggest me a vegetarian meal under RM15')"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsExpanded(true)}
            className="border-none bg-transparent focus-visible:ring-0"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || slmLoading || !inputValue.trim()}
            size="sm"
            className="min-w-[40px]"
          >
            {(isLoading || slmLoading) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Chat Messages */}
        {(isExpanded || messages.length > 0) && (
          <Card className="mt-2 max-h-96 overflow-y-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Menu Assistant
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsExpanded(false);
                    setMessages([]);
                  }}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-4">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary/50" />
                  <p>Ask me anything about our menu!</p>
                  <p className="text-xs mt-1">Try: "What's good for lunch under RM20?"</p>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  {message.type === 'ai' && message.suggestions && message.suggestions.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                      {message.suggestions.map((item) => (
                        <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            {item.image_url && (
                              <div className="w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  RM{item.price.toFixed(2)}
                                </Badge>
                              </div>
                              {item.category && (
                                <Badge variant="outline" className="text-xs mb-2">
                                  {item.category}
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {item.description}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => onAddToCart(item)}
                                className="w-full h-7 text-xs"
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Add to Cart
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};