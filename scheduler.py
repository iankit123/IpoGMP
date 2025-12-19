import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import atexit
from scraper import scrape_and_update
from notifications import notification_manager

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None

def start_scheduler():
    """Start the background scheduler for automated tasks"""
    global scheduler
    
    if scheduler is not None:
        logger.info("Scheduler already running")
        return
    
    try:
        scheduler = BackgroundScheduler()
        
        # Schedule daily scraping at 10 AM
        scheduler.add_job(
            func=daily_scrape_job,
            trigger=CronTrigger(hour=10, minute=0),
            id='daily_scrape',
            name='Daily IPO Data Scraping',
            replace_existing=True
        )
        
        # Schedule notification checks every 2 hours during market hours
        scheduler.add_job(
            func=notification_check_job,
            trigger=CronTrigger(hour='9-18/2'),  # Every 2 hours from 9 AM to 6 PM
            id='notification_check',
            name='IPO Notification Check',
            replace_existing=True
        )
        
        # Schedule daily cleanup at midnight
        scheduler.add_job(
            func=cleanup_job,
            trigger=CronTrigger(hour=0, minute=0),
            id='daily_cleanup',
            name='Daily Cleanup',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Scheduler started successfully")
        
        # Shut down scheduler when app exits
        atexit.register(lambda: scheduler.shutdown() if scheduler else None)
        
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")

def daily_scrape_job():
    """Job function for daily IPO data scraping"""
    try:
        logger.info("Starting daily scrape job...")
        # Import here to avoid circular imports
        from investorgain_scraper_selenium import scrape_investorgain_selenium
        result = scrape_investorgain_selenium()
        logger.info(f"Daily scrape completed: {result} records updated")
        
        # After scraping, check for notifications
        notification_check_job()
        
    except Exception as e:
        logger.error(f"Error in daily scrape job: {e}")

def notification_check_job():
    """Job function for checking and sending notifications"""
    try:
        logger.info("Starting notification check job...")
        alerts_sent = notification_manager.check_and_send_alerts()
        logger.info(f"Notification check completed: {alerts_sent} alerts sent")
        
    except Exception as e:
        logger.error(f"Error in notification check job: {e}")

def cleanup_job():
    """Job function for daily cleanup tasks"""
    try:
        logger.info("Starting cleanup job...")
        
        # Remove old inactive IPOs (older than 30 days)
        from datetime import datetime, timedelta
        from models import IPO, PushSubscription
        from extensions import db
        
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        # Clean up old IPOs
        old_ipos = IPO.query.filter(
            IPO.last_updated < cutoff_date,
            IPO.is_active == False
        ).delete()
        
        # Clean up inactive subscriptions (older than 7 days)
        subscription_cutoff = datetime.utcnow() - timedelta(days=7)
        old_subscriptions = PushSubscription.query.filter(
            PushSubscription.created_at < subscription_cutoff,
            PushSubscription.is_active == False
        ).delete()
        
        db.session.commit()
        logger.info(f"Cleanup completed: {old_ipos} old IPOs, {old_subscriptions} old subscriptions removed")
        
    except Exception as e:
        logger.error(f"Error in cleanup job: {e}")

def stop_scheduler():
    """Stop the scheduler"""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        scheduler = None
        logger.info("Scheduler stopped")

# Manual trigger functions for testing
def trigger_scrape():
    """Manually trigger scraping job"""
    daily_scrape_job()

def trigger_notifications():
    """Manually trigger notification check"""
    notification_check_job()
