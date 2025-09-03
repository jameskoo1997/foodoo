-- Create enums for better data consistency
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'fulfilled', 'cancelled');
CREATE TYPE discount_type AS ENUM ('percent', 'amount');

-- Create users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status order_status DEFAULT 'pending',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discounts table
CREATE TABLE public.discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type discount_type NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at),
  CHECK (value > 0)
);

-- Create recommendations table for Market Basket Analysis
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  recommended_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  confidence NUMERIC(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  lift NUMERIC(10,6) CHECK (lift > 0),
  support NUMERIC(5,4) CHECK (support >= 0 AND support <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, recommended_item_id),
  CHECK (item_id != recommended_item_id)
);

-- Create user_item_stats table for personalized recommendations
CREATE TABLE public.user_item_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  purchases INTEGER DEFAULT 0 CHECK (purchases >= 0),
  last_purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Create indexes for performance optimization
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_item_id ON public.order_items(item_id);

CREATE INDEX idx_menu_items_category ON public.menu_items(category);
CREATE INDEX idx_menu_items_is_active ON public.menu_items(is_active);
CREATE INDEX idx_menu_items_price ON public.menu_items(price);

CREATE INDEX idx_discounts_code ON public.discounts(code);
CREATE INDEX idx_discounts_active_dates ON public.discounts(is_active, starts_at, ends_at);

CREATE INDEX idx_recommendations_item_id ON public.recommendations(item_id);
CREATE INDEX idx_recommendations_recommended_item_id ON public.recommendations(recommended_item_id);
CREATE INDEX idx_recommendations_confidence ON public.recommendations(confidence DESC);

CREATE INDEX idx_user_item_stats_user_id ON public.user_item_stats(user_id);
CREATE INDEX idx_user_item_stats_item_id ON public.user_item_stats(item_id);
CREATE INDEX idx_user_item_stats_purchases ON public.user_item_stats(purchases DESC);
CREATE INDEX idx_user_item_stats_last_purchased ON public.user_item_stats(last_purchased_at);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_item_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can only see and update their own data
CREATE POLICY "Users can view their own data" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- Menu items are publicly readable, but only admins can modify
CREATE POLICY "Menu items are publicly readable" ON public.menu_items
FOR SELECT USING (true);

-- Orders are user-specific
CREATE POLICY "Users can view their own orders" ON public.orders
FOR ALL USING (auth.uid() = user_id);

-- Order items follow the same pattern as orders
CREATE POLICY "Users can access their order items" ON public.order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Payment methods are publicly readable
CREATE POLICY "Payment methods are publicly readable" ON public.payment_methods
FOR SELECT USING (true);

-- Discounts are publicly readable (for applying coupons)
CREATE POLICY "Discounts are publicly readable" ON public.discounts
FOR SELECT USING (true);

-- Recommendations are publicly readable (for showing suggestions)
CREATE POLICY "Recommendations are publicly readable" ON public.recommendations
FOR SELECT USING (true);

-- User item stats are user-specific
CREATE POLICY "Users can access their own item stats" ON public.user_item_stats
FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for user_item_stats
CREATE TRIGGER update_user_item_stats_updated_at
  BEFORE UPDATE ON public.user_item_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment methods
INSERT INTO public.payment_methods (name, is_active) VALUES 
  ('Credit Card', true),
  ('Debit Card', true),
  ('Cash', true),
  ('Digital Wallet', true);