-- Insert sample menu items
INSERT INTO menu_items (name, description, category, price, image_url, is_active) VALUES
('Margherita Pizza', 'Classic pizza with fresh mozzarella, tomatoes, and basil', 'Pizza', 12.99, 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400', true),
('Chicken Caesar Salad', 'Grilled chicken breast over crisp romaine with parmesan and croutons', 'Salads', 11.99, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', true),
('Beef Burger', 'Juicy beef patty with lettuce, tomato, cheese, and our special sauce', 'Burgers', 13.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', true),
('Grilled Salmon', 'Fresh Atlantic salmon with lemon herb seasoning and vegetables', 'Main Courses', 18.99, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', true),
('Chicken Pad Thai', 'Traditional Thai noodles with chicken, bean sprouts, and peanuts', 'Asian', 14.99, 'https://images.unsplash.com/photo-1559314809-0f31657da5d6?w=400', true),
('Chocolate Lava Cake', 'Warm chocolate cake with molten center and vanilla ice cream', 'Desserts', 7.99, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400', true),
('Vegetarian Bowl', 'Quinoa bowl with roasted vegetables, avocado, and tahini dressing', 'Vegetarian', 10.99, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', true),
('Fish Tacos', 'Grilled fish with cabbage slaw and chipotle mayo in soft tortillas', 'Mexican', 12.99, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', true),
('BBQ Ribs', 'Tender pork ribs with our house BBQ sauce and coleslaw', 'BBQ', 19.99, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', true),
('Mushroom Risotto', 'Creamy arborio rice with wild mushrooms and parmesan', 'Italian', 15.99, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400', true);

-- Insert sample discounts
INSERT INTO discounts (code, name, type, value, starts_at, ends_at, is_active) VALUES
('WELCOME10', '10% Off First Order', 'percent', 10, '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', true),
('SAVE5', '$5 Off Any Order', 'amount', 5, '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', true),
('STUDENT15', '15% Student Discount', 'percent', 15, '2024-01-01 00:00:00+00', '2024-12-31 23:59:59+00', true);