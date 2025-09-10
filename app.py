import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database with graceful fallback
def configure_database():
    database_url = os.environ.get("DATABASE_URL")
    
    if database_url:
        # Validate PostgreSQL connection URL format
        if database_url.startswith(('postgresql://', 'postgres://')):
            # Check for invalid host names like "helium"
            if 'helium' in database_url:
                logging.warning("Invalid database host 'helium' detected in DATABASE_URL, falling back to SQLite")
                return "sqlite:///ipo_tracker.db"
            
            try:
                # Test the connection by attempting to parse and connect
                from sqlalchemy import create_engine
                test_engine = create_engine(database_url, pool_pre_ping=True)
                test_engine.connect().close()
                logging.info(f"Successfully connected to PostgreSQL database")
                return database_url
            except Exception as e:
                logging.error(f"Failed to connect to PostgreSQL database: {e}")
                logging.info("Falling back to SQLite database")
                return "sqlite:///ipo_tracker.db"
        else:
            logging.warning(f"Invalid DATABASE_URL format: {database_url}, falling back to SQLite")
            return "sqlite:///ipo_tracker.db"
    else:
        logging.info("No DATABASE_URL found, using SQLite database")
        return "sqlite:///ipo_tracker.db"

# Configure database with error handling
app.config["SQLALCHEMY_DATABASE_URI"] = configure_database()
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the app with the extension
db.init_app(app)

def initialize_app():
    """Initialize the app with error handling to prevent crash loops"""
    try:
        with app.app_context():
            # Import models to ensure tables are created
            import models
            
            # Test database connection before creating tables
            db.engine.connect().close()
            logging.info("Database connection successful")
            
            # Create all tables
            db.create_all()
            logging.info("Database tables created successfully")
            
            # Import routes
            import routes
            
            # Start scheduler
            from scheduler import start_scheduler
            start_scheduler()
            
    except Exception as e:
        logging.error(f"Failed to initialize application: {e}")
        logging.error("Application will continue with limited functionality")
        # Import routes even if database fails to allow basic error pages
        try:
            import routes
        except Exception as route_error:
            logging.error(f"Failed to import routes: {route_error}")

# Initialize with error handling
initialize_app()
