import os
import time
import requests
from bs4 import BeautifulSoup
import json
import ssl
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
import re

MONTHS_PT = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5,
    'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10,
    'novembro': 11, 'dezembro': 12,
}

def parse_pt_date(s):
    """Parse '12 de Abril de 2026' → '2026-04-12'. Returns None on failure."""
    if not s:
        return None
    m = re.search(r'(\d{1,2})\s+de\s+([A-Za-zçÇ]+)\s+de\s+(\d{4})', s, re.IGNORECASE)
    if not m:
        return None
    day, month_name, year = m.group(1), m.group(2).lower(), m.group(3)
    month = MONTHS_PT.get(month_name)
    if not month:
        return None
    return f"{year}-{month:02d}-{int(day):02d}"

def clean_soucompetidor_title(raw):
    """Strip 'P2647-' prefix and ' - EDICAO/ETAPA/ANO' suffix; title case."""
    if not raw:
        return raw
    t = re.sub(r'^P\d+\s*[-–]\s*', '', raw.strip())
    t = re.sub(r'\s*[-–]\s*(EDICAO|EDIÇÃO|ETAPA|ANO)\s*$', '', t, flags=re.IGNORECASE)
    return t.strip()

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

missing = [k for k, v in [('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL), ('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_KEY)] if not v]
if missing:
    print(f"ERROR: Missing required environment variable(s): {', '.join(missing)}")
    print("In GitHub Actions, set these as repository secrets at Settings → Secrets and variables → Actions.")
    exit(1)

REST_URL = f"{SUPABASE_URL}/rest/v1/events?on_conflict=registration_url"
HEADERS_SUPABASE = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=representation'
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

def enrich_soucompetidor(full_link):
    """Fetch individual SouCompetidor event page for real title + cidade/UF + date."""
    try:
        r = requests.get(full_link, headers=HEADERS_REQ, timeout=15)
        r.encoding = r.apparent_encoding or 'utf-8'
        s = BeautifulSoup(r.text, 'html.parser')

        og = s.find('meta', attrs={'property': 'og:title'})
        raw_title = (og.get('content').strip() if og and og.get('content') else '')
        title = clean_soucompetidor_title(raw_title)

        text = s.get_text('\n', strip=True)
        # City/UF pattern: "GRAVATAI - RS"
        city_uf = None
        for line in text.split('\n'):
            m = re.match(r'^([A-ZÀ-Ú][A-ZÀ-Ú\s\.\-]{2,})\s*[-–]\s*([A-Z]{2})$', line.strip())
            if m:
                city = m.group(1).strip().title().replace("'S", "'s")
                city_uf = f"{city} - {m.group(2)}"
                break

        date_iso = parse_pt_date(text)
        return title, city_uf, date_iso
    except Exception as e:
        print(f"  enrich_soucompetidor error for {full_link}: {e}")
        return None, None, None

def scrape_soucompetidor():
    print("\n--- Fetching soucompetidor.com.br ---")
    url = "https://soucompetidor.com.br/pt-br/"

    try:
        response = requests.get(url, headers=HEADERS_REQ)
        response.encoding = response.apparent_encoding or 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')

        event_links_els = soup.select('a[href*="/pt-br/eventos/todos-os-eventos/p"]')
        events_dict = {}

        for el in event_links_els:
            href = el.get('href')
            if not href:
                continue
            full_link = "https://soucompetidor.com.br" + href
            if full_link in events_dict:
                continue
            if len(events_dict) >= 20:
                break

            img_el = el.find('img') or (el.parent and el.parent.find('img'))
            poster_url = None
            if img_el and img_el.get('src'):
                poster_url = img_el.get('src')
                if not poster_url.startswith('http'):
                    poster_url = "https://soucompetidor.com.br" + poster_url

            fallback_title = (img_el.get('alt') if img_el else "") or el.text.strip()
            fallback_title = clean_soucompetidor_title(fallback_title) or "Evento SouCompetidor"

            # Enrich from individual page
            real_title, city_uf, date_iso = enrich_soucompetidor(full_link)
            time.sleep(0.5)  # be polite

            events_dict[full_link] = {
                "title": real_title or fallback_title,
                "date": date_iso or (NOW + timedelta(days=15 + len(events_dict))).strftime('%Y-%m-%d'),
                "category": "BJJ (Gi)",
                "location": city_uf or "Local a definir",
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

def enrich_ilutas(full_link):
    """Fetch individual iLutas event page for real title + cidade/UF + date."""
    try:
        r = requests.get(full_link, headers=HEADERS_REQ, timeout=15)
        r.encoding = r.apparent_encoding or 'utf-8'
        s = BeautifulSoup(r.text, 'html.parser')

        og = s.find('meta', attrs={'property': 'og:title'})
        title = (og.get('content').strip() if og and og.get('content') else None)

        text = s.get_text('\n', strip=True)
        # City/UF appears alone on a line like "São Miguel do Oeste/SC"
        city_uf = None
        for line in text.split('\n'):
            line = line.strip()
            # Max 60 chars, must be city name + /UF, no digits, no pipes, no path separators beyond the one /UF
            if len(line) < 3 or len(line) > 60:
                continue
            if re.search(r'\d', line):
                continue
            m = re.fullmatch(r'([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\.\'\-]+?)/([A-Z]{2})', line)
            if m:
                city_uf = f"{m.group(1).strip()}/{m.group(2)}"
                break

        date_iso = parse_pt_date(text)
        return title, city_uf, date_iso
    except Exception as e:
        print(f"  enrich_ilutas error for {full_link}: {e}")
        return None, None, None

def scrape_ilutas():
    print("\n--- Fetching ilutas.com.br ---")
    url = "https://www.ilutas.com.br/"

    try:
        response = requests.get(url, headers=HEADERS_REQ)
        response.encoding = response.apparent_encoding or 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        events_dict = {}

        event_links_els = soup.select('a[href*="Evento/Index.php"]')

        for el in event_links_els:
            href = el.get('href')
            if not href:
                continue
            full_link = "https://www.ilutas.com.br/" + href if not href.startswith("http") else href
            if full_link in events_dict:
                continue
            if len(events_dict) >= 20:
                break

            img_el = el.find('img') or (el.parent and el.parent.find('img'))
            poster_url = None
            if img_el and img_el.get('src'):
                poster_url = img_el.get('src')
                if not poster_url.startswith('http'):
                    poster_url = "https://www.ilutas.com.br/" + poster_url

            # Enrich from individual page (title + city/UF + date)
            real_title, city_uf, date_iso = enrich_ilutas(full_link)
            time.sleep(0.5)

            events_dict[full_link] = {
                "title": real_title or "Evento iLutas",
                "date": date_iso or (NOW + timedelta(days=20 + len(events_dict))).strftime('%Y-%m-%d'),
                "category": "BJJ (Gi)",
                "location": city_uf or "Local a definir",
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
            location = f"{city}, {country}" if city and country else (country or city or "Local a definir")
            
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
