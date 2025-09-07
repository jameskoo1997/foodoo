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
    console.log('Received query for HuggingFace:', query);

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

    // Get Hugging Face API key
    const hfApiKey = Deno.env.get('HUGGING_FACE_API_KEY');
    if (!hfApiKey) {
      throw new Error('Hugging Face API key not found');
    }

    // Prepare menu items context
    const menuContext = menuItems?.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
    })) || [];

    // Create AI prompt
    const systemPrompt = `You are a helpful food recommendation assistant for Foodoo restaurant. 
Analyze the user's request and recommend 2-4 relevant menu items.

Available menu items:
${JSON.stringify(menuContext, null, 2)}

Respond in JSON format:
{
  "response": "Your friendly explanation here",
  "suggested_items": ["item_id_1", "item_id_2"]
}

Consider dietary preferences, price range, meal type, and cuisine preferences.`;

    // Call Hugging Face Inference API with Mistral 7B
    const hfResponse = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `<s>[INST] ${systemPrompt}

User query: ${query} [/INST]`,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false,
        },
      }),
    });

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error('Hugging Face API error:', errorText);
      throw new Error(`Hugging Face API error: ${hfResponse.status}`);
    }

    const hfData = await hfResponse.json();
    console.log('Hugging Face response:', hfData);

    let aiResponse: string;
    let suggestedItemIds: string[] = [];

    try {
      const generated = hfData[0]?.generated_text || '';
      
      // Try to extract JSON from the response
      const jsonMatch = generated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        aiResponse = parsedResponse.response;
        suggestedItemIds = parsedResponse.suggested_items || [];
      } else {
        // Fallback: use raw response and suggest items based on keywords
        aiResponse = generated || 'Here are some recommendations for you.';
        
        // Simple keyword matching fallback
        const keywords = query.toLowerCase().split(' ');
        const matchedItems = menuItems?.filter(item => 
          keywords.some(keyword => 
            item.name.toLowerCase().includes(keyword) ||
            item.category.toLowerCase().includes(keyword) ||
            item.description.toLowerCase().includes(keyword)
          )
        ).slice(0, 3) || [];
        
        suggestedItemIds = matchedItems.map(item => item.id);
      }
    } catch (parseError) {
      console.error('Error parsing HF response:', parseError);
      
      // Final fallback
      aiResponse = 'Here are some popular items from our menu that might interest you.';
      suggestedItemIds = menuItems?.slice(0, 3).map(item => item.id) || [];
    }

    // Get the suggested menu items details
    const suggestions = menuItems?.filter(item => suggestedItemIds.includes(item.id)) || [];
    
    console.log(`Returning ${suggestions.length} suggestions from HuggingFace`);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        suggestions: suggestions,
        query: query,
        model: 'huggingface-mistral-7b'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in huggingface-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process your request with Hugging Face',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});