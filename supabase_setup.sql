-- Supabase Database Setup for IPO Tracker
-- Run this in your Supabase SQL Editor

-- Create IPO table
CREATE TABLE IF NOT EXISTS ipos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gmp_percentage DECIMAL(5,2),
    issue_price DECIMAL(10,2),
    lot_size INTEGER,
    open_date DATE,
    close_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create PushSubscription table for notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ipos_active ON ipos(is_active);
CREATE INDEX IF NOT EXISTS idx_ipos_open_date ON ipos(open_date);
CREATE INDEX IF NOT EXISTS idx_ipos_close_date ON ipos(close_date);
CREATE INDEX IF NOT EXISTS idx_ipos_gmp ON ipos(gmp_percentage);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_ipos_updated_at BEFORE UPDATE ON ipos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to IPOs
CREATE POLICY "Allow public read access to IPOs" ON ipos
    FOR SELECT USING (true);

-- Create policies for public insert/update access to push subscriptions
CREATE POLICY "Allow public insert to push_subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to push_subscriptions" ON push_subscriptions
    FOR UPDATE USING (true);

-- Insert some sample data (optional)
INSERT INTO ipos (name, gmp_percentage, issue_price, lot_size, open_date, close_date, is_active) VALUES
('Sample IPO 1', 15.35, 100.00, 1000, '2025-10-07', '2025-10-09', true),
('Sample IPO 2', 4.60, 200.00, 500, '2025-10-06', '2025-10-08', true),
('Sample IPO 3', 2.97, 150.00, 750, '2025-10-26', '2025-10-06', true)
ON CONFLICT DO NOTHING;
