-- Database Schema for INE Product Price Tracker (Supabase / PostgreSQL)

-- 1. Tracked Products Table
CREATE TABLE IF NOT EXISTS tracked_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  sku TEXT,
  selected_option_id TEXT NOT NULL,
  selected_option_label TEXT NOT NULL,
  scrape_interval_hours INT DEFAULT 2,
  target_price NUMERIC(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_product_option UNIQUE(product_id, selected_option_id)
);

-- 2. Price History Table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  selected_option_label TEXT NOT NULL,
  price NUMERIC(10, 2), -- Nullable if scrape failed
  currency TEXT DEFAULT '₹',
  stock_status TEXT, -- e.g., "In Stock", "12 units available", "Out of Stock"
  stock_count INT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'retried', 'failed'))
);

-- 3. Scrape Logs Table
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  selected_option_label TEXT NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  attempt_number INT DEFAULT 1,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'retried', 'failed')),
  price NUMERIC(10, 2),
  stock TEXT,
  execution_time_ms INT,
  error_message TEXT,
  change_detected BOOLEAN DEFAULT FALSE
);

-- 4. Price & Stock Alerts Table
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  selected_option_label TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_drop', 'back_in_stock', 'structure_change')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_product_date ON price_history(tracked_product_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_date ON scrape_logs(tracked_product_id, scraped_at DESC);
