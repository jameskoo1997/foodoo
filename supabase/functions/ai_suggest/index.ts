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

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ==> AI Suggest function called - COMPLETELY REWRITTEN VERSION`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] ==> Handling CORS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${timestamp}] ==> Starting environment variable check...`);
    
    // Get all environment variables and log extensively
    const envKeys = Object.keys(Deno.env.toObject());
    console.log(`[${timestamp}] ==> Total environment variables available: ${envKeys.length}`);
    console.log(`[${timestamp}] ==> All env var names:`, envKeys);
    
    // Multiple attempts to get the OpenAI API key
    let OPENAI_API_KEY = null;
    
    // Method 1: Standard approach
    try {
      OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      console.log(`[${timestamp}] ==> Method 1 (Deno.env.get): ${OPENAI_API_KEY ? 'SUCCESS - Found key' : 'FAILED - No key'}`);
    } catch (error) {
      console.log(`[${timestamp}] ==> Method 1 ERROR:`, error.message);
    }
    
    // Method 2: From environment object
    if (!OPENAI_API_KEY) {
      try {
        const envObj = Deno.env.toObject();
        OPENAI_API_KEY = envObj['OPENAI_API_KEY'];
        console.log(`[${timestamp}] ==> Method 2 (env object): ${OPENAI_API_KEY ? 'SUCCESS - Found key' : 'FAILED - No key'}`);
      } catch (error) {
        console.log(`[${timestamp}] ==> Method 2 ERROR:`, error.message);
      }
    }
    
    // Method 3: Check for case variations
    if (!OPENAI_API_KEY) {
      const variations = ['openai_api_key', 'OPENAI_KEY', 'openai_key'];
      for (const variation of variations) {
        try {
          const key = Deno.env.get(variation);
          if (key) {
            OPENAI_API_KEY = key;
            console.log(`[${timestamp}] ==> Method 3 SUCCESS - Found key with variation: ${variation}`);
            break;
          }
        } catch (error) {
          console.log(`[${timestamp}] ==> Method 3 ERROR for ${variation}:`, error.message);
        }
      }
    }
    
    // Final check and detailed logging
    console.log(`[${timestamp}] ==> FINAL RESULT: OpenAI API Key ${OPENAI_API_KEY ? 'FOUND' : 'NOT FOUND'}`);
    
    if (!OPENAI_API_KEY) {
      console.log(`[${timestamp}] ==> CRITICAL: No OpenAI API key accessible. Using rule-based fallback.`);
      
      // Get menu items for rule-based recommendations
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { user_id, cart_item_ids }: AIRequest = await req.json();
      
      // Get current cart items to avoid duplicates
      const { data: cartItems } = await supabase
        .from('menu_items')
        .select('id, category')
        .in('id', cart_item_ids);

      // Get complementary items (different categories)
      const cartCategories = cartItems?.map(item => item.category) || [];
      
      const { data: recommendations } = await supabase
        .from('menu_items')
        .select('id, name, price')
        .eq('is_active', true)
        .not('category', 'in', `(${cartCategories.join(',')})`)
        .not('id', 'in', `(${cart_item_ids.join(',')})`)
        .limit(3);

      return new Response(JSON.stringify({ 
        success: true,
        suggestions: {
          item_ids: recommendations?.map(item => item.id) || [],
          rationale: 'Rule-based recommendations: complementary items from different categories'
        },
        fallback: true,
        timestamp: timestamp,
        debug: {
          functionVersion: 'RULE_BASED_FALLBACK',
          apiKeyIssue: true,
          recommendationsCount: recommendations?.length || 0
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${timestamp}] ==> SUCCESS: OpenAI API key found, proceeding with AI suggestions`);
    console.log(`[${timestamp}] ==> Key length: ${OPENAI_API_KEY.length}, starts with: ${OPENAI_API_KEY.substring(0, 10)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, cart_item_ids }: AIRequest = await req.json();
    console.log(`[${timestamp}] ==> Processing request for user: ${user_id}, cart items: ${cart_item_ids.length}`);

    // Get menu items for context (simplified for testing)
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, name, category, price')
      .eq('is_active', true)
      .limit(5);

    console.log(`[${timestamp}] ==> Fetched ${menuItems?.length || 0} menu items`);

    // Simple OpenAI API test call
    console.log(`[${timestamp}] ==> Making OpenAI API call...`);
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a restaurant AI. Return JSON with suggested menu item IDs from this list. Response format: {"item_ids": ["id1", "id2"], "rationale": "explanation"}' 
          },
          { 
            role: 'user', 
            content: `Menu items: ${JSON.stringify(menuItems?.slice(0, 3) || [])}. Suggest 1-2 items for a cart.` 
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    console.log(`[${timestamp}] ==> OpenAI response status: ${openAIResponse.status}`);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error(`[${timestamp}] ==> OpenAI API error: ${errorText}`);
      throw new Error(`OpenAI API failed: ${errorText}`);
    }

    const aiResult = await openAIResponse.json();
    console.log(`[${timestamp}] ==> OpenAI success! Usage:`, aiResult.usage);

    let suggestions = { item_ids: [], rationale: 'AI processing completed successfully' };
    try {
      const content = aiResult.choices[0].message.content;
      suggestions = JSON.parse(content);
      console.log(`[${timestamp}] ==> Parsed AI suggestions:`, suggestions);
    } catch (parseError) {
      console.log(`[${timestamp}] ==> Parse error, using defaults:`, parseError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      suggestions: suggestions,
      timestamp: timestamp,
      debug: {
        functionVersion: 'COMPLETELY_REWRITTEN',
        openaiUsed: true,
        keyFound: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[${timestamp}] ==> FUNCTION ERROR:`, error.message);
    console.error(`[${timestamp}] ==> Error stack:`, error.stack);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback: true,
      timestamp: timestamp,
      debug: {
        functionVersion: 'COMPLETELY_REWRITTEN',
        errorOccurred: true,
        errorType: error.constructor.name
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});