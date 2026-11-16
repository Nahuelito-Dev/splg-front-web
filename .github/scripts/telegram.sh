#!/usr/bin/env bash
# Manda a Telegram el texto (HTML de Telegram: <b>, <i>, <a>, <code>) que recibe por la entrada
# estándar. Sin TELEGRAM_BOT_TOKEN no hace nada: un aviso nunca rompe un workflow.
#
#   printf '%s' "$texto" | .github/scripts/telegram.sh
#
# `escapar` (más abajo) se usa al armar el texto con datos que no controlamos (títulos de
# commits, nombres de ramas): `. .github/scripts/telegram.sh --funciones`.
escapar() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

[ "${1:-}" = "--funciones" ] && return 0 2>/dev/null

[ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || { echo "Sin Telegram: no se avisa."; exit 0; }
texto=$(cat)
curl -s -m 20 -o /dev/null "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=${texto}" \
  -d parse_mode=HTML -d disable_web_page_preview=true || true
