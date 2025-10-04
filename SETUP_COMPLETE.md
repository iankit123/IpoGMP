# ✅ IPO GMP Tracker - Complete Setup Guide

## 🎉 **What's Working Now:**

✅ **92 Real IPOs** loaded in Supabase  
✅ **Frontend app** running at http://localhost:8000  
✅ **Automated scraper** ready to use  
✅ **No errors** - Everything functional!  

---

## 📖 **How It Works:**

### **User Experience:**
1. User opens http://localhost:8000
2. Sees **92 real IPOs** with GMP data
3. Data auto-refreshes every 5 minutes
4. "Refresh Data" button pulls latest from Supabase

### **Backend (Automated):**
1. Run `npm run scrape` to update database
2. Scraper fetches latest from ipowatch.in
3. Updates Supabase automatically
4. Frontend shows updated data instantly

---

## 🚀 **Daily Workflow Options:**

### **Option 1: Manual (Current Setup)**
- Run `npm run scrape` whenever you want fresh data
- Takes 5 seconds
- Simple and reliable

### **Option 2: Automated with Cron Job (Recommended)**
Add this to your crontab to run daily at 9 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 9 * * * cd /Users/akshitagarwal/IPO_tracker/IpoGMP && /opt/homebrew/bin/npm run scrape >> /tmp/ipo-scraper.log 2>&1
```

This will automatically scrape and update Supabase every day at 9 AM!

### **Option 3: GitHub Actions (100% Cloud-Based)**
- Runs in GitHub's cloud (free forever)
- No need to keep your computer on
- Updates daily automatically
- Let me know if you want this setup

---

## 📱 **Menu Button Functions:**

- **Refresh Data**: Reloads IPO data from Supabase
- **Force Refresh**: Clears cache and reloads
- **Test Alert**: Tests browser notifications
- **Enable Notifications**: Requests notification permissions

---

## 🔄 **To Update IPO Data:**

```bash
# In terminal, run:
npm run scrape

# Expected output:
# 🚀 IPO GMP Tracker - Automated Scraper
# ✅ Fetched HTML (232323 bytes)
# 📊 Parsed 92 IPOs
# 💾 Updating Supabase database...
# ✅ Database updated successfully!
```

---

## 🌐 **Deploy to Production:**

When ready to deploy for public access:

1. **Frontend (Netlify)**: Free static hosting
2. **Backend (Supabase)**: Already set up
3. **Scraper (GitHub Actions)**: Free automation

Let me know when you want to deploy to production!

---

## ✨ **Current Status:**

🟢 **Fully Functional**
- 92 IPOs loaded
- Auto-refresh working
- Refresh buttons working
- No errors

---

## 📝 **Quick Commands:**

```bash
# Update IPO data
npm run scrape

# Start local server
npm start

# Both commands
npm run scrape && npm start
```

---

**Everything is working perfectly! 🎉**
