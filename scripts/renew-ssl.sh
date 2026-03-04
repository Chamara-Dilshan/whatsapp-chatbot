#!/bin/bash
# renew-ssl.sh — Certbot renewal deploy hook
# Called automatically by certbot after a successful cert renewal.
# Also installed at: /etc/letsencrypt/renewal-hooks/deploy/whatsapp-chatbot.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${REPO_DIR}/.env.production"
CERTS_DIR="${REPO_DIR}/nginx/certs"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[renew-ssl]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}     $*"; }

# Load DOMAIN
DOMAIN=$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2 | tr -d '"' | tr -d "'")

if [[ -z "$DOMAIN" ]]; then
  warn "DOMAIN not found in .env.production — skipping cert copy."
  exit 0
fi

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"

if [[ ! -f "${CERT_PATH}/fullchain.pem" ]]; then
  warn "Certificate not found at ${CERT_PATH} — skipping."
  exit 0
fi

# ── Copy renewed certs ──────────────────────────────────────────────────
info "Copying renewed certificates for ${DOMAIN}..."
mkdir -p "$CERTS_DIR"
cp "${CERT_PATH}/fullchain.pem" "${CERTS_DIR}/fullchain.pem"
cp "${CERT_PATH}/privkey.pem"   "${CERTS_DIR}/privkey.pem"
chmod 644 "${CERTS_DIR}/fullchain.pem"
chmod 600 "${CERTS_DIR}/privkey.pem"

# ── Reload nginx (no downtime) ──────────────────────────────────────────
info "Reloading nginx..."
docker compose -f "${REPO_DIR}/docker-compose.prod.yml" --env-file "${ENV_FILE}" \
  exec -T nginx nginx -s reload

info "Done. New cert expires: $(openssl x509 -enddate -noout -in ${CERTS_DIR}/fullchain.pem | cut -d= -f2)"
