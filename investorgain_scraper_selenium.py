#!/usr/bin/env python3

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
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

class InvestorGainScraperSelenium:
    """Selenium-based InvestorGain scraper for JavaScript-rendered content"""
    
    def __init__(self):
        # Initialize Supabase client
        supabase_url = os.environ.get("SUPABASE_URL", "https://jztpxmdiaqsafpzfcpib.supabase.co")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU")
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        self.url = "https://www.investorgain.com/report/live-ipo-gmp/331/all/"
    
    def scrape_ipo_data(self):
        """Scrape real IPO data using Selenium to handle JavaScript rendering"""
        logger.info("Starting Selenium-based InvestorGain IPO data scraping...")
        
        # Set up Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        driver = None
        try:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info("Chrome driver initialized")
            
            # Navigate to the page
            driver.get(self.url)
            logger.info(f"Navigated to {self.url}")
            
            # Wait for the table to load (JavaScript-rendered content)
            wait = WebDriverWait(driver, 10)
            
            # Wait for table elements with data-label attributes to appear
            try:
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "td[data-label]")))
                logger.info("Table with data-label attributes found")
            except:
                logger.warning("Table with data-label attributes not found, trying alternative selectors")
                # Try to wait for any table
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
                logger.info("Table found")
            
            # Additional wait for JavaScript to fully render
            time.sleep(5)
            
            # Get the page source after JavaScript execution
            page_source = driver.page_source
            logger.info(f"Page source length: {len(page_source)} bytes")
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(page_source, 'html.parser')
            
            # Extract IPO data
            ipo_data = self._extract_ipo_data_from_soup(soup)
            
            return ipo_data
            
        except Exception as e:
            logger.error(f"Selenium scraping failed: {e}")
            return []
        finally:
            if driver:
                driver.quit()
                logger.info("Chrome driver closed")
    
    def _extract_ipo_data_from_soup(self, soup):
        """Extract IPO data from the parsed HTML"""
        ipo_data = []
        
        # Look for table rows with data-label attributes
        rows = soup.find_all('tr')
        logger.info(f"Found {len(rows)} table rows")
        
        for row in rows:
            # Look for cells with data-label attributes
            cells_with_labels = row.find_all('td', attrs={'data-label': True})
            
            if len(cells_with_labels) >= 3:  # At least 3 data columns
                ipo_info = self._parse_structured_row(cells_with_labels, row)
                if ipo_info and ipo_info['name']:
                    ipo_data.append(ipo_info)
                    logger.info(f"Parsed IPO: {ipo_info['name']} - GMP ₹{ipo_info.get('gmp_value', 'N/A')} ({ipo_info.get('gmp_percentage', 'N/A')}%)")
        
        return ipo_data
    
    def _parse_structured_row(self, cells_with_labels, row):
        """Parse a structured row with data-label attributes"""
        try:
            ipo_info = {
                'name': '',
                'gmp_value': None,
                'gmp_percentage': None,
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
            
            # Log all available keys for debugging
            available_labels = [cell.get('data-label', '') for cell in cells_with_labels]
            
            # Debug logging for specific IPO
            is_target_ipo = False
            for cell in cells_with_labels:
                if "MARC Technocrats" in cell.get_text(strip=True):
                    is_target_ipo = True
                    logger.info(f"DEBUG: Found MARC Technocrats. Labels: {available_labels}")
                    break
            
            if is_target_ipo:
                for cell in cells_with_labels:
                    logger.info(f"DEBUG CELL: Label='{cell.get('data-label')}', Text='{cell.get_text(strip=True)}'")

            logger.info(f"Row labels: {available_labels}")

            # Extract data from each cell based on its data-label
            for cell in cells_with_labels:
                data_label = cell.get('data-label', '').lower().strip()
                cell_text = cell.get_text(strip=True)
                
                if data_label in ['name', 'ipo name', 'company']:
                    # Extract name from the cell (might be in an <a> tag)
                    name_link = cell.find('a')
                    if name_link:
                        ipo_info['name'] = name_link.get_text(strip=True)
                    else:
                        ipo_info['name'] = cell_text
                
                elif 'gmp' in data_label:
                    # Parse GMP value and percentage
                    gmp_value, gmp_percentage = self._parse_gmp_from_structured_cell(cell)
                    ipo_info['gmp_value'] = gmp_value
                    ipo_info['gmp_percentage'] = gmp_percentage
                
                elif 'price' in data_label:
                    ipo_info['price'] = self._parse_number(cell_text)
                
                elif 'size' in data_label:
                    ipo_info['ipo_size'] = self._parse_number(cell_text)
                
                elif 'lot' in data_label:
                    lot_size = self._parse_number(cell_text)
                    ipo_info['lot_size'] = int(lot_size) if lot_size else None
                
                elif 'open' in data_label:
                    ipo_info['open_date'] = self._parse_date(cell_text)
                
                elif 'close' in data_label:
                    ipo_info['close_date'] = self._parse_date(cell_text)
                
                elif 'sub' in data_label:
                    # Parse subscription multiple (e.g., "0.39x")
                    subscription_text = cell_text.replace('x', '').replace('X', '')
                    ipo_info['subscription_multiple'] = self._parse_number(subscription_text)
            
            # If we didn't get a name from data-label, try to extract from the row
            if not ipo_info['name']:
                name_cell = row.find('td')
                if name_cell:
                    name_link = name_cell.find('a')
                    if name_link:
                        ipo_info['name'] = name_link.get_text(strip=True)
                    else:
                        ipo_info['name'] = name_cell.get_text(strip=True)
            
            # Skip if no name or looks like a header
            if not ipo_info['name'] or ipo_info['name'].lower() in ['name', 'ipo name', 'company', 'loading...']:
                return None
            
            return ipo_info
            
        except Exception as e:
            logger.error(f"Error parsing structured row: {e}")
            return None
    
    def _parse_gmp_from_structured_cell(self, cell):
        """Parse GMP value and percentage from a structured cell"""
        try:
            # Look for <b> tag containing the GMP value
            gmp_value_tag = cell.find('b')
            gmp_value = None
            if gmp_value_tag:
                gmp_value_text = gmp_value_tag.get_text(strip=True)
                gmp_value = self._parse_number(gmp_value_text)
            
            # Look for percentage in parentheses
            cell_text = cell.get_text(strip=True)
            percentage_match = re.search(r'\((\d+(?:\.\d+)?)%\)', cell_text)
            gmp_percentage = float(percentage_match.group(1)) if percentage_match else None
            
            return gmp_value, gmp_percentage
        except Exception as e:
            logger.error(f"Error parsing GMP from structured cell: {e}")
            return None, None
    
    def _parse_number(self, text):
        """Parse number from text, handling commas"""
        try:
            if not text or text == '-' or text == 'N/A' or text == '--':
                return None
            
            # Remove commas and other non-numeric characters except decimal point
            cleaned = re.sub(r'[^\d.]', '', text)
            return float(cleaned) if cleaned else None
        except Exception as e:
            logger.error(f"Error parsing number: {text} - {e}")
            return None
    
    def _parse_date(self, date_text):
        """Parse date from text like '9-Oct', '13-Oct'"""
        try:
            if not date_text or date_text == '-' or date_text == 'TBA':
                return None
            
            current_year = datetime.now().year
            
            # Handle formats like '9-Oct', '13-Oct'
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
    
    def save_to_supabase(self, ipo_data):
        """Save IPO data to Supabase"""
        try:
            if not ipo_data:
                logger.info("No IPO data to save")
                return 0
            
            # Fetch existing data to preserve values if scraping fails
            try:
                existing_data_response = self.supabase.table('ipo_investorgain').select('*').execute()
                existing_data = {item['name']: item for item in existing_data_response.data}
                logger.info(f"Fetched {len(existing_data)} existing records for merging")
            except Exception as e:
                logger.warning(f"Failed to fetch existing data: {e}")
                existing_data = {}

            # Convert date objects to strings for JSON serialization
            serializable_data = []
            for ipo in ipo_data:
                serializable_ipo = ipo.copy()
                
                # Merge with existing data if new data is missing critical fields
                if ipo['name'] in existing_data:
                    existing = existing_data[ipo['name']]
                    
                    # If price is missing in new scrape but exists in DB, keep DB value
                    if not serializable_ipo.get('price') and existing.get('price'):
                        serializable_ipo['price'] = existing['price']
                        logger.info(f"Preserved existing price for {ipo['name']}")
                        
                    # If size is missing in new scrape but exists in DB, keep DB value
                    if not serializable_ipo.get('ipo_size') and existing.get('ipo_size'):
                        serializable_ipo['ipo_size'] = existing['ipo_size']
                        logger.info(f"Preserved existing size for {ipo['name']}")

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

def scrape_investorgain_selenium():
    """Main function to scrape InvestorGain data using Selenium"""
    scraper = InvestorGainScraperSelenium()
    
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
            print(f"  • {ipo['name']}: GMP ₹{ipo.get('gmp_value', 'N/A')} | Price: {ipo.get('price', 'N/A')} | Size: {ipo.get('ipo_size', 'N/A')}")
        
        return saved_count
    else:
        print("📈 0 new IPOs")
        print("🔄 0 updated IPOs")
        logger.warning("No InvestorGain data scraped")
        return 0

if __name__ == "__main__":
    scrape_investorgain_selenium()
