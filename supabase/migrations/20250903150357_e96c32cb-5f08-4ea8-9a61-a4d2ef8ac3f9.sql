-- Fix security vulnerability: Restrict discount codes access to authenticated users only

-- Drop the current public read policy that allows anyone to see discount codes
DROP POLICY IF EXISTS "Discounts are publicly readable" ON public.discounts;

-- Create a new policy that only allows authenticated users to read discounts
-- This prevents unauthorized users from seeing active discount codes
CREATE POLICY "Authenticated users can read discounts" 
ON public.discounts 
FOR SELECT 
TO authenticated
USING (true);

-- Keep the admin management policy unchanged
-- (No changes needed to "Admins can manage discounts" policy)