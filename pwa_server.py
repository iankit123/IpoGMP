#!/usr/bin/env python3

from flask import Flask, send_from_directory, send_file
import os

# Create Flask app
app = Flask(__name__, static_folder='public', static_url_path='')

@app.route('/')
def index():
    """Serve the PWA interface"""
    return send_file('public/index.html')

@app.route('/manifest.json')
def manifest():
    """Serve the PWA manifest"""
    return send_file('public/manifest.json')

@app.route('/app.js')
def app_js():
    """Serve the main app JavaScript"""
    return send_file('public/app.js')

@app.route('/icons/<path:filename>')
def icons(filename):
    """Serve PWA icons"""
    return send_from_directory('public/icons', filename)

@app.route('/sw.js')
def service_worker():
    """Serve the service worker"""
    return send_file('public/sw.js')

if __name__ == '__main__':
    print("🚀 Starting IPO GMP Tracker PWA Server...")
    print("📱 PWA Interface: http://localhost:3000")
    print("🔧 PWA Features:")
    print("  ✅ Install as App")
    print("  ✅ Offline Support")
    print("  ✅ Mobile Optimized")
    print("  ✅ Real-time IPO Data")
    print("  ✅ Beautiful UI")
    
    app.run(host='0.0.0.0', port=3000, debug=True)
