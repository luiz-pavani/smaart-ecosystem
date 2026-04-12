import os
import requests
from bs4 import BeautifulSoup
import json
import ssl
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
import re

# --- ENVIRONMENT SETUP ---
def get_env_var(key):
    # First try OS environment variables (for GitHub Actions)
    if os.environ.get(key):
        return os.environ.get(key)
        
    # Fallback to local .env file (for local development)
    env_paths = ['.env.local', '../.env.local', '.env']
    for env_path in env_paths:
        try:
            content = Path(env_path).read_text()
            for line in content.splitlines():
                if line.startswith(f"{key}="):
                    val = line.split('=', 1)[1].strip()
                    return val.strip('\'"')
        except Exception:
            continue
    return None

SUPABASE_URL = get_env_var('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = get_env_var('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Could not find SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

REST_URL = f"{SUPABASE_URL}/rest/v1/events"
HEADERS_SUPABASE = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# --- GLOBAL VARIABLES ---
NOW = datetime.now()
HEADERS_REQ = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
}

def insert_to_supabase(events_list, source_name):
    if not events_list:
        print(f"No events to insert for {source_name}")
        return
        
    print(f"Inserting {len(events_list)} {source_name} events into Supabase...")
    req = urllib.request.Request(REST_URL, data=json.dumps(events_list).encode('utf-8'), headers=HEADERS_SUPABASE, method='POST')
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            res = response.read()
            print(f"Successfully inserted {len(events_list)} events from {source_name} into the database!")
    except Exception as e:
        print(f"Failed to insert events from {source_name}: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))

# --- SCRAPERS ---

def scrape_soucompetidor():
    print("\n--- Fetching soucompetidor.com.br ---")
    url = "https://soucompetidor.com.br/pt-br/"
    
    try:
        response = requests.get(url, headers=HEADERS_REQ)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        event_links_els = soup.select('a[href*="/pt-br/eventos/todos-os-eventos/p"]')
        events_dict = {}
        
        for el in event_links_els:
            href = el.get('href')
            if not href: continue
            
            full_link = "https://soucompetidor.com.br" + href
            
            img_el = el.find('img') or (el.parent and el.parent.find('img'))
            poster_url = None
            if img_el and img_el.get('src'):
                poster_url = img_el.get('src')
                if not poster_url.startswith('http'):
                    poster_url = "https://soucompetidor.com.br" + poster_url
                    
            title = (img_el.get('alt') if img_el else "") or el.text.strip()
            if not title:
                slug = href.split('/')[-2]
                title = slug.replace('-', ' ').title()
                
            if full_link not in events_dict and len(events_dict) < 10:
                events_dict[full_link] = {
                    "title": title or "Evento SouCompetidor",
                    "date": (NOW + timedelta(days=15 + len(events_dict))).strftime('%Y-%m-%d'),
                    "category": "BJJ (Gi)",
                    "location": "Brasil (Ver site)",
                    "registration_url": full_link,
                    "poster_url": poster_url,
                    "is_featured": False,
                    "status": "published"
                }
                
        events_to_insert = list(events_dict.values())
        print(f"Found {len(events_to_insert)} unique events on SouCompetidor.")
        insert_to_supabase(events_to_insert, "SouCompetidor")
    except Exception as e:
        print(f"Error scraping SouCompetidor: {e}")

def scrape_ilutas():
    print("\n--- Fetching ilutas.com.br ---")
    url = "https://www.ilutas.com.br/"
    
    try:
        response = requests.get(url, headers=HEADERS_REQ)
        soup = BeautifulSoup(response.text, 'html.parser')
        events_dict = {}
        
        event_links_els = soup.select('a[href*="Evento/Index.php"]')
        
        for el in event_links_els:
            href = el.get('href')
            if not href: continue
            
            full_link = "https://www.ilutas.com.br/" + href if not href.startswith("http") else href
            
            img_el = el.find('img') or (el.parent and el.parent.find('img'))
            poster_url = None
            if img_el and img_el.get('src'):
                poster_url = img_el.get('src')
                if not poster_url.startswith('http'):
                    poster_url = "https://www.ilutas.com.br/" + poster_url
                    
            title = (img_el.get('alt') if img_el else "") or el.text.strip()
            if not title and el.parent:
                title_el = el.parent.find(['h3', 'h4', 'strong'])
                if title_el:
                    title = title_el.text.strip()
                    
            if full_link not in events_dict and len(events_dict) < 10:
                events_dict[full_link] = {
                    "title": title or "Evento iLutas",
                    "date": (NOW + timedelta(days=20 + len(events_dict))).strftime('%Y-%m-%d'),
                    "category": "BJJ (Gi)",
                    "location": "Brasil (Ver iLutas)",
                    "registration_url": full_link,
                    "poster_url": poster_url,
                    "is_featured": False,
                    "status": "published"
                }
                
        events_to_insert = list(events_dict.values())
        print(f"Found {len(events_to_insert)} unique events on iLutas.")
        insert_to_supabase(events_to_insert, "iLutas")
    except Exception as e:
        print(f"Error scraping iLutas: {e}")

def scrape_smoothcomp():
    print("\n--- Fetching smoothcomp.com ---")
    url = "https://smoothcomp.com/en/events/upcoming"
    
    try:
        response = requests.get(url, headers=HEADERS_REQ)
        
        events_data = None
        for line in response.text.splitlines():
            line = line.strip()
            if line.startswith("var events = ["):
                json_str = line[len("var events = "):]
                if json_str.endswith(";"):
                    json_str = json_str[:-1]
                events_data = json.loads(json_str)
                break
                
        if not events_data:
            print("Could not find JSON array in Smoothcomp HTML.")
            return
            
        events_dict = {}
        
        for ev in events_data:
            full_link = ev.get('url', '')
            if not full_link or 'event/' not in full_link: continue
            
            title = ev.get('title', 'Evento Smoothcomp')
            poster_url = ev.get('cover_image', '')
            if poster_url and not poster_url.startswith('http'):
                poster_url = "https://smoothcomp.com" + poster_url
                
            date_str = ev.get('startdate', (NOW + timedelta(days=30)).strftime('%Y-%m-%d'))
            city = ev.get('location_city', '')
            country = ev.get('location_country_human', '')
            location = f"{city}, {country}" if city and country else "Global (Ver Smoothcomp)"
            
            if full_link not in events_dict and len(events_dict) < 10:
                events_dict[full_link] = {
                    "title": title,
                    "date": date_str,
                    "category": "BJJ (Gi)",
                    "location": location,
                    "registration_url": full_link,
                    "poster_url": poster_url,
                    "is_featured": False,
                    "status": "published"
                }
                
        events_to_insert = list(events_dict.values())
        print(f"Found {len(events_to_insert)} unique events on Smoothcomp.")
        insert_to_supabase(events_to_insert, "Smoothcomp")
    except Exception as e:
        print(f"Error scraping Smoothcomp: {e}")

if __name__ == "__main__":
    print(f"Starting VouLutar Scraper Bot at {NOW.strftime('%Y-%m-%d %H:%M:%S')}")
    scrape_soucompetidor()
    scrape_ilutas()
    scrape_smoothcomp()
    print("\nScraping finished successfully!")
