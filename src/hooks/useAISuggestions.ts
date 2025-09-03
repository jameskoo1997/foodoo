import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export const useAISuggestions = (cartItemIds: string[]) => {
  const { user } = useAuth();
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFallback, setHasFallback] = useState(false);

  useEffect(() => {
    if (cartItemIds.length > 0) {
      fetchAISuggestions();
    } else {
      setAISuggestions([]);
    }
  }, [cartItemIds, user]);

  const fetchAISuggestions = async () => {
    setLoading(true);
    setHasFallback(false);
    
    try {
      // Call the AI suggest edge function
      const { data: response, error } = await supabase.functions.invoke('ai_suggest', {
        body: {
          user_id: user?.id || null,
          cart_item_ids: cartItemIds,
        },
      });

      if (error) {
        console.error('Error calling ai_suggest function:', error);
        setHasFallback(true);
        return;
      }

      const aiResponse: AISuggestionsResponse = response;
      
      if (!aiResponse.success || aiResponse.fallback) {
        setHasFallback(true);
        return;
      }

      if (aiResponse.suggestions && aiResponse.suggestions.item_ids.length > 0) {
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

        setAISuggestions(suggestions);
      } else {
        setAISuggestions([]);
      }

    } catch (error) {
      console.error('Unexpected error in AI suggestions:', error);
      setHasFallback(true);
    } finally {
      setLoading(false);
    }
  };

  return { 
    aiSuggestions, 
    loading, 
    hasFallback,
    refreshSuggestions: fetchAISuggestions
  };
};