import requests
from bs4 import BeautifulSoup
import logging
from datetime import datetime, timedelta
import re
from models import IPO
from app import db

logger = logging.getLogger(__name__)

class IPOScraper:
    """Class to scrape IPO GMP data from ipowatch.in"""
    
    def __init__(self):
        self.base_url = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def scrape_ipo_data(self):
        """Scrape IPO data from the website"""
        try:
            logger.info("Starting IPO data scraping...")
            response = requests.get(self.base_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find the IPO data table
            tables = soup.find_all('table')
            ipo_data = []
            
            for table in tables:
                rows = table.find_all('tr')
                if len(rows) > 1:  # Has header and data rows
                    headers = [th.get_text(strip=True) for th in rows[0].find_all(['th', 'td'])]
                    
                    # Check if this looks like an IPO table
                    if any('ipo' in header.lower() or 'gmp' in header.lower() for header in headers):
                        for row in rows[1:]:
                            cells = row.find_all(['td', 'th'])
                            if len(cells) >= 4:  # Minimum columns expected
                                ipo_info = self._parse_ipo_row(cells)
                                if ipo_info:
                                    ipo_data.append(ipo_info)
            
            logger.info(f"Scraped {len(ipo_data)} IPO records")
            return ipo_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching IPO data: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing IPO data: {e}")
            return []
    
    def _parse_ipo_row(self, cells):
        """Parse a single IPO row from the table"""
        try:
            # Extract text from cells
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            
            # Basic validation - need at least IPO name
            if not cell_texts[0] or len(cell_texts[0]) < 3:
                return None
            
            ipo_info = {
                'name': cell_texts[0],
                'gmp_value': None,
                'gmp_percentage': None,
                'issue_price': None,
                'open_date': None,
                'close_date': None,
                'subscription_status': None
            }
            
            # Try to extract GMP information from various cells
            for i, text in enumerate(cell_texts[1:], 1):
                # Look for GMP value (₹ symbol or numbers with %)
                if '₹' in text or 'Rs' in text:
                    gmp_match = re.search(r'[\d,]+', text.replace('₹', '').replace('Rs', '').replace(',', ''))
                    if gmp_match:
                        try:
                            ipo_info['gmp_value'] = float(gmp_match.group())
                        except ValueError:
                            pass
                
                # Look for percentage
                if '%' in text:
                    perc_match = re.search(r'([\d.]+)%', text)
                    if perc_match:
                        try:
                            ipo_info['gmp_percentage'] = float(perc_match.group(1))
                        except ValueError:
                            pass
                
                # Look for issue price
                if 'price' in text.lower() or (i == 1 and '₹' in text):
                    price_match = re.search(r'[\d,]+', text.replace('₹', '').replace('Rs', '').replace(',', ''))
                    if price_match:
                        try:
                            ipo_info['issue_price'] = float(price_match.group())
                        except ValueError:
                            pass
                
                # Look for dates
                date_patterns = [
                    r'\d{1,2}[/-]\d{1,2}[/-]\d{4}',
                    r'\d{1,2}\s+\w+\s+\d{4}',
                    r'\w+\s+\d{1,2},?\s+\d{4}'
                ]
                
                for pattern in date_patterns:
                    if re.search(pattern, text):
                        parsed_date = self._parse_date(text)
                        if parsed_date:
                            if 'open' in text.lower() or i == 2:
                                ipo_info['open_date'] = parsed_date
                            elif 'close' in text.lower() or i == 3:
                                ipo_info['close_date'] = parsed_date
                
                # Look for subscription status
                if any(word in text.lower() for word in ['times', 'subscribed', 'subscription']):
                    ipo_info['subscription_status'] = text
            
            return ipo_info
            
        except Exception as e:
            logger.error(f"Error parsing IPO row: {e}")
            return None
    
    def _parse_date(self, date_str):
        """Parse date string into datetime object"""
        try:
            # Common date formats
            formats = [
                '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%m-%d-%Y',
                '%d %B %Y', '%d %b %Y', '%B %d, %Y', '%b %d, %Y'
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(date_str.strip(), fmt)
                except ValueError:
                    continue
            
            return None
        except Exception:
            return None
    
    def update_database(self, ipo_data):
        """Update database with scraped IPO data"""
        try:
            updated_count = 0
            new_count = 0
            
            for ipo_info in ipo_data:
                # Check if IPO already exists
                existing_ipo = IPO.query.filter_by(name=ipo_info['name']).first()
                
                if existing_ipo:
                    # Update existing IPO
                    for key, value in ipo_info.items():
                        if value is not None:
                            setattr(existing_ipo, key, value)
                    existing_ipo.last_updated = datetime.utcnow()
                    updated_count += 1
                else:
                    # Create new IPO
                    new_ipo = IPO(**ipo_info)
                    db.session.add(new_ipo)
                    new_count += 1
            
            db.session.commit()
            logger.info(f"Database updated: {new_count} new IPOs, {updated_count} updated")
            
            return {'new': new_count, 'updated': updated_count}
            
        except Exception as e:
            logger.error(f"Error updating database: {e}")
            db.session.rollback()
            return {'new': 0, 'updated': 0}

def scrape_and_update():
    """Main function to scrape and update IPO data"""
    scraper = IPOScraper()
    ipo_data = scraper.scrape_ipo_data()
    
    if ipo_data:
        result = scraper.update_database(ipo_data)
        return result
    else:
        logger.warning("No IPO data scraped")
        return {'new': 0, 'updated': 0}
