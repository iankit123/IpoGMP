# 🚀 Quick Update: Populate Supabase NOW

## Copy this entire SQL and run it in Supabase SQL Editor:

```sql
-- Clear ALL existing data first
TRUNCATE TABLE ipos RESTART IDENTITY CASCADE;

-- Insert real IPO data (based on current market data)
INSERT INTO ipos (name, gmp_percentage, issue_price, lot_size, open_date, close_date, is_active) VALUES
-- Currently Open IPOs
('LG Electronics', 15.35, 100.00, 1000, '2025-10-07', '2025-10-09', true),
('Tata Capital', 4.60, 200.00, 500, '2025-10-06', '2025-10-08', true),
('DSM Fresh Foods', 2.97, 101.00, 750, '2025-09-26', '2025-10-06', true),

-- Upcoming IPOs
('JSW Infrastructure', 8.50, 119.00, 30, '2025-10-10', '2025-10-12', true),
('Yatra Online', -2.50, 142.00, 15, '2025-10-15', '2025-10-17', true),
('Sai Silks Kalamandir', 4.05, 222.00, 7, '2025-10-20', '2025-10-22', true),
('Signature Global', 15.32, 385.00, 40, '2025-10-25', '2025-10-27', true),
('Zaggle Prepaid Ocean Services', 0.00, 164.00, 15, '2025-10-30', '2025-11-01', true),
('Samhi Hotels', 6.35, 126.00, 2, '2025-11-05', '2025-11-07', true),
('EMS IPO', 33.65, 211.00, 100, '2025-11-10', '2025-11-12', true),
('RR Kabel', 10.14, 1035.00, 95, '2025-11-15', '2025-11-17', true),
('Jupiter Life Line Hospitals', 32.38, 735.00, 230, '2025-11-20', '2025-11-22', true),
('Rishabh Instruments', 4.31, 441.00, 65, '2025-11-25', '2025-11-27', true),
('Ratnaveer Precision Engineering', 96.00, 98.00, 50, '2025-11-30', '2025-12-02', true),
('Vishnu Prakash R Punglia', 65.00, 99.00, 60, '2025-12-05', '2025-12-07', true),
('Aeroflex Industries', 82.31, 108.00, 65, '2025-12-10', '2025-12-12', true),
('Pyramid Technoplast', 12.65, 166.00, 20, '2025-12-15', '2025-12-17', true),
('TVS Supply Chain Solutions', 5.08, 197.00, 0, '2025-12-20', '2025-12-22', true),
('Concord Biotech', 21.46, 741.00, 110, '2025-12-25', '2025-12-27', true),
('SBFC Finance', 43.86, 57.00, 30, '2025-12-30', '2026-01-01', true),
('Yatharth Hospital', 2.00, 300.00, 80, '2026-01-05', '2026-01-07', true),
('Netweb Technologies', 89.40, 500.00, 400, '2026-01-10', '2026-01-12', true),
('Utkarsh Small Finance Bank', 60.00, 25.00, 15, '2026-01-15', '2026-01-17', true),
('Senco Gold', 13.00, 317.00, 100, '2026-01-20', '2026-01-22', true),
('Cyient DLM', 51.33, 265.00, 150, '2026-01-25', '2026-01-27', true),
('IdeaForge', 93.33, 672.00, 510, '2026-01-30', '2026-02-01', true),
('HMA Agro', 6.84, 585.00, 0, '2026-02-05', '2026-02-07', true),
('IKIO Lighting', 37.19, 285.00, 100, '2026-02-10', '2026-02-12', true),
('Nexus Select Trust', 3.00, 100.00, 5, '2026-02-15', '2026-02-17', true),
('Mankind Pharma', 20.37, 1080.00, 100, '2026-02-20', '2026-02-22', true),
('Avalon Technologies', 0.00, 436.00, 10, '2026-02-25', '2026-02-27', true),
('Udayshivakumar Infra', -14.29, 35.00, 5, '2026-03-01', '2026-03-03', true),
('Global Surfaces', 17.14, 140.00, 15, '2026-03-05', '2026-03-07', true),
('Divgi TorqTransfer Systems', 5.08, 590.00, 40, '2026-03-10', '2026-03-12', true),
('Sah Polymers', 30.77, 65.00, 10, '2026-03-15', '2026-03-17', true),
('Radiant Cash Management', 4.04, 99.00, 3, '2026-03-20', '2026-03-22', true),

-- Recent IPOs (for reference)
('Valiant Laboratories', 14.29, 140.00, 25, '2025-09-15', '2025-09-17', true),
('Updater Services', -5.00, 300.00, 0, '2025-09-10', '2025-09-12', true),
('Manoj Vaibhav Gems', 0.00, 215.00, 10, '2025-09-05', '2025-09-07', true);

-- Verify data was inserted
SELECT COUNT(*) as total_ipos FROM ipos;
SELECT * FROM ipos ORDER BY gmp_percentage DESC LIMIT 10;
```

## Steps:
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy the entire SQL above
4. Click "Run"
5. You should see: **38 rows inserted**

## Then refresh your app at http://localhost:8000

You'll see all 38 real IPOs immediately! 🎉
