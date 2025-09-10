# IPO Tracker - Grey Market Premium

## Overview

IPO Tracker is a Progressive Web Application (PWA) built with Flask that monitors and displays IPO (Initial Public Offering) Grey Market Premium data. The application scrapes IPO information from external sources, stores it in a database, and provides real-time updates to users through web push notifications. Users can track active IPOs, view GMP percentages, subscription status, and receive notifications about significant changes in IPO market conditions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Progressive Web App (PWA)**: Built with service workers for offline functionality and app-like experience
- **Bootstrap 5 with Dark Theme**: Uses Replit's dark theme for consistent UI styling
- **Vanilla JavaScript**: Client-side functionality without heavy frameworks, focusing on push notifications and offline capabilities
- **Responsive Design**: Mobile-first approach with Bootstrap grid system

### Backend Architecture
- **Flask Web Framework**: Lightweight Python web framework serving as the main application server
- **SQLAlchemy ORM**: Database abstraction layer using DeclarativeBase for modern SQLAlchemy patterns
- **MVC Pattern**: Separation of concerns with models, routes (controllers), and templates (views)
- **Background Scheduler**: APScheduler for automated tasks like data scraping and notifications

### Data Storage Solutions
- **SQLite Database**: Default local database for development with PostgreSQL support through environment variables
- **Two Main Entities**:
  - IPO model: Stores IPO data including GMP values, dates, and subscription status
  - PushSubscription model: Manages web push notification subscriptions
- **Connection Pooling**: Configured with pool recycling and pre-ping for database reliability

### Authentication and Authorization
- **Session-based Authentication**: Flask sessions with configurable secret keys
- **No User Authentication**: Public application focused on data display rather than user management
- **Environment-based Security**: Secret keys and sensitive data managed through environment variables

### Background Processing
- **Web Scraping System**: Automated scraping of IPO data from ipowatch.in using BeautifulSoup
- **Scheduled Jobs**: 
  - Daily data scraping at 9 AM
  - Notification checks every 2 hours during market hours (9 AM - 6 PM)
  - Daily cleanup at midnight
- **Error Handling**: Comprehensive logging and graceful degradation for scraping failures

### Notification System
- **Web Push Notifications**: VAPID-based push notifications using pywebpush library
- **Subscription Management**: Users can subscribe/unsubscribe from browser notifications
- **Bulk Notifications**: System can send notifications to all active subscribers
- **Automatic Cleanup**: Invalid subscriptions are automatically deactivated

## External Dependencies

### Third-party Services
- **ipowatch.in**: Primary data source for IPO GMP information through web scraping
- **Web Push Protocol**: Browser-native push notification system using VAPID authentication

### Python Libraries
- **Flask Ecosystem**: flask, flask-sqlalchemy for web framework and database ORM
- **Web Scraping**: requests, beautifulsoup4 for data extraction from external websites
- **Notifications**: pywebpush for sending browser push notifications
- **Scheduling**: apscheduler for background task automation
- **Deployment**: werkzeug with ProxyFix for production deployment considerations

### Frontend Dependencies
- **Bootstrap 5**: UI framework with Replit's dark theme customization
- **Feather Icons**: Lightweight icon library for consistent iconography
- **Service Workers**: Browser APIs for PWA functionality and offline support

### Development Environment
- **Replit Platform**: Configured for Replit hosting with appropriate middleware and environment handling
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, VAPID keys for configuration management
- **Logging**: Comprehensive logging system for debugging and monitoring

### Browser APIs
- **Push API**: For receiving push notifications
- **Service Worker API**: For PWA functionality and caching
- **Notification API**: For displaying system notifications
- **Cache API**: For offline data storage and performance optimization