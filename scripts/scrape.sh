#!/bin/bash
# Scrape Los Gatos planning pages and update local data
# Run via cron every 4 hours: 0 */4 * * * /Users/aronreyes/Downloads/los-gatos-leads/scripts/scrape.sh

APP_URL="${LG_LEADS_URL:-http://localhost:3000}"
SECRET="${SCRAPE_SECRET:-}"
LOG="/Users/aronreyes/Downloads/los-gatos-leads/scripts/scrape.log"

ENDPOINT="$APP_URL/api/scrape"
if [ -n "$SECRET" ]; then
  ENDPOINT="$ENDPOINT?secret=$SECRET"
fi

echo "[$(date)] Scraping..." >> "$LOG"
RESULT=$(curl -s --max-time 120 "$ENDPOINT")
echo "[$(date)] $RESULT" >> "$LOG"
