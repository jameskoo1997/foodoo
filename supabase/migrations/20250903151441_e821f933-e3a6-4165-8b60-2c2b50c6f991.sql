-- Fix infinite recursion in RLS policies by using auth.jwt() instead of querying users table

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all user data" ON public.users;
DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can manage recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discounts;

-- Create new admin policies using auth.jwt() to avoid recursion
-- These policies check the is_admin claim in the JWT token instead of querying the users table

CREATE POLICY "Admins can view all user data" 
ON public.users 
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  (auth.jwt() ->> 'is_admin')::boolean = true
);

CREATE POLICY "Admins can manage menu items" 
ON public.menu_items 
FOR ALL 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can manage recommendations" 
ON public.recommendations 
FOR ALL 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can view all order items" 
ON public.order_items 
FOR SELECT 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can manage discounts" 
ON public.discounts 
FOR ALL 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

-- Add a database function to refresh JWT claims when user admin status changes
CREATE OR REPLACE FUNCTION public.refresh_auth_user_claims()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to trigger JWT refresh when admin status changes
  -- The actual JWT refresh needs to happen on the client side
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to notify when admin status changes (for future JWT refresh)
CREATE TRIGGER refresh_jwt_on_admin_change
  AFTER UPDATE OF is_admin ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_auth_user_claims();