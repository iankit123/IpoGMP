from flask import Blueprint, render_template, request, jsonify, redirect, url_for, make_response, send_file, send_from_directory
from extensions import db
from models import IPO, PushSubscription
from scraper import scrape_and_update
from notifications import notification_manager
from scheduler import trigger_scrape, trigger_notifications
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Serve the static PWA interface from public directory"""
    try:
        return send_file('public/index.html')
    except Exception as e:
        logger.error(f"Error serving static index: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Fallback to a simple error page
        return "<h1>Error loading page</h1><p>Please check server logs.</p>", 500

@main_bp.route('/api/ipos')
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

@main_bp.route('/api/subscribe', methods=['POST'])
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

@main_bp.route('/api/unsubscribe', methods=['POST'])
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

@main_bp.route('/api/last-updated')
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

@main_bp.route('/api/vapid-public-key')
def vapid_public_key():
    """Get VAPID public key for push notifications"""
    public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    if not public_key:
        return jsonify({'error': 'VAPID public key not configured'}), 500
    return jsonify({'publicKey': public_key})

@main_bp.route('/admin/scrape', methods=['POST'])
def manual_scrape():
    """Manually trigger scraping (admin function)"""
    try:
        trigger_scrape()
        return jsonify({'success': True, 'message': 'Scraping triggered successfully'})
    except Exception as e:
        logger.error(f"Error triggering scrape: {e}")
        return jsonify({'error': 'Failed to trigger scraping'}), 500

@main_bp.route('/admin/test-notification', methods=['POST'])
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

@main_bp.route('/api/refresh-investorgain', methods=['POST'])
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

@main_bp.route('/api/force-refresh-investorgain', methods=['POST'])
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

@main_bp.route('/manifest.json')
def manifest():
    """Serve PWA manifest from public directory"""
    return send_file('public/manifest.json')

@main_bp.route('/sw.js')
def service_worker():
    """Serve service worker from public directory"""
    response = send_file('public/sw.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    return response

@main_bp.route('/app.js')
def app_js():
    """Serve the main app JavaScript from public directory"""
    return send_file('public/app.js')

@main_bp.route('/icons/<path:filename>')
def icons(filename):
    """Serve PWA icons from public directory"""
    return send_from_directory('public/icons', filename)

@main_bp.app_errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    try:
        return send_file('public/index.html'), 404
    except:
        return "<h1>Page not found</h1>", 404

@main_bp.app_errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    try:
        db.session.rollback()
    except:
        pass
    try:
        return send_file('public/index.html'), 500
    except:
        return "<h1>Internal server error</h1>", 500
