import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('Received query:', query);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active menu items
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true);

    if (menuError) {
      console.error('Error fetching menu items:', menuError);
      throw menuError;
    }

    console.log(`Found ${menuItems?.length || 0} menu items`);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Prepare menu items context for AI
    const menuContext = menuItems?.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
    })) || [];

    // Create AI prompt
    const systemPrompt = `You are a helpful food recommendation assistant for the Foodoo restaurant. 
Your job is to understand customer queries and recommend relevant menu items.

Here are the available menu items:
${JSON.stringify(menuContext, null, 2)}

When a user asks for recommendations:
1. Analyze their request (dietary preferences, price range, meal type, etc.)
2. Select the most relevant menu items (3-6 items max)
3. Provide a friendly response explaining why you chose these items
4. Return your response in this exact JSON format:

{
  "response": "Your friendly explanation here",
  "suggested_items": ["item_id_1", "item_id_2", "item_id_3"]
}

Be conversational and helpful. Consider factors like:
- Price preferences (under RM15, budget-friendly, etc.)
- Dietary restrictions (vegetarian, spicy, etc.)
- Meal type (lunch, dinner, snack, etc.)
- Cuisine preferences
- Portion size preferences

Always suggest items that exist in the menu above.`;

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response:', openAIData);

    let aiResponse: string;
    let suggestedItemIds: string[] = [];

    try {
      const aiContent = openAIData.choices[0].message.content;
      const parsedResponse = JSON.parse(aiContent);
      aiResponse = parsedResponse.response;
      suggestedItemIds = parsedResponse.suggested_items || [];
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback: use the raw response and suggest popular items
      aiResponse = openAIData.choices[0].message.content;
      suggestedItemIds = menuItems?.slice(0, 3).map(item => item.id) || [];
    }

    // Get the suggested menu items details
    const suggestions = menuItems?.filter(item => suggestedItemIds.includes(item.id)) || [];
    
    console.log(`Returning ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        suggestions: suggestions,
        query: query,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-menu-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process your request',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});