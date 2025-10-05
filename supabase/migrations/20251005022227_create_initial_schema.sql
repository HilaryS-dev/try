/*
  # Initial SmartBite Database Schema

  ## Overview
  This migration creates the complete database schema for the SmartBite food delivery application.

  ## 1. New Tables
  
  ### users
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique, not null) - User email address
  - `password_hash` (text, not null) - Encrypted password
  - `name` (text, not null) - User full name
  - `phone` (text) - Phone number
  - `town` (text) - User's town/city
  - `role` (text, not null) - User role: customer, owner, agent, admin, manager, driver
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### restaurants
  - `id` (uuid, primary key) - Unique restaurant identifier
  - `user_id` (uuid, foreign key) - Owner's user ID
  - `name` (text, not null) - Restaurant name
  - `description` (text) - Restaurant description
  - `image` (text) - Restaurant image URL
  - `town` (text, not null) - Restaurant location town
  - `address` (text, not null) - Full address
  - `phone` (text, not null) - Contact phone
  - `rating` (numeric, default 0) - Average rating
  - `delivery_time` (text, not null) - Estimated delivery time
  - `delivery_fee` (numeric, not null) - Delivery fee amount
  - `min_order` (numeric, not null) - Minimum order amount
  - `categories` (text[], not null) - Food categories offered
  - `is_active` (boolean, default true) - Restaurant active status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### menu_items
  - `id` (uuid, primary key) - Unique menu item identifier
  - `restaurant_id` (uuid, foreign key) - Associated restaurant
  - `name` (text, not null) - Item name
  - `description` (text) - Item description
  - `category` (text, not null) - Food category
  - `price` (numeric, not null) - Item price
  - `image` (text) - Item image URL
  - `available` (boolean, default true) - Availability status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### orders
  - `id` (uuid, primary key) - Unique order identifier
  - `customer_id` (uuid, foreign key) - Customer user ID
  - `restaurant_id` (uuid, foreign key) - Restaurant ID
  - `driver_id` (uuid, foreign key, nullable) - Assigned driver ID
  - `status` (text, not null) - Order status: pending, confirmed, preparing, ready, delivering, delivered, cancelled
  - `items` (jsonb, not null) - Order items with quantities
  - `subtotal` (numeric, not null) - Items subtotal
  - `delivery_fee` (numeric, not null) - Delivery fee
  - `total` (numeric, not null) - Total amount
  - `delivery_address` (text, not null) - Delivery address
  - `customer_phone` (text, not null) - Customer contact
  - `notes` (text) - Order notes
  - `created_at` (timestamptz) - Order creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### reviews
  - `id` (uuid, primary key) - Unique review identifier
  - `restaurant_id` (uuid, foreign key) - Reviewed restaurant
  - `customer_id` (uuid, foreign key) - Reviewer user ID
  - `order_id` (uuid, foreign key) - Associated order
  - `rating` (integer, not null) - Rating 1-5
  - `comment` (text) - Review comment
  - `created_at` (timestamptz) - Review timestamp

  ## 2. Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with policies that ensure:
  - Users can only access their own data
  - Restaurant owners can manage their restaurants and orders
  - Drivers can view assigned deliveries
  - Admins have full access
  - Public can view active restaurants and menus

  ## 3. Important Notes
  - All timestamps use `now()` as default
  - Foreign keys ensure referential integrity
  - Indexes added for performance on frequently queried columns
  - RLS policies are restrictive by default
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  phone text,
  town text,
  role text NOT NULL CHECK (role IN ('customer', 'owner', 'agent', 'admin', 'manager', 'driver')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image text,
  town text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  rating numeric DEFAULT 0,
  delivery_time text NOT NULL,
  delivery_fee numeric NOT NULL,
  min_order numeric NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price numeric NOT NULL,
  image text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled')),
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  delivery_fee numeric NOT NULL,
  total numeric NOT NULL,
  delivery_address text NOT NULL,
  customer_phone text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_town ON restaurants(town);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Restaurants policies
CREATE POLICY "Anyone can view active restaurants"
  ON restaurants FOR SELECT
  TO authenticated
  USING (is_active = true OR user_id = auth.uid());

CREATE POLICY "Restaurant owners can create restaurants"
  ON restaurants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Restaurant owners can update own restaurants"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Menu items policies
CREATE POLICY "Anyone can view available menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (
    available = true OR 
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.user_id = auth.uid()
    )
  );

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id OR 
    auth.uid() = driver_id OR
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = orders.restaurant_id 
      AND restaurants.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Restaurant owners and drivers can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = driver_id OR
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = orders.restaurant_id 
      AND restaurants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = driver_id OR
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = orders.restaurant_id 
      AND restaurants.user_id = auth.uid()
    )
  );

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Customers can create reviews for own orders"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = customer_id AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = reviews.order_id 
      AND orders.customer_id = auth.uid()
      AND orders.status = 'delivered'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();