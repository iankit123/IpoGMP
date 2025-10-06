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

class InvestorGainScraperDynamic:
    """Dynamic InvestorGain scraper that handles JavaScript-rendered content"""
    
    def __init__(self):
        self.base_urls = [
            "https://www.investorgain.com/report/live-ipo-gmp/331/all/",
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
        logger.info("Starting dynamic InvestorGain IPO data scraping...")
        
        session = requests.Session()
        session.headers.update(self.headers)
        
        for url in self.base_urls:
            try:
                logger.info(f"Trying URL: {url}")
                response = session.get(url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Try to extract data from the HTML structure
                ipo_data = self._extract_ipo_data_from_html(soup, response.text)
                if ipo_data:
                    logger.info(f"Successfully scraped {len(ipo_data)} IPOs from {url}")
                    return ipo_data
                    
            except Exception as e:
                logger.warning(f"Failed to scrape {url}: {e}")
                continue
        
        # If scraping fails, return empty list to avoid hardcoded data
        logger.error("All scraping attempts failed - returning empty data to avoid hardcoding")
        return []
    
    def _extract_ipo_data_from_html(self, soup, html_text):
        """Extract IPO data from HTML using multiple strategies"""
        ipo_data = []
        
        # Strategy 1: Look for table elements with IPO data
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            if len(rows) > 1:
                # Check if this looks like an IPO table
                first_row = rows[0]
                headers = [th.get_text(strip=True).lower() for th in first_row.find_all(['th', 'td'])]
                
                if any(keyword in ' '.join(headers) for keyword in ['name', 'gmp', 'ipo', 'price']):
                    logger.info("Found potential IPO table")
                    for row in rows[1:]:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 3:
                            ipo_info = self._parse_ipo_row(cells)
                            if ipo_info and ipo_info['name']:
                                ipo_data.append(ipo_info)
                    break
        
        # Strategy 2: Look for div-based data structures
        if not ipo_data:
            ipo_data = self._extract_from_divs(soup)
        
        # Strategy 3: Look for JavaScript data
        if not ipo_data:
            ipo_data = self._extract_from_javascript(html_text)
        
        return ipo_data
    
    def _extract_from_divs(self, soup):
        """Extract IPO data from div elements"""
        ipo_data = []
        
        # Look for divs that might contain IPO data
        divs = soup.find_all('div', class_=lambda x: x and any(keyword in str(x).lower() for keyword in ['ipo', 'gmp', 'table', 'row']))
        
        for div in divs:
            text = div.get_text(strip=True)
            if len(text) > 20 and any(keyword in text.lower() for keyword in ['gmp', 'ipo', 'premium']):
                # Try to extract IPO information from this div
                ipo_info = self._parse_ipo_from_text(text)
                if ipo_info:
                    ipo_data.append(ipo_info)
        
        return ipo_data
    
    def _extract_from_javascript(self, html_text):
        """Extract IPO data from JavaScript variables"""
        ipo_data = []
        
        # Look for JSON data in script tags
        json_patterns = [
            r'var\s+ipoData\s*=\s*(\[.*?\]);',
            r'const\s+ipoData\s*=\s*(\[.*?\]);',
            r'let\s+ipoData\s*=\s*(\[.*?\]);',
            r'window\.ipoData\s*=\s*(\[.*?\]);',
        ]
        
        for pattern in json_patterns:
            matches = re.findall(pattern, html_text, re.DOTALL)
            for match in matches:
                try:
                    data = json.loads(match)
                    if isinstance(data, list):
                        for item in data:
                            ipo_info = self._convert_json_to_ipo(item)
                            if ipo_info:
                                ipo_data.append(ipo_info)
                except:
                    continue
        
        return ipo_data
    
    def _parse_ipo_row(self, cells):
        """Parse individual IPO row data"""
        try:
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            
            if len(cell_texts) < 3:
                return None
            
            name = cell_texts[0] if len(cell_texts) > 0 else ""
            
            # Skip if name is empty or looks like a header
            if not name or name.lower() in ['name', 'ipo name', 'company', 'loading...']:
                return None
            
            # Parse GMP from various columns
            gmp_value, gmp_percentage = None, None
            for text in cell_texts:
                if '₹' in text and '%' in text:
                    gmp_value, gmp_percentage = self._parse_gmp_from_text(text)
                    if gmp_value:
                        break
            
            # Parse price
            price = None
            for text in cell_texts:
                if '₹' in text and not gmp_value:
                    price = self._parse_number(text)
                    if price:
                        break
            
            return {
                'name': name,
                'gmp_value': gmp_value,
                'gmp_percentage': gmp_percentage,
                'price': price,
                'ipo_size': None,
                'lot_size': None,
                'subscription_multiple': None,
                'open_date': None,
                'close_date': None,
                'updated_on': datetime.now(),
                'data_source': 'investorgain',
                'is_active': True
            }
            
        except Exception as e:
            logger.error(f"Error parsing IPO row: {e}")
            return None
    
    def _parse_ipo_from_text(self, text):
        """Parse IPO information from unstructured text"""
        try:
            # Look for patterns like "Rubicon Research GMP: ₹80 (16.49%)"
            gmp_pattern = r'([A-Za-z\s&]+?)\s+(?:GMP|gmp)[:\s]*₹?(\d+(?:\.\d+)?)\s*\(?(\d+(?:\.\d+)?)%?\)?'
            match = re.search(gmp_pattern, text, re.IGNORECASE)
            
            if match:
                name = match.group(1).strip()
                gmp_value = float(match.group(2))
                gmp_percentage = float(match.group(3)) if match.group(3) else None
                
                return {
                    'name': name,
                    'gmp_value': gmp_value,
                    'gmp_percentage': gmp_percentage,
                    'price': None,
                    'ipo_size': None,
                    'lot_size': None,
                    'subscription_multiple': None,
                    'open_date': None,
                    'close_date': None,
                    'updated_on': datetime.now(),
                    'data_source': 'investorgain',
                    'is_active': True
                }
        except Exception as e:
            logger.error(f"Error extracting IPO from text: {e}")
        
        return None
    
    def _parse_gmp_from_text(self, gmp_text):
        """Parse GMP value and percentage from text like '₹80 (16.49%)'"""
        try:
            if not gmp_text or gmp_text == '-' or gmp_text == '₹--':
                return None, None
            
            # Handle formats like '₹80 (16.49%)', '₹-- (0.00%)'
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
    
    def _convert_json_to_ipo(self, json_data):
        """Convert JSON data to IPO format"""
        try:
            return {
                'name': json_data.get('name', ''),
                'gmp_value': json_data.get('gmp_value'),
                'gmp_percentage': json_data.get('gmp_percentage'),
                'price': json_data.get('price'),
                'ipo_size': json_data.get('ipo_size'),
                'lot_size': json_data.get('lot_size'),
                'subscription_multiple': json_data.get('subscription_multiple'),
                'open_date': None,
                'close_date': None,
                'updated_on': datetime.now(),
                'data_source': 'investorgain',
                'is_active': True
            }
        except:
            return None
    
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

def scrape_investorgain_dynamic():
    """Main function to scrape InvestorGain data dynamically"""
    scraper = InvestorGainScraperDynamic()
    
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
        for ipo in ipo_data:
            print(f"  • {ipo['name']}: GMP ₹{ipo.get('gmp_value', 'N/A')} ({ipo.get('gmp_percentage', 'N/A')}%)")
        
        return saved_count
    else:
        print("📈 0 new IPOs")
        print("🔄 0 updated IPOs")
        logger.warning("No InvestorGain data scraped - scraper could not extract real data")
        return 0

if __name__ == "__main__":
    scrape_investorgain_dynamic()
