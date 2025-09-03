import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp, Receipt, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/EmptyStates';
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

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
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
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">My Orders</h1>
        
        {orders.length === 0 ? (
          <EmptyState 
            type="orders"
            title="No orders yet"
            description="You haven't placed any orders yet. Start by browsing our menu and adding items to your cart."
            actionLabel="Browse Menu"
            actionHref="/menu"
          />
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id}>
                <Collapsible
                  open={expandedOrder === order.id}
                  onOpenChange={(open) => setExpandedOrder(open ? order.id : null)}
                >
                  <CollapsibleTrigger asChild>
                     <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                           <div className="flex-1">
                             <CardTitle className="text-lg">
                               Order #{order.id.slice(-8)}
                             </CardTitle>
                             <CardDescription>
                               {formatDate(order.created_at)}
                             </CardDescription>
                           </div>
                           <Badge className={getStatusColor(order.status)}>
                             {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                           </Badge>
                         </div>
                         
                         <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                           <div className="text-left sm:text-right">
                             <p className="font-semibold">${order.total.toFixed(2)}</p>
                             <p className="text-sm text-muted-foreground">
                               {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                             </p>
                           </div>
                           {expandedOrder === order.id ? (
                             <ChevronUp className="w-5 h-5" />
                           ) : (
                             <ChevronDown className="w-5 h-5" />
                           )}
                         </div>
                       </div>
                     </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Order Items */}
                        <div>
                          <h4 className="font-medium mb-3">Items</h4>
                          <div className="space-y-3">
                             {order.order_items.map(item => (
                               <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-border/50 last:border-b-0">
                                 <div className="flex items-center space-x-3">
                                   {item.menu_items.image_url && (
                                     <div className="w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
                                       <img
                                         src={item.menu_items.image_url}
                                         alt={item.menu_items.name}
                                         className="w-full h-full object-cover"
                                       />
                                     </div>
                                   )}
                                   <div className="flex-1 min-w-0">
                                     <p className="font-medium truncate">{item.menu_items.name}</p>
                                     <p className="text-sm text-muted-foreground">
                                       ${item.unit_price.toFixed(2)} × {item.qty}
                                     </p>
                                   </div>
                                 </div>
                                 <p className="font-medium text-right">${item.line_total.toFixed(2)}</p>
                               </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Order Summary */}
                        <div className="space-y-2 pt-4 border-t">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>${order.subtotal.toFixed(2)}</span>
                          </div>
                          {order.discount_amount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Discount</span>
                              <span>-${order.discount_amount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span>${order.total.toFixed(2)}</span>
                          </div>
                          {order.payment_methods && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Payment Method</span>
                              <span>{order.payment_methods.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;