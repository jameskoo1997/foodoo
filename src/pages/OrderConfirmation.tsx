import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface OrderItem {
  id: string;
  qty: number;
  unit_price: number;
  line_total: number;
  menu_items: {
    name: string;
    image_url?: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled';
  subtotal: number;
  discount_amount: number;
  total: number;
  order_items: OrderItem[];
  payment_methods: {
    name: string;
  } | null;
}

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (
              name,
              image_url
            )
          ),
          payment_methods (
            name
          )
        `)
        .eq('id', orderId!)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="mb-2">Order not found</CardTitle>
              <CardDescription>
                The order you're looking for doesn't exist or you don't have permission to view it.
              </CardDescription>
              <Button asChild className="mt-4">
                <Link to="/orders">View My Orders</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <CardTitle className="text-2xl mb-2">Order Confirmed!</CardTitle>
              <CardDescription>
                Your order has been placed successfully. We'll start preparing it right away.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Order #{order.id.slice(-8)}</CardTitle>
                  <CardDescription>
                    Placed on {formatDate(order.created_at)}
                  </CardDescription>
                </div>
                <Badge variant="default">
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-4">Items Ordered</h3>
                <div className="space-y-3">
                  {order.order_items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        {item.menu_items.image_url && (
                          <div className="w-12 h-12 bg-muted rounded-md overflow-hidden">
                            <img
                              src={item.menu_items.image_url}
                              alt={item.menu_items.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{item.menu_items.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${item.unit_price.toFixed(2)} × {item.qty}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">${item.line_total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Order Summary */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${order.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                  {order.payment_methods && (
                    <div className="flex justify-between text-sm text-muted-foreground pt-2">
                      <span>Payment Method</span>
                      <span>{order.payment_methods.name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild className="flex-1">
                  <Link to="/orders">View All Orders</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/menu">Order Again</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;