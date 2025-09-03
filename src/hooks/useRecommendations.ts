import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAISuggestions } from './useAISuggestions';

export interface RecommendedItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  confidence: number;
  source?: 'mba' | 'ai';
  rationale?: string;
}

export const useRecommendations = (itemId: string | null) => {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { aiSuggestions, loading: aiLoading } = useAISuggestions(itemId ? [itemId] : []);

  useEffect(() => {
    if (!itemId) {
      setRecommendations([]);
      return;
    }

    fetchRecommendations();
  }, [itemId, aiSuggestions]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          confidence,
          lift,
          support,
          menu_items!recommendations_recommended_item_id_fkey (
            id,
            name,
            price,
            image_url,
            is_active
          )
        `)
        .eq('item_id', itemId)
        .eq('menu_items.is_active', true)
        .order('confidence', { ascending: false })
        .limit(3);

      if (error) throw error;

      const mbaRecommendations = data
        ?.map(rec => ({
          id: rec.menu_items.id,
          name: rec.menu_items.name,
          price: rec.menu_items.price,
          image_url: rec.menu_items.image_url || undefined,
          confidence: rec.confidence,
          source: 'mba' as const,
        }))
        .filter(Boolean) || [];

      // Combine AI suggestions with MBA recommendations
      const seenIds = new Set<string>();
      const combinedRecommendations: RecommendedItem[] = [];
      
      // Add AI suggestions first (higher priority)
      if (aiSuggestions.length > 0) {
        aiSuggestions.forEach(aiSuggestion => {
          if (!seenIds.has(aiSuggestion.id)) {
            combinedRecommendations.push({
              id: aiSuggestion.id,
              name: aiSuggestion.name,
              price: aiSuggestion.price,
              image_url: aiSuggestion.image_url,
              confidence: 1.0,
              source: 'ai' as const,
              rationale: aiSuggestion.rationale,
            });
            seenIds.add(aiSuggestion.id);
          }
        });
      }

      // Add MBA recommendations to fill remaining slots
      mbaRecommendations.forEach(rec => {
        if (!seenIds.has(rec.id) && combinedRecommendations.length < 3) {
          combinedRecommendations.push(rec);
          seenIds.add(rec.id);
        }
      });

      setRecommendations(combinedRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  return { recommendations, loading: loading || aiLoading };
};

export const useCartRecommendations = (cartItemIds: string[]) => {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(false);
  // Use the centralized AI suggestions without triggering new requests
  const { aiSuggestions, loading: aiLoading, hasFallback } = useAISuggestions([]);

  useEffect(() => {
    if (cartItemIds.length === 0) {
      setRecommendations([]);
      return;
    }

    fetchCartRecommendations();
  }, [cartItemIds]);

  const fetchCartRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          confidence,
          recommended_item_id,
          menu_items!recommendations_recommended_item_id_fkey (
            id,
            name,
            price,
            image_url,
            is_active
          )
        `)
        .in('item_id', cartItemIds)
        .eq('menu_items.is_active', true)
        .order('confidence', { ascending: false });

      if (error) throw error;

      // Deduplicate and exclude cart items
      const seenIds = new Set(cartItemIds);
      const mbaRecommendations = new Map<string, RecommendedItem>();

      data?.forEach(rec => {
        const itemId = rec.menu_items.id;
        if (!seenIds.has(itemId) && !mbaRecommendations.has(itemId)) {
          mbaRecommendations.set(itemId, {
            id: itemId,
            name: rec.menu_items.name,
            price: rec.menu_items.price,
            image_url: rec.menu_items.image_url,
            confidence: rec.confidence,
            source: 'mba' as const,
          });
          seenIds.add(itemId);
        }
      });

      // Combine AI suggestions with MBA recommendations
      const allRecommendations: RecommendedItem[] = [];
      
      // Add AI suggestions first (higher priority)
      if (aiSuggestions.length > 0) {
        aiSuggestions.forEach(aiSuggestion => {
          if (!seenIds.has(aiSuggestion.id)) {
            allRecommendations.push({
              id: aiSuggestion.id,
              name: aiSuggestion.name,
              price: aiSuggestion.price,
              image_url: aiSuggestion.image_url,
              confidence: 1.0, // AI suggestions get highest confidence
              source: 'ai' as const,
              rationale: aiSuggestion.rationale,
            });
            seenIds.add(aiSuggestion.id);
          }
        });
      }

      // Add MBA recommendations to fill remaining slots
      const remainingSlots = 3 - allRecommendations.length;
      const mbaRecsArray = Array.from(mbaRecommendations.values())
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, remainingSlots);

      allRecommendations.push(...mbaRecsArray);

      setRecommendations(allRecommendations.slice(0, 3));
    } catch (error) {
      console.error('Error fetching cart recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  return { recommendations, loading: loading || aiLoading };
};