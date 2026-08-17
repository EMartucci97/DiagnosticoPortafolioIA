#!/bin/bash
# Deploy nocturno automático — Ruarte Reports

LOG="/Users/martuccienzo/Desktop/landings-ruarte-prod/deploy.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "" >> "$LOG"
echo "=== Deploy $DATE ===" >> "$LOG"

# API + landing
echo "[1/2] Deployando API/landing..." >> "$LOG"
/opt/homebrew/bin/vercel --prod --cwd /Users/martuccienzo/Desktop/landings-ruarte-prod --yes 2>&1 | tail -5 >> "$LOG"

# Panel admin
echo "[2/2] Deployando panel admin..." >> "$LOG"
/opt/homebrew/bin/vercel --prod /Users/martuccienzo/Desktop/admin-diagnostico --yes 2>&1 | tail -5 >> "$LOG"

echo "=== Fin ===" >> "$LOG"
