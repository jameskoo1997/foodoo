import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PersonalizedRecommendation {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  confidence: number;
  score: number; // Combined score for ranking
  reason: 'history' | 'popular' | 'trending';
}

export const usePersonalizedRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      // For unauthenticated users, show global popular recommendations
      fetchGlobalRecommendations();
    } else {
      // For authenticated users, get personalized recommendations
      fetchPersonalizedRecommendations();
    }
  }, [user]);

  const fetchPersonalizedRecommendations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user's top 3 purchased items
      const { data: userStats, error: statsError } = await supabase
        .from('user_item_stats')
        .select(`
          item_id,
          purchases,
          last_purchased_at,
          menu_items (
            id,
            name,
            price,
            image_url,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('menu_items.is_active', true)
        .order('purchases', { ascending: false })
        .order('last_purchased_at', { ascending: false })
        .limit(3);

      if (statsError) throw statsError;

      if (!userStats || userStats.length === 0) {
        // User has no purchase history, fallback to global recommendations
        await fetchGlobalRecommendations();
        return;
      }

      // Get recommendations for user's top items
      const userItemIds = userStats.map(stat => stat.item_id);
      const { data: recs, error: recsError } = await supabase
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
        .in('item_id', userItemIds)
        .eq('menu_items.is_active', true)
        .order('confidence', { ascending: false });

      if (recsError) throw recsError;

      // Calculate recency weights and scores
      const now = new Date();
      const personalizedRecs = recs?.map(rec => {
        // Find the user stat for the base item to calculate recency weight
        const baseStat = userStats.find(stat => 
          userStats.some(s => s.item_id === rec.menu_items.id)
        );
        
        let recencyWeight = 1;
        if (baseStat?.last_purchased_at) {
          const daysSinceLastPurchase = Math.floor(
            (now.getTime() - new Date(baseStat.last_purchased_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          // Recent purchases get higher weight (decay over 30 days)
          recencyWeight = Math.max(0.1, 1 - (daysSinceLastPurchase / 30));
        }

        return {
          id: rec.menu_items.id,
          name: rec.menu_items.name,
          price: rec.menu_items.price,
          image_url: rec.menu_items.image_url || undefined,
          confidence: rec.confidence,
          score: rec.confidence * recencyWeight,
          reason: 'history' as const,
        };
      }) || [];

      // Remove duplicates and get top recommendations
      const seenIds = new Set<string>();
      const uniqueRecs: PersonalizedRecommendation[] = personalizedRecs
        .filter(rec => {
          if (seenIds.has(rec.id)) return false;
          seenIds.add(rec.id);
          return true;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // If we don't have enough personalized recs, fill with global ones
      if (uniqueRecs.length < 3) {
        const globalRecs = await getGlobalRecommendations(seenIds);
        uniqueRecs.push(...globalRecs.slice(0, 3 - uniqueRecs.length));
      }

      setRecommendations(uniqueRecs);
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error);
      await fetchGlobalRecommendations();
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalRecommendations = async () => {
    setLoading(true);
    try {
      const globalRecs = await getGlobalRecommendations();
      setRecommendations(globalRecs);
    } catch (error) {
      console.error('Error fetching global recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const getGlobalRecommendations = async (excludeIds: Set<string> = new Set()): Promise<PersonalizedRecommendation[]> => {
    // Get top recommendations by support * lift (popularity metric)
    const { data: globalRecs, error: globalError } = await supabase
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
      .eq('menu_items.is_active', true)
      .order('support', { ascending: false })
      .order('lift', { ascending: false })
      .limit(10);

    if (globalError) throw globalError;

    // Calculate popularity scores and filter out excluded items
    const popularRecs: PersonalizedRecommendation[] = globalRecs
      ?.map(rec => ({
        id: rec.menu_items.id,
        name: rec.menu_items.name,
        price: rec.menu_items.price,
        image_url: rec.menu_items.image_url || undefined,
        confidence: rec.confidence,
        score: rec.support * rec.lift, // Popularity score
        reason: 'popular' as const,
      }))
      .filter(rec => !excludeIds.has(rec.id))
      .slice(0, 3) || [];

    return popularRecs;
  };

  return { recommendations, loading, refreshRecommendations: user ? fetchPersonalizedRecommendations : fetchGlobalRecommendations };
};