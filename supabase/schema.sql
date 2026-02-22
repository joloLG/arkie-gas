-- Arkie Gasul Database Schema
-- Supports: Products, Price History, Sales, Inventory, Analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price History table - tracks all price changes
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price DECIMAL(10, 2) NOT NULL,
    new_price DECIMAL(10, 2) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES users(id)
);

-- Sales table - records each sale with the price at time of sale
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL, -- Price at time of sale (snapshot)
    total_amount DECIMAL(10, 2) NOT NULL, -- unit_price * quantity
    sold_by UUID REFERENCES users(id),
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Inventory movements table - tracks stock changes
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_sales_sold_by ON sales(sold_by);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory_movements(created_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to record price history when product price changes
CREATE OR REPLACE FUNCTION record_price_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.current_price != NEW.current_price THEN
        INSERT INTO price_history (product_id, old_price, new_price, changed_at)
        VALUES (NEW.id, OLD.current_price, NEW.current_price, NOW());
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER record_price_change AFTER UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION record_price_history();

-- Function to update product stock when sale is made
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product stock
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Record inventory movement
    INSERT INTO inventory_movements 
        (product_id, movement_type, quantity, previous_stock, new_stock, reason, created_at)
    SELECT 
        NEW.product_id, 
        'out', 
        NEW.quantity, 
        stock_quantity + NEW.quantity,
        stock_quantity,
        'Sale recorded',
        NOW()
    FROM products WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_on_sale AFTER INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();

-- Views for analytics

-- Daily sales summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
    DATE(sold_at) as sale_date,
    product_id,
    p.name as product_name,
    SUM(quantity) as total_quantity,
    SUM(total_amount) as total_sales,
    COUNT(*) as transaction_count
FROM sales s
JOIN products p ON s.product_id = p.id
GROUP BY DATE(sold_at), product_id, p.name
ORDER BY sale_date DESC, total_sales DESC;

-- Monthly sales summary
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT 
    DATE_TRUNC('month', sold_at) as sale_month,
    product_id,
    p.name as product_name,
    SUM(quantity) as total_quantity,
    SUM(total_amount) as total_sales,
    COUNT(*) as transaction_count
FROM sales s
JOIN products p ON s.product_id = p.id
GROUP BY DATE_TRUNC('month', sold_at), product_id, p.name
ORDER BY sale_month DESC, total_sales DESC;

-- Yearly sales summary
CREATE OR REPLACE VIEW yearly_sales_summary AS
SELECT 
    DATE_TRUNC('year', sold_at) as sale_year,
    product_id,
    p.name as product_name,
    SUM(quantity) as total_quantity,
    SUM(total_amount) as total_sales,
    COUNT(*) as transaction_count
FROM sales s
JOIN products p ON s.product_id = p.id
GROUP BY DATE_TRUNC('year', sold_at), product_id, p.name
ORDER BY sale_year DESC, total_sales DESC;

-- Most bought products (all time)
CREATE OR REPLACE VIEW most_bought_products AS
SELECT 
    product_id,
    p.name as product_name,
    p.image_url,
    SUM(quantity) as total_quantity_sold,
    SUM(total_amount) as total_revenue,
    COUNT(*) as transaction_count,
    MAX(sold_at) as last_sale_date
FROM sales s
JOIN products p ON s.product_id = p.id
GROUP BY product_id, p.name, p.image_url
ORDER BY total_quantity_sold DESC;

-- Price history view with product details
CREATE OR REPLACE VIEW price_history_detailed AS
SELECT 
    ph.id,
    ph.product_id,
    p.name as product_name,
    ph.old_price,
    ph.new_price,
    ph.changed_at,
    ph.new_price - ph.old_price as price_difference,
    ROUND(((ph.new_price - ph.old_price) / ph.old_price) * 100, 2) as percentage_change
FROM price_history ph
JOIN products p ON ph.product_id = p.id
ORDER BY ph.changed_at DESC;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Users policies - users can read their own data, admin can read all
CREATE POLICY "Users can view own record" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Admin can view all users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Products policies - authenticated users can CRUD products (admin panel)
CREATE POLICY "Authenticated users can view products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products" ON products FOR DELETE TO authenticated USING (true);

-- Price history policies
CREATE POLICY "Authenticated users can view price history" ON price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert price history" ON price_history FOR INSERT TO authenticated WITH CHECK (true);

-- Sales policies - authenticated users can manage sales
CREATE POLICY "Authenticated users can view sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sales" ON sales FOR UPDATE TO authenticated USING (true);

-- Inventory movements policies
CREATE POLICY "Authenticated users can view inventory movements" ON inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert inventory movements" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update inventory movements" ON inventory_movements FOR UPDATE TO authenticated USING (true);
