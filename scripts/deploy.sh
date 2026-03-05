#!/bin/bash

# =============================================================================
# Salen Hocam - VPS Deployment Script
# =============================================================================
# This script deploys the application to a VPS server
# Usage: ./scripts/deploy.sh [environment]
# Example: ./scripts/deploy.sh production

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="salen_hocam"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Salen Hocam - VPS Deployment Script${NC}"
echo -e "${GREEN}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file from .env.example"
    exit 1
fi

# Check if required environment variables are set
source .env

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change-me-to-a-very-long-random-secret-in-production" ]; then
    echo -e "${RED}Error: JWT_SECRET not set properly in .env${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"

echo -e "${YELLOW}[2/6] Stopping existing containers...${NC}"
docker-compose -p ${PROJECT_NAME} down || true

echo -e "${YELLOW}[3/6] Building Docker images...${NC}"
docker-compose -p ${PROJECT_NAME} build --no-cache

echo -e "${YELLOW}[4/6] Starting services...${NC}"
docker-compose -p ${PROJECT_NAME} up -d

echo -e "${YELLOW}[5/6] Waiting for services to be healthy...${NC}"
sleep 10

# Wait for backend health check
MAX_RETRIES=30
RETRY_COUNT=0
until docker-compose -p ${PROJECT_NAME} ps backend | grep -q "healthy" || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
    echo "Waiting for backend to be healthy... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Error: Backend service failed to become healthy${NC}"
    docker-compose -p ${PROJECT_NAME} logs backend
    exit 1
fi

echo -e "${GREEN}✓ Backend service is healthy${NC}"

echo -e "${YELLOW}[6/6] Running database migrations...${NC}"
# Check if migrations need to be run
BACKEND_PORT=${BACKEND_PORT:-3001}
if curl -s http://localhost:${BACKEND_PORT}/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Database is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Running migrations manually...${NC}"
    docker-compose -p ${PROJECT_NAME} exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-salen_hocam} < migrations/001_init.sql || echo "Migrations already applied"
fi

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deployment Successful! 🎉${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Backend API: http://localhost:${BACKEND_PORT}"
echo -e "Health Check: http://localhost:${BACKEND_PORT}/health"
echo ""
echo -e "To view logs: docker-compose -p ${PROJECT_NAME} logs -f"
echo -e "To stop: docker-compose -p ${PROJECT_NAME} down"
echo ""
