
import os
from supabase import create_client, Client
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_data():
    supabase_url = os.environ.get("SUPABASE_URL", "https://jztpxmdiaqsafpzfcpib.supabase.co")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU")
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    ipo_name = "MARC Technocrats NSE SME"
    
    print(f"Checking data for: {ipo_name}")
    
    # Check ipo_investorgain table
    print("\n--- Table: ipo_investorgain ---")
    try:
        response = supabase.table('ipo_investorgain').select('*').ilike('name', f'%{ipo_name}%').execute()
        if response.data:
            for record in response.data:
                print(f"Name: {record.get('name')}")
                print(f"Price: {record.get('price')}")
                print(f"IPO Size: {record.get('ipo_size')}")
                print(f"Updated On: {record.get('updated_on')}")
        else:
            print("No record found.")
    except Exception as e:
        print(f"Error querying ipo_investorgain: {e}")

    # Check ipos table
    print("\n--- Table: ipos ---")
    try:
        response = supabase.table('ipos').select('*').ilike('name', f'%{ipo_name}%').execute()
        if response.data:
            for record in response.data:
                print(f"Name: {record.get('name')}")
                print(f"Issue Price: {record.get('issue_price')}")
                print(f"Lot Size: {record.get('lot_size')}")
                print(f"Last Updated: {record.get('last_updated')}")
        else:
            print("No record found.")
    except Exception as e:
        print(f"Error querying ipos: {e}")

if __name__ == "__main__":
    check_data()
