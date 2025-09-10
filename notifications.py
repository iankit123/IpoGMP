import os
import logging
from pywebpush import webpush, WebPushException
from models import PushSubscription, IPO
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class NotificationManager:
    """Class to manage push notifications"""
    
    def __init__(self):
        # VAPID keys for push notifications
        self.vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY")
        self.vapid_public_key = os.environ.get("VAPID_PUBLIC_KEY") 
        self.vapid_claims = {
            "sub": "mailto:admin@ipotracker.com"
        } if self.vapid_private_key else None
    
    def send_notification(self, subscription_info, message_data):
        """Send push notification to a single subscription"""
        try:
            if not self.vapid_private_key or not self.vapid_public_key:
                logger.warning("VAPID keys not configured, skipping notification")
                return False
            
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(message_data),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims
            )
            return True
            
        except WebPushException as e:
            logger.error(f"Push notification failed: {e}")
            # If subscription is invalid, mark it as inactive
            if e.response and e.response.status_code in [410, 413, 404]:
                self._deactivate_subscription(subscription_info['endpoint'])
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending notification: {e}")
            return False
    
    def send_bulk_notifications(self, message_data):
        """Send notifications to all active subscriptions"""
        subscriptions = PushSubscription.query.filter_by(is_active=True).all()
        success_count = 0
        
        for subscription in subscriptions:
            subscription_info = subscription.to_dict()
            if self.send_notification(subscription_info, message_data):
                success_count += 1
        
        logger.info(f"Sent notifications to {success_count}/{len(subscriptions)} subscribers")
        return success_count
    
    def _deactivate_subscription(self, endpoint):
        """Deactivate invalid subscription"""
        try:
            subscription = PushSubscription.query.filter_by(endpoint=endpoint).first()
            if subscription:
                subscription.is_active = False
                from app import db
                db.session.commit()
                logger.info(f"Deactivated invalid subscription: {endpoint}")
        except Exception as e:
            logger.error(f"Error deactivating subscription: {e}")
    
    def check_and_send_alerts(self):
        """Check for IPOs meeting alert criteria and send notifications"""
        try:
            today = datetime.now().date()
            
            # Find IPOs with high GMP (>50%) and closing today or tomorrow
            high_gmp_ipos = IPO.query.filter(
                IPO.gmp_percentage > 50,
                IPO.is_active == True,
                IPO.close_date.between(today, today + timedelta(days=1))
            ).all()
            
            for ipo in high_gmp_ipos:
                days_left = (ipo.close_date.date() - today).days if ipo.close_date else 0
                
                message_data = {
                    'title': 'IPO Alert - High GMP!',
                    'body': f'{ipo.name} has {ipo.gmp_percentage:.1f}% GMP. {"Last day to apply!" if days_left == 0 else f"{days_left} day(s) left to apply."}',
                    'icon': '/static/icons/icon-192.png',
                    'badge': '/static/icons/icon-192.png',
                    'data': {
                        'ipo_id': ipo.id,
                        'ipo_name': ipo.name,
                        'gmp_percentage': ipo.gmp_percentage
                    }
                }
                
                sent_count = self.send_bulk_notifications(message_data)
                logger.info(f"Sent alert for {ipo.name} to {sent_count} subscribers")
            
            return len(high_gmp_ipos)
            
        except Exception as e:
            logger.error(f"Error checking and sending alerts: {e}")
            return 0

# Global notification manager instance
notification_manager = NotificationManager()

def send_ipo_alert(ipo_name, gmp_percentage, days_left):
    """Helper function to send IPO alert"""
    message_data = {
        'title': 'IPO Alert - High GMP!',
        'body': f'{ipo_name} has {gmp_percentage:.1f}% GMP. {"Last day to apply!" if days_left == 0 else f"{days_left} day(s) left to apply."}',
        'icon': '/static/icons/icon-192.png',
        'badge': '/static/icons/icon-192.png'
    }
    
    return notification_manager.send_bulk_notifications(message_data)
