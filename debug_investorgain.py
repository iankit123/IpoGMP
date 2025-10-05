#!/usr/bin/env python3

import requests
from bs4 import BeautifulSoup
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_investorgain():
    """Debug script to understand InvestorGain website structure"""
    
    url = "https://www.investorgain.com/report/live-ipo-gmp/331/all/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    try:
        print("🔍 Fetching InvestorGain website...")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        print(f"✅ Response status: {response.status_code}")
        print(f"📄 Content length: {len(response.content)} bytes")
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for tables
        tables = soup.find_all('table')
        print(f"📊 Found {len(tables)} tables")
        
        for i, table in enumerate(tables):
            print(f"\n--- Table {i+1} ---")
            rows = table.find_all('tr')
            print(f"Rows: {len(rows)}")
            
            if len(rows) > 0:
                # Show first row (headers)
                first_row = rows[0]
                cells = first_row.find_all(['th', 'td'])
                headers = [cell.get_text(strip=True) for cell in cells]
                print(f"Headers: {headers}")
                
                # Show first few data rows
                for j, row in enumerate(rows[1:4], 1):  # Show first 3 data rows
                    cells = row.find_all(['td', 'th'])
                    cell_texts = [cell.get_text(strip=True) for cell in cells]
                    print(f"Row {j}: {cell_texts[:5]}...")  # Show first 5 columns
        
        # Look for any text containing "IPO" or company names
        print(f"\n🔍 Looking for IPO-related content...")
        ipo_elements = soup.find_all(string=lambda text: text and ('IPO' in text or 'Ltd' in text or 'Limited' in text))
        print(f"Found {len(ipo_elements)} IPO-related text elements")
        
        # Show first few
        for i, element in enumerate(ipo_elements[:10]):
            print(f"  {i+1}: {element.strip()[:100]}...")
        
        # Look for divs with specific classes that might contain data
        print(f"\n🔍 Looking for data containers...")
        data_divs = soup.find_all('div', class_=lambda x: x and ('data' in x.lower() or 'table' in x.lower() or 'content' in x.lower()))
        print(f"Found {len(data_divs)} potential data containers")
        
        # Check if there's any JavaScript that loads data
        scripts = soup.find_all('script')
        print(f"\n📜 Found {len(scripts)} script tags")
        
        for i, script in enumerate(scripts[:5]):  # Check first 5 scripts
            if script.string and len(script.string) > 100:
                print(f"Script {i+1}: {len(script.string)} chars")
                if 'ipo' in script.string.lower() or 'data' in script.string.lower():
                    print(f"  Contains IPO/data keywords")
                    # Show first 200 chars
                    print(f"  Content: {script.string[:200]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_investorgain()
