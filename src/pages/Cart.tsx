import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { ShoppingCart, Minus, Plus, Trash2, Sparkles, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Header from '@/components/Header';

interface PaymentMethod {
  id: string;
  name: string;
}

const UnifiedRecommendations = () => {
  const { items, addItem } = useCart();
  const { user } = useAuth();
  const cartItemIds = items.map(item => item.id);
  
  // Single AI suggestions call per cart state
  const { aiSuggestions, loading: aiLoading } = useAISuggestions(cartItemIds);
  
  const [mbaRecommendations, setMbaRecommendations] = useState<any[]>([]);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cartItemIds.length === 0) {
      setMbaRecommendations([]);
      setPersonalizedRecommendations([]);
      return;
    }

    // Fetch both types of recommendations in parallel - only once per cart change
    fetchAllRecommendations();
  }, [cartItemIds]);

  const fetchAllRecommendations = async () => {
    setLoading(true);
    console.log('Fetching recommendations for cart items:', cartItemIds);
    try {
      // Fetch MBA recommendations (cart-based)
      const mbaPromise = supabase
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
        .order('confidence', { ascending: false })
        .limit(5);

      // Fetch personalized recommendations (user-based)  
      const personalizedPromise = user ? supabase
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
        .limit(5) : Promise.resolve({ data: [], error: null });

      const [mbaResult, personalizedResult] = await Promise.all([mbaPromise, personalizedPromise]);

      console.log('MBA recommendations result:', mbaResult);
      console.log('Personalized recommendations result:', personalizedResult);

      if (mbaResult.error) throw mbaResult.error;
      if (personalizedResult.error) throw personalizedResult.error;

      // Process MBA recommendations
      const seenIds = new Set(cartItemIds);
      const mbaRecs = new Map();
      
      mbaResult.data?.forEach(rec => {
        const itemId = rec.menu_items.id;
        if (!seenIds.has(itemId) && !mbaRecs.has(itemId)) {
          mbaRecs.set(itemId, {
            id: itemId,
            name: rec.menu_items.name,
            price: rec.menu_items.price,
            image_url: rec.menu_items.image_url,
            source: 'mba' as const,
          });
          seenIds.add(itemId);
        }
      });

      // Process personalized recommendations  
      const personalizedRecs = new Map();
      personalizedResult.data?.forEach(rec => {
        const itemId = rec.menu_items.id;
        if (!seenIds.has(itemId) && !personalizedRecs.has(itemId)) {
          personalizedRecs.set(itemId, {
            id: itemId,
            name: rec.menu_items.name,
            price: rec.menu_items.price,
            image_url: rec.menu_items.image_url,
            source: 'personalized' as const,
          });
          seenIds.add(itemId);
        }
      });

      setMbaRecommendations(Array.from(mbaRecs.values()));
      setPersonalizedRecommendations(Array.from(personalizedRecs.values()));
      
      console.log('Final MBA recommendations:', Array.from(mbaRecs.values()));
      console.log('Final personalized recommendations:', Array.from(personalizedRecs.values()));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setMbaRecommendations([]);
      setPersonalizedRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // Combine all recommendations with AI taking priority
  const allRecommendations = [
    ...aiSuggestions.map(ai => ({ ...ai, section: 'ai' })),
    ...mbaRecommendations.map(mba => ({ ...mba, section: 'cart' })),
    ...personalizedRecommendations.map(p => ({ ...p, section: 'personalized' }))
  ];

  // Remove duplicates and limit to 6 total
  const seenIds = new Set();
  const uniqueRecommendations = allRecommendations.filter(rec => {
    if (seenIds.has(rec.id)) return false;
    seenIds.add(rec.id);
    return true;
  }).slice(0, 6);

  const isLoading = aiLoading || loading;
  const hasAI = aiSuggestions.length > 0;
  const hasRecommendations = uniqueRecommendations.length > 0;

  console.log('UnifiedRecommendations state:', {
    isLoading,
    hasAI,
    hasRecommendations,
    aiSuggestions: aiSuggestions.length,
    mbaRecommendations: mbaRecommendations.length,
    personalizedRecommendations: personalizedRecommendations.length,
    uniqueRecommendations: uniqueRecommendations.length
  });

  // Show recommendations if we have any, or if we're not loading and cart is not empty
  if (isLoading || (cartItemIds.length > 0 && !hasRecommendations && !isLoading)) {
    return cartItemIds.length > 0 ? (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            {isLoading ? 'Loading recommendations...' : 'No recommendations available at the moment.'}
          </p>
        </CardContent>
      </Card>
    ) : null;
  }

  if (!hasRecommendations) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {hasAI ? 'AI-Powered Recommendations' : 'Recommended for You'}
          {hasAI && <Sparkles className="w-4 h-4 text-primary" />}
        </CardTitle>
        <CardDescription>
          {hasAI 
            ? 'Smart suggestions powered by AI based on your cart and preferences' 
            : 'Popular items and personalized suggestions based on your preferences'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uniqueRecommendations.map(rec => (
            <div key={rec.id} className="p-3 bg-muted/50 rounded-lg">
              {rec.image_url && (
                <div className="w-full h-24 bg-background rounded-md overflow-hidden mb-3">
                  <img
                    src={rec.image_url}
                    alt={rec.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm line-clamp-2 flex-1">{rec.name}</p>
                  {rec.source === 'ai' && rec.rationale && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-48">{rec.rationale}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">${rec.price.toFixed(2)}</p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => addItem({
                    id: rec.id,
                    name: rec.name,
                    price: rec.price,
                    image_url: rec.image_url,
                  })}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const Cart = () => {
  const { items, updateQuantity, removeItem, clearCart, subtotal, total, discountAmount, applyDiscount, discountCode } = useCart();
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPaymentMethods();
  }, [user, navigate]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handleApplyDiscount = async () => {
    const trimmedCode = discountInput.trim();
    if (!trimmedCode) return;

    // Client-side validation feedback
    if (trimmedCode.length < 3) {
      toast({
        title: 'Invalid Code',
        description: 'Discount code must be at least 3 characters long',
        variant: 'destructive',
      });
      return;
    }

    const result = await applyDiscount(trimmedCode);
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Discount code applied successfully!',
      });
      setDiscountInput('');
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Your cart is empty',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: 'Error',
        description: 'Please select a payment method',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user!.id,
          subtotal,
          discount_amount: discountAmount,
          total,
          payment_method_id: selectedPaymentMethod,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        item_id: item.id,
        qty: item.quantity,
        unit_price: item.price,
        line_total: item.price * item.quantity,
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (orderItemsError) throw orderItemsError;

      // Clear cart after successful order
      clearCart();
      
      toast({
        title: 'Order placed successfully! 🎉',
        description: `Order #${order.id.slice(0, 8)} has been confirmed. You'll receive updates on your order status.`,
      });

      navigate(`/order-confirmation/${order.id}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Shopping Cart</h1>
        
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="mb-2">Your cart is empty</CardTitle>
              <CardDescription className="mb-6">
                Looks like you haven't added anything to your cart yet. 
                Browse our delicious menu to get started!
              </CardDescription>
              <Button asChild>
                <a href="/menu">Browse Menu</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                      {item.image_url && (
                        <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-muted-foreground">${item.price.toFixed(2)} each</p>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= 99}
                          title={item.quantity >= 99 ? "Maximum quantity reached" : "Increase quantity"}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="text-center sm:text-right">
                        <p className="font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Unified Recommendations - Single API call, no jumping */}
              <UnifiedRecommendations />
            </div>
            
            {/* Order Summary */}
            <div className="space-y-6">
              {/* Discount Code */}
              <Card>
                <CardHeader>
                  <CardTitle>Discount Code</CardTitle>
                </CardHeader>
                <CardContent>
                  {discountCode ? (
                    <div className="text-sm">
                      <p className="text-green-600 font-medium mb-2">
                        Discount applied: {discountCode}
                      </p>
                      <p className="text-muted-foreground">
                        Savings: ${discountAmount.toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter discount code"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                      />
                      <Button onClick={handleApplyDiscount} variant="outline">
                        Apply
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="payment-method">Select payment method</Label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              
              {/* Order Total */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <hr />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="w-full mt-4"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};