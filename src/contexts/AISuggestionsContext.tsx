import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AISuggestion {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  rationale: string;
  source: 'ai';
}

interface AISuggestionsResponse {
  success: boolean;
  suggestions?: {
    item_ids: string[];
    rationale: string;
  };
  error?: string;
  fallback?: boolean;
}

interface AISuggestionsContextType {
  aiSuggestions: AISuggestion[];
  loading: boolean;
  hasFallback: boolean;
  getSuggestions: (cartItemIds: string[]) => Promise<void>;
}

const AISuggestionsContext = createContext<AISuggestionsContextType | undefined>(undefined);

export const useAISuggestions = (cartItemIds: string[]) => {
  const context = useContext(AISuggestionsContext);
  if (!context) {
    throw new Error('useAISuggestions must be used within AISuggestionsProvider');
  }

  const { getSuggestions, aiSuggestions, loading, hasFallback } = context;
  const lastCartIdsRef = useRef<string>('');

  useEffect(() => {
    const currentCartKey = JSON.stringify(cartItemIds.sort());
    
    // Only fetch if cart has changed
    if (currentCartKey !== lastCartIdsRef.current) {
      lastCartIdsRef.current = currentCartKey;
      
      if (cartItemIds.length > 0) {
        getSuggestions(cartItemIds);
      }
    }
  }, [cartItemIds, getSuggestions]);

  return { aiSuggestions, loading, hasFallback };
};

export const AISuggestionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFallback, setHasFallback] = useState(false);
  const [hasShownFallbackToast, setHasShownFallbackToast] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<string | null>(null);
  const { toast } = useToast();

  const getSuggestions = async (cartItemIds: string[]) => {
    const requestKey = JSON.stringify(cartItemIds.sort());
    
    // Prevent duplicate requests
    if (currentRequest === requestKey || loading) {
      console.log('AI suggestions: Skipping duplicate request');
      return;
    }

    console.log('AI suggestions: Starting fetch for cart:', cartItemIds);
    setCurrentRequest(requestKey);
    setLoading(true);
    setHasFallback(false);
    
    try {
      // Call the AI suggest edge function
      console.log('AI suggestions: Calling ai_suggest function with:', {
        user_id: user?.id || null,
        cart_item_ids: cartItemIds,
      });
      
      const { data: response, error } = await supabase.functions.invoke('ai_suggest', {
        body: {
          user_id: user?.id || null,
          cart_item_ids: cartItemIds,
        },
      });

      console.log('AI suggestions: Function response:', { data: response, error });

      if (error) {
        console.error('Error calling ai_suggest function:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setHasFallback(true);
        return;
      }

      // Debug the actual response structure
      console.log('AI suggestions: Raw response type:', typeof response);
      console.log('AI suggestions: Raw response:', response);
      console.log('AI suggestions: Response keys:', Object.keys(response || {}));
      
      const aiResponse: AISuggestionsResponse = response;
      
      if (!aiResponse.success) {
        setHasFallback(true);
        return;
      }

      // Handle fallback notifications (but still process suggestions if successful)
      if (aiResponse.fallback && cartItemIds.length > 0 && !hasShownFallbackToast) {
        setHasFallback(true);
        toast({
          title: 'Using rule-based recommendations',
          description: 'AI suggestions are not available right now, showing market basket analysis instead.',
          variant: 'default',
        });
        setHasShownFallbackToast(true);
      }

      if (aiResponse.suggestions && aiResponse.suggestions.item_ids.length > 0) {
        // Reset fallback toast flag when AI suggestions are working
        setHasShownFallbackToast(false);
        
        // Fetch detailed menu item information for the suggested IDs
        const { data: menuItems, error: menuError } = await supabase
          .from('menu_items')
          .select('id, name, price, image_url')
          .in('id', aiResponse.suggestions.item_ids)
          .eq('is_active', true);

        if (menuError) {
          console.error('Error fetching AI suggested menu items:', menuError);
          setHasFallback(true);
          return;
        }

        // Map the menu items to AI suggestions with rationale
        const suggestions: AISuggestion[] = menuItems?.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image_url || undefined,
          rationale: aiResponse.suggestions!.rationale,
          source: 'ai' as const,
        })) || [];

        if (suggestions.length > 0) {
          toast({
            title: 'AI suggestions available! ✨',
            description: 'Enhanced recommendations are being powered by AI for better suggestions.',
          });
        }
        
        setAISuggestions(suggestions);
      } else {
        setAISuggestions([]);
      }

    } catch (error) {
      console.error('Unexpected error in AI suggestions:', error);
      setHasFallback(true);
    } finally {
      setLoading(false);
      setCurrentRequest(null);
    }
  };

  // Reset state when cart becomes empty
  useEffect(() => {
    if (!currentRequest) {
      setAISuggestions([]);
      setHasFallback(false);
      setHasShownFallbackToast(false);
    }
  }, [currentRequest]);

  return (
    <AISuggestionsContext.Provider value={{
      aiSuggestions,
      loading,
      hasFallback,
      getSuggestions,
    }}>
      {children}
    </AISuggestionsContext.Provider>
  );
};