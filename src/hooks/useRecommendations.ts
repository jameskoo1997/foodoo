import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecommendedItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  confidence: number;
}

export const useRecommendations = (itemId: string | null) => {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setRecommendations([]);
      return;
    }

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

        const formattedRecommendations = data
          ?.map(rec => ({
            id: rec.menu_items.id,
            name: rec.menu_items.name,
            price: rec.menu_items.price,
            image_url: rec.menu_items.image_url,
            confidence: rec.confidence,
          }))
          .filter(Boolean) || [];

        setRecommendations(formattedRecommendations);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [itemId]);

  return { recommendations, loading };
};

export const useCartRecommendations = (cartItemIds: string[]) => {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cartItemIds.length === 0) {
      setRecommendations([]);
      return;
    }

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
        const uniqueRecommendations = new Map<string, RecommendedItem>();

        data?.forEach(rec => {
          const itemId = rec.menu_items.id;
          if (!seenIds.has(itemId) && !uniqueRecommendations.has(itemId)) {
            uniqueRecommendations.set(itemId, {
              id: itemId,
              name: rec.menu_items.name,
              price: rec.menu_items.price,
              image_url: rec.menu_items.image_url,
              confidence: rec.confidence,
            });
            seenIds.add(itemId);
          }
        });

        // Get top 3 recommendations
        const topRecommendations = Array.from(uniqueRecommendations.values())
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 3);

        setRecommendations(topRecommendations);
      } catch (error) {
        console.error('Error fetching cart recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCartRecommendations();
  }, [cartItemIds]);

  return { recommendations, loading };
};