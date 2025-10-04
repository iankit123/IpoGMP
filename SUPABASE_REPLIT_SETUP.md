# Environment Configuration for Supabase + Replit

## Set these environment variables in your Replit Secrets:

### Supabase PostgreSQL Connection
DATABASE_URL=postgresql://postgres.jztpxmdiaqsafpzfcpib:YOUR_PASSWORD@aws-0-us-east-2.pooler.supabase.com:6543/postgres

### VAPID Keys (for push notifications)
VAPID_PUBLIC_KEY=BFSnYJBRQXmaixtx3d8BJpQXZt-r92pfgwHn8_wsfnBIolm4RkArz0R5BaUkmDpmkja34KIdO0qzxEI_ChfvrL0
VAPID_PRIVATE_KEY=SgXR0Y4JZwCPoZgvFDg0uFKHQn81bj1mfMnOLKKLqiE
VAPID_SUBJECT=mailto:ankit_7agarwal@yahoo.in

## How to get your Supabase DATABASE_URL:

1. Go to your Supabase project: https://supabase.com/dashboard/project/jztpxmdiaqsafpzfcpib
2. Click "Settings" → "Database"
3. Scroll down to "Connection string" → "URI"
4. Copy the connection string (it will look like the above)
5. Replace `[YOUR-PASSWORD]` with your actual database password

## Steps to Deploy:

1. **Set Environment Variables in Replit**:
   - Go to your Replit project
   - Click "Secrets" (lock icon) in the left sidebar
   - Add each environment variable above

2. **Your Flask app will automatically**:
   - Connect to Supabase PostgreSQL
   - Scrape IPO data every day at midnight
   - Update Supabase database
   - Serve fresh data to users

3. **Users will see latest data**:
   - Automatically on app open (data is loaded from Supabase)
   - On "Refresh Data" click (triggers scraping)
   - On "Force Refresh" click (forces immediate scrape)

## Architecture:

```
┌─────────────┐
│   Replit    │
│   (Flask)   │  ← Scrapes ipowatch.in
│             │  ← Runs scheduler
│             │  ← Updates Supabase
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Supabase   │
│ (PostgreSQL)│  ← Stores IPO data
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Netlify   │
│  (Frontend) │  ← Serves PWA to users
│             │  ← Reads from Supabase
└─────────────┘
```

## Benefits:

- ✅ **Fully Automated**: No manual intervention needed
- ✅ **Always Fresh**: Data updates automatically
- ✅ **Fast**: Netlify CDN serves static files
- ✅ **Reliable**: Supabase handles database
- ✅ **Scalable**: Can handle many users

## Testing:

1. Set DATABASE_URL in Replit Secrets
2. Restart your Replit app
3. Check logs - should see "Successfully connected to PostgreSQL database"
4. Visit your app - should load data from Supabase
5. Click "Refresh Data" - should trigger scraping
6. Check Supabase Table Editor - should see updated data
