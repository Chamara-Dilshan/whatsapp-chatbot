#!/bin/bash
# Zero-downtime deployment script for Single VPS
# Usage: bash scripts/deploy.sh

set -e

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Build and restart API (zero-downtime rolling)
echo "📦 Building API..."
docker compose -f docker-compose.prod.yml --env-file .env.production build api

echo "🔄 Restarting API..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api

# Build and restart Dashboard
echo "📦 Building Dashboard..."
docker compose -f docker-compose.prod.yml --env-file .env.production build dashboard

echo "🔄 Restarting Dashboard..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps dashboard

echo "🧹 Cleaning old images..."
docker image prune -f

echo "✅ Deployment complete!"
echo ""
echo "Service status:"
docker compose -f docker-compose.prod.yml ps
