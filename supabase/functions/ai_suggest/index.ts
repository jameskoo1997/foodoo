import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIRequest {
  user_id?: string;
  cart_item_ids: string[];
}

interface MenuItemData {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface RecommendationData {
  item_id: string;
  recommended_item_id: string;
  confidence: number;
  item_name: string;
  recommended_name: string;
}

interface UserPreferences {
  top_categories: string[];
  avg_price_band: { min: number; max: number };
  total_orders: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    console.log('Checking OpenAI API key availability:', OPENAI_API_KEY ? 'Found' : 'Not found');
    
    if (!OPENAI_API_KEY) {
      console.log('OpenAI API key not found, falling back to rule-based recommendations');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key not configured',
        fallback: true 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, cart_item_ids }: AIRequest = await req.json();
    console.log('AI Suggest request:', { user_id, cart_item_ids });

    // 1. Get top 10 menu items for context
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, category, price')
      .eq('is_active', true)
      .order('name')
      .limit(10);

    if (menuError) {
      console.error('Error fetching menu items:', menuError);
      throw menuError;
    }

    // 2. Get MBA recommendations for cart items
    const { data: mbaRecs, error: mbaError } = await supabase
      .from('recommendations')
      .select(`
        item_id,
        recommended_item_id,
        confidence,
        menu_items!recommendations_item_id_fkey (name),
        recommended_item:menu_items!recommendations_recommended_item_id_fkey (name)
      `)
      .in('item_id', cart_item_ids)
      .order('confidence', { ascending: false })
      .limit(6);

    if (mbaError) {
      console.error('Error fetching MBA recommendations:', mbaError);
      // Continue without MBA recs
    }

    // 3. Get user preferences if user_id is provided
    let userPreferences: UserPreferences | null = null;
    if (user_id) {
      const { data: userStats, error: statsError } = await supabase
        .from('user_item_stats')
        .select(`
          item_id,
          purchases,
          menu_items (category, price)
        `)
        .eq('user_id', user_id);

      if (!statsError && userStats) {
        const categories = userStats.map(s => s.menu_items.category).filter(Boolean);
        const prices = userStats.map(s => s.menu_items.price);
        
        const categoryCount = categories.reduce((acc, cat) => {
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        userPreferences = {
          top_categories: Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([cat]) => cat),
          avg_price_band: {
            min: Math.min(...prices),
            max: Math.max(...prices)
          },
          total_orders: userStats.length
        };
      }
    }

    // 4. Build compact JSON context
    const context = {
      menu_items: menuItems?.slice(0, 10).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price
      })) || [],
      mba_recommendations: mbaRecs?.map(rec => ({
        base_item: rec.menu_items?.name || 'Unknown',
        recommended_item: rec.recommended_item?.name || 'Unknown',
        recommended_id: rec.recommended_item_id,
        confidence: rec.confidence
      })) || [],
      user_preferences: userPreferences,
      cart_items: cart_item_ids.length
    };

    // 5. Call OpenAI GPT-4
    const systemPrompt = `You are a restaurant recommender AI. Given cart items, MBA rules, and user history, return up to 3 concrete menu item IDs to suggest. 

Guidelines:
- Prefer complementary items (drinks with meals, desserts with mains)
- Avoid duplicates already in cart
- Stay within user's typical price band if available
- Use MBA recommendations as primary guidance
- Consider user's favorite categories

Output strictly as JSON: {"item_ids": [uuid,...], "rationale": "short reason why these items work well together"}

Context: ${JSON.stringify(context)}`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Current cart has ${cart_item_ids.length} items. Suggest complementary items.` }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', await openAIResponse.text());
      throw new Error('OpenAI API request failed');
    }

    const aiResult = await openAIResponse.json();
    console.log('OpenAI response:', aiResult);

    let suggestions;
    try {
      const content = aiResult.choices[0].message.content;
      suggestions = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Validate that suggested item IDs exist in our menu
    const validItemIds = menuItems?.map(item => item.id) || [];
    const validSuggestions = {
      item_ids: suggestions.item_ids?.filter((id: string) => validItemIds.includes(id)) || [],
      rationale: suggestions.rationale || 'AI-powered recommendations based on your preferences'
    };

    console.log('Final AI suggestions:', validSuggestions);

    return new Response(JSON.stringify({
      success: true,
      suggestions: validSuggestions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai_suggest function:', error);
    
    // Return graceful fallback response
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback: true 
    }), {
      status: 200, // Still return 200 for graceful fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});