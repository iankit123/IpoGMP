from app import db
from datetime import datetime
from sqlalchemy import DateTime, String, Float, Boolean, Text

class IPO(db.Model):
    """Model for storing IPO data"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(String(200), nullable=False)
    open_date = db.Column(DateTime, nullable=True)
    close_date = db.Column(DateTime, nullable=True)
    gmp_value = db.Column(Float, nullable=True)  # Grey Market Premium value
    gmp_percentage = db.Column(Float, nullable=True)  # GMP as percentage
    issue_price = db.Column(Float, nullable=True)
    lot_size = db.Column(db.Integer, nullable=True)
    subscription_status = db.Column(String(100), nullable=True)
    listing_date = db.Column(DateTime, nullable=True)
    last_updated = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(Boolean, default=True)
    
    def __repr__(self):
        return f'<IPO {self.name}>'
    
    def to_dict(self):
        """Convert IPO object to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'open_date': self.open_date.isoformat() if self.open_date else None,
            'close_date': self.close_date.isoformat() if self.close_date else None,
            'gmp_value': self.gmp_value,
            'gmp_percentage': self.gmp_percentage,
            'issue_price': self.issue_price,
            'lot_size': self.lot_size,
            'subscription_status': self.subscription_status,
            'listing_date': self.listing_date.isoformat() if self.listing_date else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'is_active': self.is_active
        }

class PushSubscription(db.Model):
    """Model for storing push notification subscriptions"""
    id = db.Column(db.Integer, primary_key=True)
    endpoint = db.Column(Text, nullable=False, unique=True)
    p256dh = db.Column(Text, nullable=False)
    auth = db.Column(Text, nullable=False)
    created_at = db.Column(DateTime, default=datetime.utcnow)
    is_active = db.Column(Boolean, default=True)
    
    def to_dict(self):
        """Convert subscription to dictionary for pywebpush"""
        return {
            'endpoint': self.endpoint,
            'keys': {
                'p256dh': self.p256dh,
                'auth': self.auth
            }
        }
