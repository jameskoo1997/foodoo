-- Update RLS policy for menu_items to check users table directly
DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;

CREATE POLICY "Admins can manage menu items" 
ON public.menu_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.is_admin = true
  )
);

-- Also update the discounts table policy
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discounts;

CREATE POLICY "Admins can manage discounts" 
ON public.discounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.is_admin = true
  )
);

-- Also update the recommendations table policy
DROP POLICY IF EXISTS "Admins can manage recommendations" ON public.recommendations;

CREATE POLICY "Admins can manage recommendations" 
ON public.recommendations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.is_admin = true
  )
);