import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  order_id: string;
  item_id: string;
}

interface ItemsetData {
  itemA: string;
  itemB: string;
  supportA: number;
  supportB: number;
  supportAB: number;
  totalOrders: number;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ==> MBA Refresh function called`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] ==> Handling CORS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[${timestamp}] ==> Starting MBA analysis...`);

    // Get all order items from completed orders
    const { data: orderItems, error: orderError } = await supabase
      .from('order_items')
      .select(`
        order_id,
        item_id,
        orders!inner(status)
      `)
      .eq('orders.status', 'completed');

    if (orderError) {
      console.error(`[${timestamp}] ==> Error fetching orders:`, orderError);
      throw orderError;
    }

    if (!orderItems || orderItems.length === 0) {
      console.log(`[${timestamp}] ==> No completed orders found`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No completed orders found to analyze',
        recommendations_updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${timestamp}] ==> Found ${orderItems.length} order items`);

    // Group items by order
    const orderGroups = new Map<string, Set<string>>();
    orderItems.forEach(item => {
      if (!orderGroups.has(item.order_id)) {
        orderGroups.set(item.order_id, new Set());
      }
      orderGroups.get(item.order_id)!.add(item.item_id);
    });

    const totalOrders = orderGroups.size;
    console.log(`[${timestamp}] ==> Analyzing ${totalOrders} orders`);

    // Calculate item frequencies (support for individual items)
    const itemCounts = new Map<string, number>();
    for (const items of orderGroups.values()) {
      for (const itemId of items) {
        itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
      }
    }

    // Calculate itemset frequencies (support for item pairs)
    const itemsetCounts = new Map<string, number>();
    for (const items of orderGroups.values()) {
      const itemArray = Array.from(items);
      // Generate all pairs
      for (let i = 0; i < itemArray.length; i++) {
        for (let j = i + 1; j < itemArray.length; j++) {
          const itemA = itemArray[i];
          const itemB = itemArray[j];
          const pair = [itemA, itemB].sort().join('|');
          itemsetCounts.set(pair, (itemsetCounts.get(pair) || 0) + 1);
        }
      }
    }

    // Calculate MBA metrics and prepare recommendations
    const recommendations: any[] = [];
    const minSupport = 0.01; // At least 1% of orders
    const minConfidence = 0.1; // At least 10% confidence

    console.log(`[${timestamp}] ==> Calculating MBA metrics...`);

    for (const [pairKey, pairCount] of itemsetCounts.entries()) {
      const [itemA, itemB] = pairKey.split('|');
      
      const supportA = (itemCounts.get(itemA) || 0) / totalOrders;
      const supportB = (itemCounts.get(itemB) || 0) / totalOrders;
      const supportAB = pairCount / totalOrders;
      
      // Skip if support is too low
      if (supportAB < minSupport) continue;
      
      // Calculate confidence A->B and B->A
      const confidenceAB = supportAB / supportA;
      const confidenceBA = supportAB / supportB;
      
      // Skip if confidence is too low
      if (confidenceAB < minConfidence && confidenceBA < minConfidence) continue;
      
      // Calculate lift A->B and B->A
      const liftAB = confidenceAB / supportB;
      const liftBA = confidenceBA / supportA;
      
      // Add recommendation A->B if metrics are good
      if (confidenceAB >= minConfidence && liftAB > 1) {
        recommendations.push({
          item_id: itemA,
          recommended_item_id: itemB,
          support: supportAB,
          confidence: confidenceAB,
          lift: liftAB
        });
      }
      
      // Add recommendation B->A if metrics are good
      if (confidenceBA >= minConfidence && liftBA > 1) {
        recommendations.push({
          item_id: itemB,
          recommended_item_id: itemA,
          support: supportAB,
          confidence: confidenceBA,
          lift: liftBA
        });
      }
    }

    console.log(`[${timestamp}] ==> Generated ${recommendations.length} recommendations`);

    if (recommendations.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No qualifying recommendations found with current thresholds',
        recommendations_updated: 0,
        analysis: {
          total_orders: totalOrders,
          unique_items: itemCounts.size,
          item_pairs: itemsetCounts.size,
          min_support: minSupport,
          min_confidence: minConfidence
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clear existing recommendations and insert new ones
    console.log(`[${timestamp}] ==> Clearing existing recommendations...`);
    const { error: deleteError } = await supabase
      .from('recommendations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error(`[${timestamp}] ==> Error clearing recommendations:`, deleteError);
      throw deleteError;
    }

    console.log(`[${timestamp}] ==> Inserting new recommendations...`);
    const { error: insertError } = await supabase
      .from('recommendations')
      .insert(recommendations);

    if (insertError) {
      console.error(`[${timestamp}] ==> Error inserting recommendations:`, insertError);
      throw insertError;
    }

    console.log(`[${timestamp}] ==> MBA analysis completed successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Recommendations updated successfully',
      recommendations_updated: recommendations.length,
      analysis: {
        total_orders: totalOrders,
        unique_items: itemCounts.size,
        item_pairs: itemsetCounts.size,
        min_support: minSupport,
        min_confidence: minConfidence,
        top_recommendations: recommendations
          .sort((a, b) => b.lift - a.lift)
          .slice(0, 5)
          .map(r => ({
            confidence: r.confidence.toFixed(3),
            lift: r.lift.toFixed(3),
            support: r.support.toFixed(3)
          }))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[${timestamp}] ==> MBA refresh error:`, error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: timestamp
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});