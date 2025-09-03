-- Insert sample recommendations data
-- First, get some menu item IDs and create cross-sell recommendations

-- Pizza and sides
INSERT INTO recommendations (item_id, recommended_item_id, confidence, lift, support)
SELECT 
  pizza.id as item_id,
  salad.id as recommended_item_id,
  0.65 as confidence,
  1.8 as lift,
  0.12 as support
FROM 
  (SELECT id FROM menu_items WHERE name = 'Margherita Pizza' LIMIT 1) pizza,
  (SELECT id FROM menu_items WHERE name = 'Chicken Caesar Salad' LIMIT 1) salad;

-- Burger and fries equivalent (using another main course)
INSERT INTO recommendations (item_id, recommended_item_id, confidence, lift, support)
SELECT 
  burger.id as item_id,
  salmon.id as recommended_item_id,
  0.58 as confidence,
  1.6 as lift,
  0.15 as support
FROM 
  (SELECT id FROM menu_items WHERE name = 'Beef Burger' LIMIT 1) burger,
  (SELECT id FROM menu_items WHERE name = 'Grilled Salmon' LIMIT 1) salmon;

-- Asian cuisine pairing
INSERT INTO recommendations (item_id, recommended_item_id, confidence, lift, support)
SELECT 
  pad_thai.id as item_id,
  dessert.id as recommended_item_id,
  0.72 as confidence,
  2.1 as lift,
  0.08 as support
FROM 
  (SELECT id FROM menu_items WHERE name = 'Chicken Pad Thai' LIMIT 1) pad_thai,
  (SELECT id FROM menu_items WHERE name = 'Chocolate Lava Cake' LIMIT 1) dessert;

-- Vegetarian combinations
INSERT INTO recommendations (item_id, recommended_item_id, confidence, lift, support)
SELECT 
  veg_bowl.id as item_id,
  tacos.id as recommended_item_id,
  0.45 as confidence,
  1.3 as lift,
  0.18 as support
FROM 
  (SELECT id FROM menu_items WHERE name = 'Vegetarian Bowl' LIMIT 1) veg_bowl,
  (SELECT id FROM menu_items WHERE name = 'Fish Tacos' LIMIT 1) tacos;

-- Main course to dessert
INSERT INTO recommendations (item_id, recommended_item_id, confidence, lift, support)
SELECT 
  ribs.id as item_id,
  dessert.id as recommended_item_id,
  0.68 as confidence,
  1.9 as lift,
  0.11 as support
FROM 
  (SELECT id FROM menu_items WHERE name = 'BBQ Ribs' LIMIT 1) ribs,
  (SELECT id FROM menu_items WHERE name = 'Chocolate Lava Cake' LIMIT 1) dessert;

-- Italian pairing
INSERT INTO recommendations (item_id, recommended_item_id, confidence, lift, support)
SELECT 
  risotto.id as item_id,
  pizza.id as recommended_item_id,
  0.52 as confidence,
  1.4 as lift,
  0.14 as support
FROM 
  (SELECT id FROM menu_items WHERE name = 'Mushroom Risotto' LIMIT 1) risotto,
  (SELECT id FROM menu_items WHERE name = 'Margherita Pizza' LIMIT 1) pizza;

-- Reverse recommendations for some items
INSERT INTO recommendations (item_id, recommended_item_id, confidence, lift, support)
SELECT 
  salad.id as item_id,
  pizza.id as recommended_item_id,
  0.48 as confidence,
  1.2 as lift,
  0.16 as support
FROM 
  (SELECT id FROM menu_items WHERE name = 'Chicken Caesar Salad' LIMIT 1) salad,
  (SELECT id FROM menu_items WHERE name = 'Margherita Pizza' LIMIT 1) pizza;

-- Add sample payment methods
INSERT INTO payment_methods (name, is_active) VALUES
('Credit Card', true),
('Cash on Delivery', true),
('PayPal', true),
('Apple Pay', false)
ON CONFLICT DO NOTHING;