-- Add InvestorGain IPO table to Supabase
-- Run this in your Supabase SQL Editor

-- Create IPO InvestorGain table with additional columns
CREATE TABLE IF NOT EXISTS ipo_investorgain (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gmp_value DECIMAL(10,2),
    gmp_percentage DECIMAL(5,2),
    price DECIMAL(10,2),
    ipo_size DECIMAL(15,2),
    lot_size INTEGER,
    subscription_multiple DECIMAL(10,2),
    open_date DATE,
    close_date DATE,
    updated_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source VARCHAR(50) DEFAULT 'investorgain',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ipo_investorgain_active ON ipo_investorgain(is_active);
CREATE INDEX IF NOT EXISTS idx_ipo_investorgain_open_date ON ipo_investorgain(open_date);
CREATE INDEX IF NOT EXISTS idx_ipo_investorgain_close_date ON ipo_investorgain(close_date);
CREATE INDEX IF NOT EXISTS idx_ipo_investorgain_gmp ON ipo_investorgain(gmp_percentage);
CREATE INDEX IF NOT EXISTS idx_ipo_investorgain_data_source ON ipo_investorgain(data_source);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ipo_investorgain_updated_at BEFORE UPDATE ON ipo_investorgain
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE ipo_investorgain ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to ipo_investorgain" ON ipo_investorgain
    FOR SELECT USING (true);

-- Create policy for public insert/update access (for scraper)
CREATE POLICY "Allow public insert to ipo_investorgain" ON ipo_investorgain
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to ipo_investorgain" ON ipo_investorgain
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to ipo_investorgain" ON ipo_investorgain
    FOR DELETE USING (true);

-- Add some sample data for testing
INSERT INTO ipo_investorgain (
    name, gmp_value, gmp_percentage, price, ipo_size, lot_size, 
    subscription_multiple, open_date, close_date, data_source, is_active
) VALUES
('Sample IPO InvestorGain 1', 60.00, 12.37, 485.00, 4.99, 30, 0.04, '2025-10-06', '2025-10-08', 'investorgain', true),
('Sample IPO InvestorGain 2', 228.00, 20.00, 1140.00, 1377.50, 13, 0.15, '2025-10-07', '2025-10-09', 'investorgain', true),
('Sample IPO InvestorGain 3', 9.00, 2.76, 326.00, 52.91, 46, 0.08, '2025-10-08', '2025-10-10', 'investorgain', true)
ON CONFLICT DO NOTHING;
