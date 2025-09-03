-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.refresh_auth_user_claims()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to trigger JWT refresh when admin status changes
  -- The actual JWT refresh needs to happen on the client side
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;