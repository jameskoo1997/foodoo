import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
  discountAmount: number;
  applyDiscount: (code: string) => Promise<{ error?: string; success?: boolean }>;
  discountCode: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountCode, setDiscountCode] = useState<string | null>(null);

  // Load cart from localStorage on mount and when user changes
  useEffect(() => {
    const storageKey = user ? `cart-${user.id}` : 'cart-guest';
    const savedCart = localStorage.getItem(storageKey);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart.items || []);
        setDiscountAmount(parsedCart.discountAmount || 0);
        setDiscountCode(parsedCart.discountCode || null);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, [user]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const storageKey = user ? `cart-${user.id}` : 'cart-guest';
    const cartData = {
      items,
      discountAmount,
      discountCode,
    };
    localStorage.setItem(storageKey, JSON.stringify(cartData));
  }, [items, discountAmount, discountCode, user]);

  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === newItem.id);
      if (existingItem) {
        return currentItems.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentItems, { ...newItem, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    setDiscountAmount(0);
    setDiscountCode(null);
  };

  const applyDiscount = async (code: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: discounts, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('code', code)
        .eq('is_active', true);
      
      if (error) throw error;
      
      if (!discounts || discounts.length === 0) {
        return { error: 'Invalid discount code' };
      }
      
      const discount = discounts[0];
      const now = new Date();
      const startsAt = new Date(discount.starts_at);
      const endsAt = new Date(discount.ends_at);
      
      if (now < startsAt || now > endsAt) {
        return { error: 'Discount code has expired or is not yet active' };
      }
      
      const currentSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      let discountValue = 0;
      if (discount.type === 'percent') {
        discountValue = (currentSubtotal * discount.value) / 100;
      } else {
        discountValue = discount.value;
      }
      
      setDiscountAmount(discountValue);
      setDiscountCode(code);
      return { success: true };
    } catch (error) {
      return { error: 'Failed to apply discount code' };
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      subtotal,
      total,
      discountAmount,
      applyDiscount,
      discountCode,
    }}>
      {children}
    </CartContext.Provider>
  );
};