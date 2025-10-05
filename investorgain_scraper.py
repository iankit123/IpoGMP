import requests
from bs4 import BeautifulSoup
import logging
from datetime import datetime, timedelta
import re
import json
from supabase import create_client, Client
import os

logger = logging.getLogger(__name__)

class InvestorGainScraper:
    """Class to scrape IPO GMP data from investorgain.com"""
    
    def __init__(self):
        self.base_url = "https://www.investorgain.com/report/live-ipo-gmp/331/all/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Initialize Supabase client
        supabase_url = os.environ.get("SUPABASE_URL", "https://jztpxmdiaqsafpzfcpib.supabase.co")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6dHB4bWRpYXFzYWZwemZjcGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTQ2MDgsImV4cCI6MjA3NTE3MDYwOH0.1tfhdtjS6B87p8I_0ntCdM4NH6MVn8E3Hmuw-2c_QZU")
        self.supabase: Client = create_client(supabase_url, supabase_key)
    
    def scrape_ipo_data(self):
        """Scrape IPO data from InvestorGain website"""
        try:
            logger.info("Starting InvestorGain IPO data scraping...")
            response = requests.get(self.base_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for the main content area
            ipo_data = []
            
            # Try to find the table with IPO data
            # Based on the website structure, look for specific patterns
            tables = soup.find_all('table')
            
            logger.info(f"Found {len(tables)} tables on the page")
            
            for i, table in enumerate(tables):
                logger.info(f"Analyzing table {i+1}")
                rows = table.find_all('tr')
                
                if len(rows) > 1:
                    # Check headers
                    headers = []
                    if rows[0]:
                        headers = [th.get_text(strip=True).lower() for th in rows[0].find_all(['th', 'td'])]
                        logger.info(f"Table {i+1} headers: {headers}")
                    
                    # Look for IPO-related columns
                    if any('name' in h or 'gmp' in h or 'price' in h for h in headers):
                        logger.info(f"Found IPO table at index {i+1}")
                        
                        # Parse data rows
                        for j, row in enumerate(rows[1:], 1):
                            cells = row.find_all(['td', 'th'])
                            if len(cells) >= 6:  # Minimum expected columns
                                ipo_info = self._parse_ipo_row(cells, headers)
                                if ipo_info:
                                    ipo_data.append(ipo_info)
                                    logger.info(f"Parsed IPO: {ipo_info['name']}")
                        break
            
            # If no table found, try to find data in other structures
            if not ipo_data:
                logger.info("No table data found, trying alternative parsing...")
                ipo_data = self._parse_alternative_structure(soup)
            
            logger.info(f"Scraped {len(ipo_data)} IPO records from InvestorGain")
            return ipo_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching data from InvestorGain: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing InvestorGain data: {e}")
            return []
    
    def _parse_json_data(self, json_data):
        """Parse JSON data if available"""
        ipo_data = []
        try:
            # This would depend on the actual JSON structure
            # For now, return empty list as we need to see the actual structure
            logger.info("JSON data found, but structure needs to be analyzed")
            return ipo_data
        except Exception as e:
            logger.error(f"Error parsing JSON data: {e}")
            return []
    
    def _parse_html_table(self, soup):
        """Parse HTML table data"""
        ipo_data = []
        
        # Look for table with IPO data
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            if len(rows) > 1:
                # Check if this looks like the IPO GMP table
                first_row = rows[0]
                headers = [th.get_text(strip=True).lower() for th in first_row.find_all(['th', 'td'])]
                
                # Look for expected columns
                expected_columns = ['name', 'gmp', 'price', 'ipo size', 'lot', 'sub', 'open', 'close', 'updated']
                if any(col in ' '.join(headers) for col in expected_columns):
                    logger.info("Found IPO GMP table structure")
                    
                    # Parse data rows
                    for row in rows[1:]:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 6:  # Minimum expected columns
                            ipo_info = self._parse_ipo_row(cells, headers)
                            if ipo_info:
                                ipo_data.append(ipo_info)
                    break
        
        return ipo_data
    
    def _parse_alternative_structure(self, soup):
        """Try to parse data from alternative structures if table parsing fails"""
        ipo_data = []
        
        try:
            # Look for divs or other elements that might contain IPO data
            # This is a fallback method for when tables aren't found
            
            # Look for any elements that might contain IPO names
            potential_ipo_elements = soup.find_all(['div', 'span', 'p'], string=re.compile(r'IPO|Ltd|Limited|Corp', re.I))
            
            logger.info(f"Found {len(potential_ipo_elements)} potential IPO elements")
            
            # For now, return empty list as we need to analyze the actual structure
            # This method can be expanded based on the actual HTML structure
            
        except Exception as e:
            logger.error(f"Error in alternative parsing: {e}")
        
        return ipo_data
    
    def _parse_ipo_row(self, cells, headers):
        """Parse individual IPO row data"""
        try:
            # Extract text from cells
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            
            if len(cell_texts) < 6:
                return None
            
            logger.info(f"Parsing row with {len(cell_texts)} cells: {cell_texts[:3]}...")
            
            # Map columns based on headers or position
            # Based on the website structure from the image description
            name = cell_texts[0] if len(cell_texts) > 0 else ""
            gmp_text = cell_texts[1] if len(cell_texts) > 1 else ""
            rating_text = cell_texts[2] if len(cell_texts) > 2 else ""
            sub_text = cell_texts[3] if len(cell_texts) > 3 else ""
            gmp_lh_text = cell_texts[4] if len(cell_texts) > 4 else ""
            price_text = cell_texts[5] if len(cell_texts) > 5 else ""
            ipo_size_text = cell_texts[6] if len(cell_texts) > 6 else ""
            lot_text = cell_texts[7] if len(cell_texts) > 7 else ""
            open_date_text = cell_texts[8] if len(cell_texts) > 8 else ""
            close_date_text = cell_texts[9] if len(cell_texts) > 9 else ""
            boa_date_text = cell_texts[10] if len(cell_texts) > 10 else ""
            listing_date_text = cell_texts[11] if len(cell_texts) > 11 else ""
            updated_text = cell_texts[12] if len(cell_texts) > 12 else ""
            anchor_text = cell_texts[13] if len(cell_texts) > 13 else ""
            
            # Skip if name is empty or looks like a header
            if not name or name.lower() in ['name', 'ipo name', 'company']:
                return None
            
            # Parse GMP value and percentage
            gmp_value, gmp_percentage = self._parse_gmp(gmp_text)
            
            # Parse price
            price = self._parse_number(price_text)
            
            # Parse IPO size
            ipo_size = self._parse_number(ipo_size_text)
            
            # Parse lot size
            lot_size = self._parse_number(lot_text)
            
            # Parse subscription multiple
            subscription_multiple = self._parse_number(sub_text)
            
            # Parse dates
            open_date = self._parse_date(open_date_text)
            close_date = self._parse_date(close_date_text)
            
            # Check if IPO is still open (close date > today)
            today = datetime.now().date()
            if close_date and close_date <= today:
                logger.info(f"Skipping closed IPO: {name} (closed on {close_date})")
                return None  # Skip closed IPOs
            
            # Parse updated timestamp
            updated_on = self._parse_updated_time(updated_text)
            
            return {
                'name': name,
                'gmp_value': gmp_value,
                'gmp_percentage': gmp_percentage,
                'price': price,
                'ipo_size': ipo_size,
                'lot_size': lot_size,
                'subscription_multiple': subscription_multiple,
                'open_date': open_date,
                'close_date': close_date,
                'updated_on': updated_on,
                'data_source': 'investorgain',
                'is_active': True
            }
            
        except Exception as e:
            logger.error(f"Error parsing IPO row: {e}")
            return None
    
    def _parse_gmp(self, gmp_text):
        """Parse GMP value and percentage from text like '₹60 (12.37%)'"""
        try:
            if not gmp_text or gmp_text == '-':
                return None, None
            
            # Extract value and percentage
            value_match = re.search(r'₹(\d+(?:\.\d+)?)', gmp_text)
            percentage_match = re.search(r'\((\d+(?:\.\d+)?)%\)', gmp_text)
            
            value = float(value_match.group(1)) if value_match else None
            percentage = float(percentage_match.group(1)) if percentage_match else None
            
            return value, percentage
        except:
            return None, None
    
    def _parse_number(self, text):
        """Parse number from text, handling commas and other formatting"""
        try:
            if not text or text == '-':
                return None
            
            # Remove commas and other non-numeric characters except decimal point
            cleaned = re.sub(r'[^\d.]', '', text)
            return float(cleaned) if cleaned else None
        except:
            return None
    
    def _parse_date(self, date_text):
        """Parse date from text like '9-Oct' or '13-Oct'"""
        try:
            if not date_text or date_text == '-':
                return None
            
            # Handle formats like '9-Oct', '13-Oct'
            current_year = datetime.now().year
            
            # Try different date formats
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
        except:
            return None
    
    def _parse_updated_time(self, updated_text):
        """Parse updated timestamp"""
        try:
            if not updated_text:
                return datetime.now()
            
            # Handle formats like '5-Oct 5:55', '5-Oct 6:45'
            current_year = datetime.now().year
            
            try:
                # Try format like '5-Oct 5:55'
                parsed_datetime = datetime.strptime(f"{updated_text} {current_year}", "%d-%b %H:%M %Y")
                return parsed_datetime
            except:
                try:
                    # Try format like '5-Oct 6:45'
                    parsed_datetime = datetime.strptime(f"{updated_text} {current_year}", "%d-%b %H:%M %Y")
                    return parsed_datetime
                except:
                    return datetime.now()
        except:
            return datetime.now()
    
    def save_to_supabase(self, ipo_data):
        """Save IPO data to Supabase"""
        try:
            if not ipo_data:
                logger.info("No IPO data to save")
                return 0
            
            # Clear existing InvestorGain data
            delete_result = self.supabase.table('ipo_investorgain').delete().neq('id', 0).execute()
            logger.info(f"Cleared existing InvestorGain data: {len(delete_result.data)} records")
            
            # Insert new data
            insert_result = self.supabase.table('ipo_investorgain').insert(ipo_data).execute()
            
            logger.info(f"Saved {len(insert_result.data)} IPO records to InvestorGain table")
            return len(insert_result.data)
            
        except Exception as e:
            logger.error(f"Error saving to Supabase: {e}")
            return 0

def scrape_investorgain_data():
    """Main function to scrape InvestorGain data"""
    scraper = InvestorGainScraper()
    
    # Scrape data
    ipo_data = scraper.scrape_ipo_data()
    
    if ipo_data:
        # Save to Supabase
        saved_count = scraper.save_to_supabase(ipo_data)
        logger.info(f"InvestorGain scraping completed: {saved_count} records saved")
        return saved_count
    else:
        logger.warning("No InvestorGain data scraped")
        return 0

if __name__ == "__main__":
    scrape_investorgain_data()
