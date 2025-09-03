-- Add is_admin column to users table
ALTER TABLE public.users 
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Create an index for performance
CREATE INDEX idx_users_is_admin ON public.users(is_admin) WHERE is_admin = true;

-- Update RLS policies to allow admins to view other users' data for analytics
CREATE POLICY "Admins can view all user data" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.is_admin = true
  )
);

-- Allow admins to view all orders for analytics
CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.is_admin = true
  )
);

-- Allow admins to view all order items for analytics  
CREATE POLICY "Admins can view all order items" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.is_admin = true
  )
);

-- Allow admins to manage menu items
CREATE POLICY "Admins can manage menu items" 
ON public.menu_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.is_admin = true
  )
);

-- Allow admins to manage recommendations
CREATE POLICY "Admins can manage recommendations" 
ON public.recommendations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.is_admin = true
  )
);

-- Allow admins to manage discounts
CREATE POLICY "Admins can manage discounts" 
ON public.discounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user 
    WHERE admin_user.id = auth.uid() 
    AND admin_user.is_admin = true
  )
);