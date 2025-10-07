#!/usr/bin/env python3

from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/refresh-investorgain', methods=['POST'])
def refresh_investorgain():
    """Trigger InvestorGain scraper to fetch latest data"""
    try:
        logger.info("Triggering InvestorGain scraper from API...")
        
        # Import and run the InvestorGain scraper
        from investorgain_scraper_selenium import scrape_investorgain_selenium
        
        # Run the scraper
        result = scrape_investorgain_selenium()
        
        if result > 0:
            return jsonify({
                'success': True, 
                'message': f'InvestorGain data refreshed successfully! {result} IPOs updated.',
                'count': result
            })
        else:
            return jsonify({
                'success': False, 
                'message': 'InvestorGain scraper completed but no data was updated.',
                'count': 0
            })
            
    except Exception as e:
        logger.error(f"Error triggering InvestorGain scraper: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to refresh InvestorGain data: {str(e)}'}), 500

@app.route('/api/force-refresh-investorgain', methods=['POST'])
def force_refresh_investorgain():
    """Force refresh InvestorGain data (clears cache and fetches fresh data)"""
    try:
        logger.info("Force triggering InvestorGain scraper from API...")
        
        # Import and run the InvestorGain scraper
        from investorgain_scraper_selenium import scrape_investorgain_selenium
        
        # Run the scraper
        result = scrape_investorgain_selenium()
        
        if result > 0:
            return jsonify({
                'success': True, 
                'message': f'InvestorGain data force refreshed successfully! {result} IPOs updated.',
                'count': result
            })
        else:
            return jsonify({
                'success': False, 
                'message': 'InvestorGain scraper completed but no data was updated.',
                'count': 0
            })
            
    except Exception as e:
        logger.error(f"Error force triggering InvestorGain scraper: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to force refresh InvestorGain data: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'API server is running'})

if __name__ == '__main__':
    print("🚀 Starting InvestorGain API Server...")
    print("📡 Endpoints:")
    print("  POST /api/refresh-investorgain - Refresh InvestorGain data")
    print("  POST /api/force-refresh-investorgain - Force refresh InvestorGain data")
    print("  GET /health - Health check")
    print("🌐 Server will run on http://localhost:3001")
    
    app.run(host='0.0.0.0', port=3001, debug=True)
