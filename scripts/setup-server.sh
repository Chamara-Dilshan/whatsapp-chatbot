#!/bin/bash
# setup-server.sh — One-command Ubuntu 22.04 server bootstrap
# Run as root (or with sudo) on a fresh VPS:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/whatsapp-chatbot/main/scripts/setup-server.sh | sudo bash
#   — OR —
#   sudo bash scripts/setup-server.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()     { echo -e "${RED}[error]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && err "Please run as root: sudo bash $0"

# ── 1. System update ────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# ── 2. Essential tools ──────────────────────────────────────────────────
info "Installing essential tools..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  git curl wget ca-certificates gnupg lsb-release \
  ufw fail2ban unattended-upgrades certbot

# ── 3. Docker CE ────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  info "Docker already installed: $(docker --version)"
else
  info "Installing Docker CE..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  info "Docker installed: $(docker --version)"
fi

# ── 4. Firewall (UFW) ───────────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP (Let'\''s Encrypt + redirect)'
ufw allow 443/tcp  comment 'HTTPS'
ufw --force enable
info "Firewall rules:"
ufw status numbered

# ── 5. Automatic security updates ──────────────────────────────────────
info "Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades

# ── 6. Fail2ban ─────────────────────────────────────────────────────────
info "Enabling fail2ban (SSH brute-force protection)..."
systemctl enable --now fail2ban

# ── 7. Swap (if < 2 GB RAM — helps on 1 GB VPS) ────────────────────────
TOTAL_MEM=$(awk '/MemTotal/ { print $2 }' /proc/meminfo)
if [[ $TOTAL_MEM -lt 2000000 && ! -f /swapfile ]]; then
  info "Low RAM detected — creating 2 GB swapfile..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── Done ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Server setup complete!                               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Clone the repo:"
echo "       git clone https://github.com/YOUR_ORG/whatsapp-chatbot /opt/whatsapp-chatbot"
echo "       cd /opt/whatsapp-chatbot"
echo ""
echo "  2. Configure secrets:"
echo "       cp .env.production.example .env.production"
echo "       nano .env.production   # fill in all required values"
echo "       chmod 600 .env.production"
echo ""
echo "  3. Set your domain in nginx.conf and get SSL:"
echo "       bash scripts/init-ssl.sh"
echo ""
echo "  4. Start all containers:"
echo "       docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
echo ""
echo "  5. Verify:"
echo "       docker compose -f docker-compose.prod.yml ps"
echo "       curl -sf https://YOUR_DOMAIN/health"
