-- Create trigger function to update user item statistics
CREATE OR REPLACE FUNCTION update_user_item_stats()
RETURNS TRIGGER AS $$
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

-- Create trigger on order_items table
CREATE TRIGGER trigger_update_user_item_stats
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_user_item_stats();

-- Add unique constraint on user_id, item_id if not exists
ALTER TABLE user_item_stats 
ADD CONSTRAINT IF NOT EXISTS user_item_stats_user_item_unique 
UNIQUE (user_id, item_id);