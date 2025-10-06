from flask import render_template, request, jsonify, redirect, url_for, make_response
from app import app, db
from models import IPO, PushSubscription
from scraper import scrape_and_update
from investorgain_scraper_selenium import scrape_investorgain_selenium
from notifications import notification_manager
from scheduler import trigger_scrape, trigger_notifications
import logging
import os

logger = logging.getLogger(__name__)

@app.route('/')
def index():
    """Main dashboard page"""
    try:
        from datetime import datetime
        today = datetime.now().date()
        
        # Get only currently open IPOs (must have open/close dates and close_date >= today), ordered by GMP percentage (descending)
        # Exclude closed IPOs (close_date < today)
        ipos = IPO.query.filter(
            IPO.is_active == True,
            IPO.open_date != None,
            IPO.close_date != None,
            IPO.close_date >= today  # Only show IPOs that haven't closed yet
        ).order_by(IPO.gmp_percentage.desc().nullslast()).all()
        
        logger.info(f"Dashboard: Found {len(ipos)} currently open IPOs")
        for i, ipo in enumerate(ipos[:3]):  # Log first 3 IPOs for debugging
            logger.info(f"IPO {i+1}: {ipo.name} - GMP: {ipo.gmp_percentage}% - Open: {ipo.open_date} - Close: {ipo.close_date}")
        
        # Create response with no-cache headers
        response = make_response(render_template('index.html', ipos=ipos, today=datetime.now()))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        logger.error(f"Error loading dashboard: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return render_template('index.html', ipos=[], error="Error loading IPO data", today=datetime.now())

@app.route('/api/ipos')
def api_ipos():
    """API endpoint to get IPO data as JSON"""
    try:
        from datetime import datetime
        today = datetime.now().date()
        
        # Get only currently open IPOs (must have open/close dates and close_date >= today)
        # Exclude closed IPOs (close_date < today)
        ipos = IPO.query.filter(
            IPO.is_active == True,
            IPO.open_date != None,
            IPO.close_date != None,
            IPO.close_date >= today  # Only show IPOs that haven't closed yet
        ).order_by(IPO.gmp_percentage.desc().nullslast()).all()
        
        logger.info(f"API: Found {len(ipos)} currently open IPOs")
        return jsonify([ipo.to_dict() for ipo in ipos])
    except Exception as e:
        logger.error(f"Error in API endpoint: {e}")
        import traceback
        logger.error(f"API Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to fetch IPO data'}), 500

@app.route('/api/subscribe', methods=['POST'])
def subscribe_notifications():
    """Subscribe to push notifications"""
    try:
        subscription_data = request.get_json()
        
        if not subscription_data or 'endpoint' not in subscription_data:
            return jsonify({'error': 'Invalid subscription data'}), 400
        
        # Check if subscription already exists
        existing = PushSubscription.query.filter_by(
            endpoint=subscription_data['endpoint']
        ).first()
        
        if existing:
            existing.is_active = True
            existing.p256dh = subscription_data['keys']['p256dh']
            existing.auth = subscription_data['keys']['auth']
        else:
            # Create new subscription
            subscription = PushSubscription()
            subscription.endpoint = subscription_data['endpoint']
            subscription.p256dh = subscription_data['keys']['p256dh']
            subscription.auth = subscription_data['keys']['auth']
            db.session.add(subscription)
        
        db.session.commit()
        logger.info(f"Push subscription {'updated' if existing else 'created'}")
        
        return jsonify({'success': True, 'message': 'Subscription saved successfully'})
        
    except Exception as e:
        logger.error(f"Error saving subscription: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to save subscription'}), 500

@app.route('/api/unsubscribe', methods=['POST'])
def unsubscribe_notifications():
    """Unsubscribe from push notifications"""
    try:
        subscription_data = request.get_json()
        
        if not subscription_data or 'endpoint' not in subscription_data:
            return jsonify({'error': 'Invalid subscription data'}), 400
        
        subscription = PushSubscription.query.filter_by(
            endpoint=subscription_data['endpoint']
        ).first()
        
        if subscription:
            subscription.is_active = False
            db.session.commit()
            logger.info("Push subscription deactivated")
        
        return jsonify({'success': True, 'message': 'Unsubscribed successfully'})
        
    except Exception as e:
        logger.error(f"Error unsubscribing: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to unsubscribe'}), 500

@app.route('/api/last-updated')
def last_updated():
    """Get the last updated time for IPO data"""
    try:
        from datetime import datetime
        # Get the most recent IPO update time
        latest_ipo = IPO.query.filter(IPO.is_active == True).order_by(IPO.last_updated.desc()).first()
        
        if latest_ipo and latest_ipo.last_updated:
            last_updated_time = latest_ipo.last_updated.strftime('%H:%M:%S')
        else:
            last_updated_time = "Never"
        
        return jsonify({'last_updated': last_updated_time})
    except Exception as e:
        logger.error(f"Error getting last updated time: {e}")
        return jsonify({'last_updated': 'Unknown'})

@app.route('/api/vapid-public-key')
def vapid_public_key():
    """Get VAPID public key for push notifications"""
    public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    if not public_key:
        return jsonify({'error': 'VAPID public key not configured'}), 500
    return jsonify({'publicKey': public_key})

@app.route('/admin/scrape', methods=['POST'])
def manual_scrape():
    """Manually trigger scraping (admin function)"""
    try:
        trigger_scrape()
        return jsonify({'success': True, 'message': 'Scraping triggered successfully'})
    except Exception as e:
        logger.error(f"Error triggering scrape: {e}")
        return jsonify({'error': 'Failed to trigger scraping'}), 500

@app.route('/api/refresh-investorgain', methods=['POST'])
def refresh_investorgain():
    """Refresh data from InvestorGain website"""
    try:
        logger.info("Starting InvestorGain data refresh...")
        
        # Run the InvestorGain scraper
        result = scrape_investorgain_selenium()
        
        if result > 0:
            return jsonify({
                'success': True, 
                'message': f'InvestorGain data refreshed successfully',
                'source': 'InvestorGain',
                'newCount': result,
                'updatedCount': result
            })
        else:
            return jsonify({
                'success': False, 
                'message': 'No data was scraped from InvestorGain'
            }), 400
            
    except Exception as e:
        logger.error(f"Error refreshing InvestorGain data: {e}")
        return jsonify({'error': f'Failed to refresh InvestorGain data: {str(e)}'}), 500

@app.route('/admin/test-notification', methods=['POST'])
def test_notification():
    """Send test notification (admin function)"""
    try:
        message_data = {
            'title': 'Test Notification',
            'body': 'This is a test notification from IPO Tracker',
            'icon': '/static/icons/icon-192.png'
        }
        
        sent_count = notification_manager.send_bulk_notifications(message_data)
        return jsonify({
            'success': True, 
            'message': f'Test notification sent to {sent_count} subscribers'
        })
    except Exception as e:
        logger.error(f"Error sending test notification: {e}")
        return jsonify({'error': 'Failed to send test notification'}), 500

@app.route('/manifest.json')
def manifest():
    """Serve PWA manifest"""
    return app.send_static_file('manifest.json')

@app.route('/sw.js')
def service_worker():
    """Serve service worker"""
    response = app.send_static_file('sw.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    return response

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return render_template('index.html', error="Page not found"), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    db.session.rollback()
    return render_template('index.html', error="Internal server error"), 500
