# IPO GMP Tracker - Supabase + Netlify

A Progressive Web App (PWA) for tracking IPO Grey Market Premium (GMP) data, built with Supabase backend and Netlify frontend.

## 🚀 Features

- **Real-time IPO Data**: Track GMP, issue prices, and subscription periods
- **Progressive Web App**: Installable on mobile and desktop
- **Push Notifications**: Get alerts for IPO updates
- **Responsive Design**: Works on all devices
- **Fast Performance**: Static site with CDN delivery
- **Offline Support**: Service worker for offline functionality

## 🏗️ Architecture

- **Frontend**: Static HTML/CSS/JS hosted on Netlify
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **PWA**: Service Worker + Manifest for app-like experience
- **Data Source**: Scrapes IPO data from ipowatch.in

## 📋 Setup Instructions

### 1. Supabase Setup

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API key

2. **Run Database Setup**:
   - Go to SQL Editor in your Supabase dashboard
   - Run the SQL script from `supabase_setup.sql`

3. **Deploy Edge Function**:
   - Install Supabase CLI: `npm install -g supabase`
   - Login: `supabase login`
   - Link project: `supabase link --project-ref your-project-ref`
   - Deploy function: `supabase functions deploy scrape-ipos`

### 2. Netlify Deployment

1. **Prepare Files**:
   - Copy all files from `public/` folder
   - Update Supabase credentials in `app.js`

2. **Deploy to Netlify**:
   - Option A: Drag and drop `public/` folder to Netlify
   - Option B: Connect GitHub repository
   - Option C: Use Netlify CLI: `netlify deploy --prod --dir=public`

3. **Configure Environment Variables**:
   - In Netlify dashboard, go to Site Settings > Environment Variables
   - Add: `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### 3. PWA Configuration

1. **Icons**: Ensure `/icons/icon-192.png` and `/icons/icon-512.png` exist
2. **Manifest**: Update `manifest.json` with your app details
3. **Service Worker**: `sw.js` handles offline functionality and push notifications

## 🔧 Configuration

### Supabase Configuration

Update these values in `app.js`:
```javascript
const SUPABASE_URL = 'your-supabase-url'
const SUPABASE_ANON_KEY = 'your-supabase-anon-key'
```

### Netlify Configuration

Update `netlify.toml` with your specific settings:
```toml
[build]
  publish = "public"
  command = "echo 'Static site - no build needed'"
```

## 📱 PWA Features

- **Installable**: Users can install the app on their devices
- **Offline Support**: Works without internet connection
- **Push Notifications**: Real-time alerts for IPO updates
- **App-like Experience**: Full-screen, no browser UI

## 🔄 Data Flow

1. **Supabase Edge Function** scrapes IPO data from ipowatch.in
2. **PostgreSQL Database** stores IPO information
3. **Frontend** fetches data via Supabase client
4. **Service Worker** caches data for offline use
5. **Push Notifications** alert users of updates

## 🛠️ Development

### Local Development

1. **Start Supabase locally**:
   ```bash
   supabase start
   ```

2. **Serve static files**:
   ```bash
   # Using Python
   python -m http.server 8000 --directory public
   
   # Using Node.js
   npx serve public
   ```

3. **Update Supabase URL** to local development URL

### Testing

- **PWA**: Test in Chrome DevTools > Application tab
- **Notifications**: Test push notifications in browser
- **Offline**: Test offline functionality by disabling network

## 📊 Monitoring

- **Supabase Dashboard**: Monitor database and function performance
- **Netlify Analytics**: Track site performance and usage
- **Browser DevTools**: Debug PWA functionality

## 🔒 Security

- **Row Level Security**: Supabase RLS policies protect data
- **CORS**: Proper CORS headers for API access
- **HTTPS**: Netlify provides SSL certificates
- **Content Security Policy**: Configure CSP headers

## 🚀 Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Database tables created
- [ ] Edge function deployed
- [ ] Netlify site deployed
- [ ] Environment variables set
- [ ] PWA manifest configured
- [ ] Service worker registered
- [ ] Push notifications tested
- [ ] Offline functionality verified

## 📞 Support

For issues or questions:
1. Check Supabase logs for backend errors
2. Check Netlify logs for deployment issues
3. Use browser DevTools for frontend debugging
4. Verify PWA functionality in Chrome DevTools

## 🔄 Updates

To update the app:
1. **Frontend**: Push changes to Netlify
2. **Backend**: Update Supabase Edge Function
3. **Database**: Run SQL migrations in Supabase
4. **PWA**: Update service worker version

---

**Built with ❤️ using Supabase + Netlify**
