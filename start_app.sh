#!/bin/bash
# Startup script for IPO Tracker with VAPID keys

# Set VAPID keys for push notifications
export VAPID_PUBLIC_KEY="BFSnYJBRQXmaixtx3d8BJpQXZt-r92pfgwHn8_wsfnBIolm4RkArz0R5BaUkmDpmkja34KIdO0qzxEI_ChfvrL0"
export VAPID_PRIVATE_KEY="SgXR0Y4JZwCPoZgvFDg0uFKHQn81bj1mfMnOLKKLqiE"
export VAPID_SUBJECT="mailto:ankit_7agarwal@yahoo.in"

# Start the application
cd /Users/akshitagarwal/IPO_tracker/IpoGMP
python main.py
