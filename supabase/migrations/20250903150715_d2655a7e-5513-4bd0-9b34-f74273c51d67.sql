-- Priority 1: Fix business intelligence data exposure
-- Secure the recommendations table by restricting access to authenticated users only

-- Drop the current public read policy that exposes business intelligence data
DROP POLICY IF EXISTS "Recommendations are publicly readable" ON public.recommendations;

-- Create a new policy that only allows authenticated users to read recommendations
-- This protects proprietary business data from unauthorized access
CREATE POLICY "Authenticated users can read recommendations" 
ON public.recommendations 
FOR SELECT 
TO authenticated
USING (true);

-- Keep the admin management policy unchanged
-- (No changes needed to "Admins can manage recommendations" policy)