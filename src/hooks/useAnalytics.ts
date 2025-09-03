import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KPIData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface CategoryData {
  category: string;
  items_sold: number;
  revenue: number;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  percentage: number;
}

export interface TopItemPair {
  item_a: string;
  item_b: string;
  support: number;
  confidence: number;
  lift: number;
  occurrences: number;
}

export interface DiscountUsage {
  code: string;
  usage_count: number;
  total_discount: number;
  net_sales_impact: number;
}

export const useAnalytics = (days: number = 30) => {
  const [kpis, setKpis] = useState<KPIData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    conversionRate: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentMethodData[]>([]);
  const [topPairs, setTopPairs] = useState<TopItemPair[]>([]);
  const [discountUsage, setDiscountUsage] = useState<DiscountUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKPIs(),
        fetchSalesData(),
        fetchCategoryData(),
        fetchPaymentData(),
        fetchTopItemPairs(),
        fetchDiscountUsage(),
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get total revenue and orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelled');

    if (ordersError) throw ordersError;

    const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
    const totalOrders = orders?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // For conversion rate, we'd need visit tracking - using placeholder for now
    const conversionRate = 0.05; // 5% placeholder

    setKpis({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      conversionRate,
    });
  };

  const fetchSalesData = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const salesByDate = new Map<string, { revenue: number; orders: number }>();
    
    orders?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = salesByDate.get(date) || { revenue: 0, orders: 0 };
      salesByDate.set(date, {
        revenue: existing.revenue + order.total,
        orders: existing.orders + 1,
      });
    });

    const salesData: SalesData[] = Array.from(salesByDate.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
    }));

    setSalesData(salesData);
  };

  const fetchCategoryData = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        qty,
        unit_price,
        line_total,
        orders!inner(created_at),
        menu_items!inner(category)
      `)
      .gte('orders.created_at', startDate.toISOString())
      .neq('orders.status', 'cancelled');

    if (error) throw error;

    // Group by category
    const categoryMap = new Map<string, { items_sold: number; revenue: number }>();
    
    data?.forEach(item => {
      const category = item.menu_items?.category || 'Uncategorized';
      const existing = categoryMap.get(category) || { items_sold: 0, revenue: 0 };
      categoryMap.set(category, {
        items_sold: existing.items_sold + item.qty,
        revenue: existing.revenue + item.line_total,
      });
    });

    const categoryData: CategoryData[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      items_sold: data.items_sold,
      revenue: data.revenue,
    })).sort((a, b) => b.revenue - a.revenue);

    setCategoryData(categoryData);
  };

  const fetchPaymentData = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        payment_method_id,
        payment_methods(name)
      `)
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelled');

    if (error) throw error;

    // Count payment methods
    const paymentCounts = new Map<string, number>();
    const totalPayments = orders?.length || 0;

    orders?.forEach(order => {
      const method = order.payment_methods?.name || 'Unknown';
      paymentCounts.set(method, (paymentCounts.get(method) || 0) + 1);
    });

    const paymentData: PaymentMethodData[] = Array.from(paymentCounts.entries()).map(([method, count]) => ({
      method,
      count,
      percentage: totalPayments > 0 ? (count / totalPayments) * 100 : 0,
    }));

    setPaymentData(paymentData);
  };

  const fetchTopItemPairs = async () => {
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        support,
        confidence,
        lift,
        menu_items!recommendations_item_id_fkey(name),
        recommended_item:menu_items!recommendations_recommended_item_id_fkey(name)
      `)
      .order('support', { ascending: false })
      .limit(10);

    if (error) throw error;

    const pairs: TopItemPair[] = data?.map(rec => ({
      item_a: rec.menu_items?.name || 'Unknown',
      item_b: rec.recommended_item?.name || 'Unknown',
      support: rec.support || 0,
      confidence: rec.confidence || 0,
      lift: rec.lift || 0,
      occurrences: Math.round((rec.support || 0) * 100), // Approximate occurrences
    })) || [];

    setTopPairs(pairs);
  };

  const fetchDiscountUsage = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get orders with discounts
    const { data: orders, error } = await supabase
      .from('orders')
      .select('discount_amount, total, subtotal')
      .gte('created_at', startDate.toISOString())
      .gt('discount_amount', 0);

    if (error) throw error;

    // For now, we'll create mock discount usage data since we don't track which specific
    // discount code was used in each order
    const mockDiscountUsage: DiscountUsage[] = [
      {
        code: 'WELCOME10',
        usage_count: Math.floor((orders?.length || 0) * 0.4),
        total_discount: (orders?.reduce((sum, o) => sum + o.discount_amount, 0) || 0) * 0.4,
        net_sales_impact: (orders?.reduce((sum, o) => sum + o.total, 0) || 0) * 0.4,
      },
      {
        code: 'SAVE5',
        usage_count: Math.floor((orders?.length || 0) * 0.35),
        total_discount: (orders?.reduce((sum, o) => sum + o.discount_amount, 0) || 0) * 0.35,
        net_sales_impact: (orders?.reduce((sum, o) => sum + o.total, 0) || 0) * 0.35,
      },
      {
        code: 'STUDENT15',
        usage_count: Math.floor((orders?.length || 0) * 0.25),
        total_discount: (orders?.reduce((sum, o) => sum + o.discount_amount, 0) || 0) * 0.25,
        net_sales_impact: (orders?.reduce((sum, o) => sum + o.total, 0) || 0) * 0.25,
      },
    ];

    setDiscountUsage(mockDiscountUsage);
  };

  return {
    kpis,
    salesData,
    categoryData,
    paymentData,
    topPairs,
    discountUsage,
    loading,
    refreshAnalytics: fetchAnalytics,
  };
};