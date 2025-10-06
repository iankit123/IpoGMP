#!/usr/bin/env python3

import requests
from bs4 import BeautifulSoup
import logging
import json
import re
from datetime import datetime, timedelta
import os
from supabase import create_client, Client
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InvestorGainScraperProper:
    """Proper InvestorGain scraper that fetches real data from the table"""
    
    def __init__(self):
        self.base_urls = [
            "https://www.investorgain.com/report/live-ipo-gmp/331/all/",
            "https://www.investorgain.com/report/live-ipo-gmp/",
            "https://www.investorgain.com/ipo-gmp/",
            "https://www.investorgain.com/",
            
        ]
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        }
        
        # Initialize Supabase client
        supabase_url = os.environ.get("SUPABASE_URL", "https://jztpxmdiaqsafpzfcpib.supabase.co")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU")
        self.supabase: Client = create_client(supabase_url, supabase_key)
    
    def scrape_ipo_data(self):
        """Scrape real IPO data from InvestorGain website"""
        logger.info("Starting proper InvestorGain IPO data scraping...")
        
        session = requests.Session()
        session.headers.update(self.headers)
        
        for url in self.base_urls:
            try:
                logger.info(f"Trying URL: {url}")
                response = session.get(url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Try to parse the IPO table
                ipo_data = self._parse_ipo_table(soup)
                if ipo_data:
                    logger.info(f"Successfully scraped {len(ipo_data)} IPOs from {url}")
                    return ipo_data
                    
            except Exception as e:
                logger.warning(f"Failed to scrape {url}: {e}")
                continue
        
        logger.error("All URLs failed to provide IPO data")
        return []
    
    def _parse_ipo_table(self, soup):
        """Parse the IPO table from HTML"""
        ipo_data = []
        
        # Look for tables
        tables = soup.find_all('table')
        logger.info(f"Found {len(tables)} tables")
        
        for i, table in enumerate(tables):
            rows = table.find_all('tr')
            if len(rows) > 1:
                logger.info(f"Table {i+1} has {len(rows)} rows")
                
                # Check if this looks like the IPO table
                first_row = rows[0]
                headers = [th.get_text(strip=True).lower() for th in first_row.find_all(['th', 'td'])]
                logger.info(f"Headers: {headers}")
                
                # Look for the specific column structure from the image
                expected_headers = ['name', 'gmp', 'rating', 'sub', 'price', 'ipo size', 'lot', 'open', 'close']
                if any(header in ' '.join(headers) for header in expected_headers):
                    logger.info(f"Found IPO table at index {i+1}")
                    
                    # Parse each data row
                    for j, row in enumerate(rows[1:], 1):
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 5:  # Minimum columns expected
                            ipo_info = self._parse_ipo_row(cells, headers)
                            if ipo_info and ipo_info['name'] and ipo_info['name'] != 'Name':
                                ipo_data.append(ipo_info)
                                logger.info(f"Parsed IPO {j}: {ipo_info['name']} - GMP: ₹{ipo_info.get('gmp_value', 'N/A')} ({ipo_info.get('gmp_percentage', 'N/A')}%)")
                    break
        
        return ipo_data
    
    def _parse_ipo_row(self, cells, headers):
        """Parse individual IPO row data based on the table structure"""
        try:
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            
            if len(cell_texts) < 5:
                return None
            
            # Map columns based on the table structure from the image
            # Expected columns: Name, GMP, Rating, Sub, GMP(L/H), Price, IPO Size, Lot, Open, Close, BoA Dt, Listing, Updated-On, Anchor
            
            name = cell_texts[0] if len(cell_texts) > 0 else ""
            
            # Skip if name is empty or looks like a header
            if not name or name.lower() in ['name', 'ipo name', 'company', 'loading...', 'total records']:
                return None
            
            # Parse GMP (column 1) - format like "₹318 (27.89%)"
            gmp_text = cell_texts[1] if len(cell_texts) > 1 else ""
            gmp_value, gmp_percentage = self._parse_gmp_from_text(gmp_text)
            
            # Parse Price (column 5) - format like "1,140"
            price_text = cell_texts[5] if len(cell_texts) > 5 else ""
            price = self._parse_number(price_text)
            
            # Parse IPO Size (column 6) - format like "11,607.01"
            ipo_size_text = cell_texts[6] if len(cell_texts) > 6 else ""
            ipo_size = self._parse_number(ipo_size_text)
            
            # Parse Lot (column 7) - format like "13"
            lot_text = cell_texts[7] if len(cell_texts) > 7 else ""
            lot_size = self._parse_number(lot_text)
            
            # Parse Open Date (column 8) - format like "7-Oct"
            open_date_text = cell_texts[8] if len(cell_texts) > 8 else ""
            open_date = self._parse_date(open_date_text)
            
            # Parse Close Date (column 9) - format like "9-Oct"
            close_date_text = cell_texts[9] if len(cell_texts) > 9 else ""
            close_date = self._parse_date(close_date_text)
            
            # Parse Updated-On (column 12) - format like "6-Oct 23:28"
            updated_text = cell_texts[12] if len(cell_texts) > 12 else ""
            updated_on = self._parse_updated_time(updated_text)
            
            return {
                'name': name,
                'gmp_value': gmp_value,
                'gmp_percentage': gmp_percentage,
                'price': price,
                'ipo_size': ipo_size,
                'lot_size': lot_size,
                'subscription_multiple': None,  # Not available in this table
                'open_date': open_date,
                'close_date': close_date,
                'updated_on': updated_on,
                'data_source': 'investorgain',
                'is_active': True
            }
            
        except Exception as e:
            logger.error(f"Error parsing IPO row: {e}")
            return None
    
    def _parse_gmp_from_text(self, gmp_text):
        """Parse GMP value and percentage from text like '₹318 (27.89%)'"""
        try:
            if not gmp_text or gmp_text == '-' or gmp_text == '₹--':
                return None, None
            
            # Handle formats like '₹318 (27.89%)', '₹-- (0.00%)'
            value_match = re.search(r'₹(\d+(?:,\d+)*(?:\.\d+)?)', gmp_text)
            percentage_match = re.search(r'\((\d+(?:\.\d+)?)%\)', gmp_text)
            
            value = None
            if value_match:
                # Remove commas from the number
                value_str = value_match.group(1).replace(',', '')
                value = float(value_str)
            
            percentage = float(percentage_match.group(1)) if percentage_match else None
            
            return value, percentage
        except Exception as e:
            logger.error(f"Error parsing GMP: {gmp_text} - {e}")
            return None, None
    
    def _parse_number(self, text):
        """Parse number from text, handling commas"""
        try:
            if not text or text == '-' or text == 'N/A':
                return None
            
            # Remove commas and other non-numeric characters except decimal point
            cleaned = re.sub(r'[^\d.]', '', text)
            return float(cleaned) if cleaned else None
        except Exception as e:
            logger.error(f"Error parsing number: {text} - {e}")
            return None
    
    def _parse_date(self, date_text):
        """Parse date from text like '7-Oct', '9-Oct'"""
        try:
            if not date_text or date_text == '-' or date_text == 'TBA':
                return None
            
            current_year = datetime.now().year
            
            # Handle formats like '7-Oct', '9-Oct'
            date_formats = [
                '%d-%b',
                '%d-%m',
                '%d/%m',
                '%d-%m-%Y',
                '%d/%m/%Y'
            ]
            
            for fmt in date_formats:
                try:
                    if fmt in ['%d-%b', '%d-%m', '%d/%m']:
                        parsed_date = datetime.strptime(date_text, fmt).replace(year=current_year)
                    else:
                        parsed_date = datetime.strptime(date_text, fmt)
                    
                    return parsed_date.date()
                except:
                    continue
            
            return None
        except Exception as e:
            logger.error(f"Error parsing date: {date_text} - {e}")
            return None
    
    def _parse_updated_time(self, updated_text):
        """Parse updated timestamp from text like '6-Oct 23:28'"""
        try:
            if not updated_text:
                return datetime.now()
            
            current_year = datetime.now().year
            
            try:
                # Try format like '6-Oct 23:28'
                parsed_datetime = datetime.strptime(f"{updated_text} {current_year}", "%d-%b %H:%M %Y")
                return parsed_datetime
            except:
                return datetime.now()
        except Exception as e:
            logger.error(f"Error parsing updated time: {updated_text} - {e}")
            return datetime.now()
    
    def save_to_supabase(self, ipo_data):
        """Save IPO data to Supabase"""
        try:
            if not ipo_data:
                logger.info("No IPO data to save")
                return 0
            
            # Convert date objects to strings for JSON serialization
            serializable_data = []
            for ipo in ipo_data:
                serializable_ipo = ipo.copy()
                if serializable_ipo.get('open_date'):
                    serializable_ipo['open_date'] = serializable_ipo['open_date'].isoformat()
                if serializable_ipo.get('close_date'):
                    serializable_ipo['close_date'] = serializable_ipo['close_date'].isoformat()
                if serializable_ipo.get('updated_on'):
                    serializable_ipo['updated_on'] = serializable_ipo['updated_on'].isoformat()
                serializable_data.append(serializable_ipo)
            
            # Clear existing InvestorGain data
            delete_result = self.supabase.table('ipo_investorgain').delete().neq('id', 0).execute()
            logger.info(f"Cleared existing InvestorGain data: {len(delete_result.data)} records")
            
            # Insert new data
            insert_result = self.supabase.table('ipo_investorgain').insert(serializable_data).execute()
            
            logger.info(f"Saved {len(insert_result.data)} IPO records to InvestorGain table")
            return len(insert_result.data)
            
        except Exception as e:
            logger.error(f"Error saving to Supabase: {e}")
            return 0

def scrape_investorgain_data_proper():
    """Main function to scrape InvestorGain data properly"""
    scraper = InvestorGainScraperProper()
    
    # Scrape data
    ipo_data = scraper.scrape_ipo_data()
    
    if ipo_data:
        # Save to Supabase
        saved_count = scraper.save_to_supabase(ipo_data)
        print(f"📈 {saved_count} new IPOs")
        print(f"🔄 {saved_count} updated IPOs")
        logger.info(f"InvestorGain scraping completed: {saved_count} records saved")
        
        # Print summary of scraped data
        print("\n📊 Scraped IPO Summary:")
        for ipo in ipo_data[:5]:  # Show first 5 IPOs
            print(f"  • {ipo['name']}: GMP ₹{ipo.get('gmp_value', 'N/A')} ({ipo.get('gmp_percentage', 'N/A')}%)")
        
        return saved_count
    else:
        print("📈 0 new IPOs")
        print("🔄 0 updated IPOs")
        logger.warning("No InvestorGain data scraped")
        return 0

if __name__ == "__main__":
    scrape_investorgain_data_proper()
