# 🚀 Complete Free Deployment Guide (No Replit!)

## **Architecture: 100% Free, Fully Automated**

```
┌──────────────────┐
│   ipowatch.in    │  ← Data source
└────────┬─────────┘
         │
         ↓ (scrapes daily)
┌──────────────────┐
│  Supabase Edge   │  ← Runs automatically via Cron
│    Function      │  ← Updates database
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   Supabase DB    │  ← Stores IPO data
│  (PostgreSQL)    │
└────────┬─────────┘
         │
         ↓ (reads data)
┌──────────────────┐
│    Netlify PWA   │  ← Users access here
│  (Static Site)   │  ← Auto-refreshes data
└──────────────────┘
```

## **Step 1: Deploy Supabase Edge Function** (5 minutes)

### Install Supabase CLI:
```bash
npm install -g supabase
```

### Login to Supabase:
```bash
supabase login
```

### Link your project:
```bash
supabase link --project-ref jztpxmdiaqsafpzfcpib
```

### Deploy the scraping function:
```bash
supabase functions deploy scrape-ipos
```

### Set up Cron Job (Auto-run daily):
1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_cron` extension
3. Run this SQL in SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to run scraper daily at midnight
SELECT cron.schedule(
  'scrape-ipos-daily',
  '0 0 * * *', -- Every day at midnight UTC
  $$
  SELECT net.http_post(
    url := 'https://jztpxmdiaqsafpzfcpib.supabase.co/functions/v1/scrape-ipos',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;
```

**Replace `YOUR_ANON_KEY` with your Supabase anon key from Settings → API**

## **Step 2: Deploy Frontend to Netlify** (2 minutes)

### Option A: Drag & Drop (Easiest)
1. Go to [netlify.com](https://netlify.com)
2. Drag the `public/` folder
3. Done!

### Option B: GitHub (Recommended)
1. Push code to GitHub
2. Connect repo to Netlify
3. Set build directory to `public/`
4. Deploy automatically

## **Step 3: Configure Environment Variables**

### In Supabase Dashboard:
1. Go to Settings → API
2. Copy your **Project URL** and **Anon Key**
3. Note down for frontend configuration

### Update frontend `public/app.js`:
- Lines 3-4 should have your Supabase credentials
- These are already set in the file

## **How It Works: Zero Manual Intervention**

### **Automatic Data Updates:**
1. **Daily Cron Job** runs at midnight
2. **Edge Function** scrapes ipowatch.in
3. **Database** gets updated with latest IPOs
4. **Frontend** automatically shows new data

### **User Experience:**
- **Opens app** → Loads latest data from Supabase
- **Clicks "Refresh Data"** → Triggers immediate scrape
- **Returns to app** → Auto-refreshes data
- **Every 5 minutes** → Background refresh

### **No Manual Work Needed:**
- ✅ Scraping runs automatically (daily cron)
- ✅ Database updates automatically
- ✅ Users see fresh data automatically
- ✅ Frontend refreshes automatically

## **Step 4: Test Everything**

### Test the Edge Function:
```bash
curl -X POST https://jztpxmdiaqsafpzfcpib.supabase.co/functions/v1/scrape-ipos \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Expected Response:
```json
{
  "success": true,
  "message": "Scraping completed: X new IPOs, Y updated",
  "newCount": X,
  "updatedCount": Y,
  "totalScraped": Z
}
```

### Check Database:
1. Go to Supabase → Table Editor → ipos
2. Should see freshly scraped data
3. Check `updated_at` timestamps

### Test Frontend:
1. Open your Netlify URL
2. Should see IPO data loading
3. Click "Refresh Data" - should trigger scrape
4. Check browser console for logs

## **Costs: 100% FREE**

- **Supabase**: Free tier (500MB database, 500K Edge Function invocations)
- **Netlify**: Free tier (100GB bandwidth, unlimited sites)
- **Total**: $0/month

## **Monitoring**

### Check Cron Job Status:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scrape-ipos-daily')
ORDER BY start_time DESC 
LIMIT 10;
```

### View Edge Function Logs:
1. Supabase Dashboard → Edge Functions → scrape-ipos
2. Click "Logs" tab
3. See real-time execution logs

### Monitor Database Growth:
```sql
SELECT 
  COUNT(*) as total_ipos,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 day') as updated_today
FROM ipos;
```

## **Troubleshooting**

### If scraper doesn't run:
1. Check cron job is created: `SELECT * FROM cron.job;`
2. Check Edge Function is deployed: Supabase Dashboard → Edge Functions
3. Check logs for errors

### If data doesn't update:
1. Manually trigger Edge Function (see test command above)
2. Check browser console for errors
3. Verify Supabase credentials in frontend

### If frontend doesn't load:
1. Check Network tab in browser DevTools
2. Verify Supabase URL/key in app.js
3. Check CORS settings in Supabase

## **🎉 You're Done!**

Your IPO tracker is now:
- ✅ **Fully automated** - No manual intervention
- ✅ **Always fresh** - Daily auto-updates
- ✅ **100% free** - No hosting costs
- ✅ **Fast & reliable** - Netlify CDN + Supabase
- ✅ **PWA enabled** - Installable on mobile/desktop

**Users get latest data automatically whenever they open the app!**
