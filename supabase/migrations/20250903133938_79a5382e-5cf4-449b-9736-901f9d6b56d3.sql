-- Fix function security by setting search_path
CREATE OR REPLACE FUNCTION update_user_item_stats()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  order_user_id UUID;
BEGIN
  -- Get the user_id from the order
  SELECT user_id INTO order_user_id 
  FROM orders 
  WHERE id = NEW.order_id;
  
  -- Update or insert user_item_stats
  INSERT INTO user_item_stats (user_id, item_id, purchases, last_purchased_at, updated_at)
  VALUES (
    order_user_id,
    NEW.item_id,
    NEW.qty,
    now(),
    now()
  )
  ON CONFLICT (user_id, item_id)
  DO UPDATE SET
    purchases = user_item_stats.purchases + NEW.qty,
    last_purchased_at = now(),
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;