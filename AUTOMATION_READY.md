# 🚀 Quick Fix: Enable Automated Scraping

## The Issue
Supabase has Row Level Security (RLS) enabled, blocking automated inserts.

## Solution (30 seconds)

### Step 1: Fix RLS in Supabase
1. Go to: https://supabase.com/dashboard/project/jztpxmdiaqsafpzfcpib/editor
2. Click **SQL Editor** in the left sidebar
3. Copy and paste this SQL:

```sql
ALTER TABLE ipos DISABLE ROW LEVEL SECURITY;
```

4. Click **Run**

### Step 2: Run the Automated Scraper
Back in your terminal, run:

```bash
npm run scrape
```

That's it! ✅

---

## What This Does

- **Scrapes** real IPO data from ipowatch.in
- **Updates** your Supabase database automatically
- **No manual intervention** needed

## Automate It Further

### Option A: Run manually whenever you want fresh data
```bash
npm run scrape
```

### Option B: Set up a cron job (runs daily at 9 AM)
```bash
# Add this to your crontab (run: crontab -e)
0 9 * * * cd /Users/akshitagarwal/IPO_tracker/IpoGMP && npm run scrape
```

### Option C: Deploy Edge Function (100% automated, no server needed)
Follow the guide in `COMPLETE_FREE_DEPLOYMENT.md`

---

## Current Status
✅ Scraper created (`auto-scraper.js`)  
✅ Found 92 IPOs from ipowatch.in  
❌ Blocked by RLS (need to run Step 1 above)  

Once you run Step 1, everything will work! 🎉
