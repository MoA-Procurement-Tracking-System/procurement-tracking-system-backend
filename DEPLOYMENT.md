# Production Deployment Guide

This guide outlines the steps required to deploy the **Ministry of Agriculture (MoA) Procurement Tracking System Backend** to a production environment.

---

## 📋 Table of Contents
1. [Environment Variables](#1-environment-variables)
2. [Option A: Render Deployment (Easiest & Recommended)](#option-a-render-deployment-easiest--recommended)
3. [Option B: Docker Compose Deployment](#option-b-docker-compose-deployment)
4. [Option C: PM2 & Nginx Deployment (Ubuntu VPS)](#option-c-pm2--nginx-deployment-ubuntu-vps)
5. [Database Migrations & Maintenance](#5-database-migrations--maintenance)
6. [Automated Backups](#6-automated-backups)
7. [Troubleshooting & Logs](#7-troubleshooting--logs)

---

## 1. Environment Variables
Before deploying, prepare the environment variables. On PaaS providers like Render, you will define these in the dashboard configuration; on Linux servers, you will save them in a `.env` file:

```env
# Node Environment
NODE_ENV=production
PORT=5000

# Database URL
DATABASE_URL="postgresql://postgres:your-strong-password@localhost:5432/procurement?schema=public"

# Redis Cache URL
REDIS_URL="redis://localhost:6379"

# Security Configurations
# Generate strong 64-character hex strings for secrets
JWT_ACCESS_SECRET="your-super-secret-jwt-access-key"
JWT_REFRESH_SECRET="your-super-secret-jwt-refresh-key"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
SESSION_COOKIE_NAME="moa_session"
SESSION_HOURS=8
REMEMBER_SESSION_DAYS=30

# CORS & URLs
FRONTEND_URL="https://procurement.moa.gov.et"
CORS_ORIGIN="https://procurement.moa.gov.et"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Email Delivery Configuration (SMTP or MailerSend)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
SMTP_FROM='"MoA Procurement Tracking System" <your-email@gmail.com>'

# Webhook Integrations (Optional)
PASSWORD_RESET_WEBHOOK_URL="https://procurement.moa.gov.et/reset-password"
USER_INVITATION_WEBHOOK_URL="https://procurement.moa.gov.et/accept-invitation"

# Bootstrap Administrator
BOOTSTRAP_ADMIN_EMAIL="admin@moa.gov.et"
BOOTSTRAP_ADMIN_NAME="System Administrator"
BOOTSTRAP_ADMIN_PASSWORD="ChooseAStrongAdminPasswordHere"

# Backup Configuration
BACKUP_ENABLED=true
# Optional remote share path (NFS/RSYNC mount)
BACKUP_REMOTE_PATH="/mnt/backups/procurement"
```

---

## Option A: Render Deployment (Easiest & Recommended)
Render allows you to host your Database, Redis, and Web Service directly.

### Step 1: Create a PostgreSQL Database on Render
1. Go to the **Render Dashboard**.
2. Click **New +** -> **PostgreSQL**.
3. Fill in the details:
   * **Name:** `procurement-db`
   * **Database:** `procurement`
   * **Username:** `postgres`
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (for backend running on Render) or **External Database URL** (if you need access from your local machine).

### Step 2: Create a Redis Instance on Render
1. Click **New +** -> **Redis**.
2. Fill in the details:
   * **Name:** `procurement-redis`
3. Click **Create Redis**.
4. Once active, copy the **Internal Redis URL**.

### Step 3: Deploy the Backend Web Service
1. Push your latest code changes to your GitHub repository.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Fill in the configurations:
   * **Name:** `procurement-backend`
   * **Region:** (Choose the same region as your Database/Redis)
   * **Branch:** `main` (or your active branch)
   * **Runtime:** Select **Docker** (Render will automatically detect your `Dockerfile`).
5. Click **Advanced** and add the following Environment Variables:
   * `DATABASE_URL`: (Paste the **Internal Database URL** from Step 1)
   * `REDIS_URL`: (Paste the **Internal Redis URL** from Step 2)
   * `NODE_ENV`: `production`
   * `JWT_ACCESS_SECRET`: (Generate a strong 64-char key)
   * `JWT_REFRESH_SECRET`: (Generate a strong 64-char key)
   * `BOOTSTRAP_ADMIN_EMAIL`: `admin@moa.gov.et`
   * `BOOTSTRAP_ADMIN_NAME`: `System Administrator`
   * `BOOTSTRAP_ADMIN_PASSWORD`: (Choose a strong password)
   * `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`: (For emails)
   * `FRONTEND_URL` / `CORS_ORIGIN`: (Your frontend domain URL)
6. Click **Create Web Service**.

> [!NOTE]
> Render will automatically build the container using the Dockerfile, run `prisma migrate deploy` to set up the database tables, bootstrap the admin user, and start the application!

---

## Option B: Docker Compose Deployment
This method runs the Backend, PostgreSQL, and Redis in isolated containers on a single Linux server.

### Step 1: Create a Production `docker-compose.prod.yml`
Create a file named `docker-compose.prod.yml` in the project root:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: procurement-app
    restart: always
    ports:
      - '5000:5000'
    env_file:
      - .env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:17-alpine
    container_name: procurement-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-strong-password
      POSTGRES_DB: procurement
    ports:
      - '5432:5432'
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: procurement-redis
    restart: always
    ports:
      - '6379:6379'
    volumes:
      - redis_prod_data:/data

volumes:
  postgres_prod_data:
  redis_prod_data:
```

### Step 2: Build and Run
Start all services in background daemon mode:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Option C: PM2 & Nginx Deployment (Ubuntu VPS)
Use this option to run the server directly on an Ubuntu/Linux machine.

### Step 1: Install Dependencies
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js, Redis, and PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs redis-server postgresql postgresql-contrib nginx

# Install PM2 globally
sudo npm install -p pm2 -g
```

### Step 2: Configure PostgreSQL Database
Log in as postgres superuser and create the production database:
```bash
sudo -u postgres psql

# Run inside SQL console:
CREATE DATABASE procurement;
ALTER USER postgres WITH PASSWORD 'your-strong-password';
\q
```

### Step 3: Clone, Install and Build
Navigate to the directory where the app is cloned:
```bash
# Install production dependencies and compile TypeScript
npm ci
npm run build
```

### Step 4: Run Database Migrations
Apply all schema migrations to the production database:
```bash
npx prisma migrate deploy
```

### Step 5: Start Backend with PM2
Launch the backend application and configure it to automatically restart on reboot:
```bash
pm2 start dist/server.js --name "procurement-backend"
pm2 save
pm2 startup
```

### Step 6: Configure Nginx Reverse Proxy
Edit the Nginx default config:
```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the content with the following:
```nginx
server {
    listen 80;
    server_name procurement.moa.gov.et;

    # Backend API Proxy
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Database Migrations & Maintenance
Whenever you pull new code with database changes, follow these rules:

* **DO NOT** run `prisma migrate dev` on production. It will prompt to reset the database and cause complete data loss.
* **DO** run `npx prisma migrate deploy`. It applies pending migrations safely and incrementally.

```bash
# To check if migration is needed:
npx prisma migrate status

# To apply pending migrations:
npx prisma migrate deploy
```

---

## 6. Automated Backups
The database backup script is located in `scripts/backup-db.sh`. It automatically compresses database backups, keeps logs, and prunes files older than 7 days.

### Schedule Daily Backups (Nginx/Ubuntu VPS)
Configure a Cron job for the `postgres` system user:
```bash
# Open crontab for postgres user
sudo -u postgres crontab -e
```
Add the following line to back up the database daily at 02:00 AM:
```bash
0 2 * * * /bin/bash /path/to/procurement-tracking-system-backend/scripts/backup-db.sh >> /var/log/procurement-backup.log 2>&1
```

---

## 7. Troubleshooting & Logs

### Viewing Logs (Docker Compose)
```bash
# View backend application logs
docker logs -f procurement-app

# View database logs
docker logs -f procurement-postgres
```

### Viewing Logs (PM2)
```bash
# View all logs
pm2 logs procurement-backend

# Restart server
pm2 restart procurement-backend
```

### Common Errors:
* **`P1000` (Authentication failed):** Double check the username and password inside your `.env` `DATABASE_URL` matches your PostgreSQL database credentials.
* **`ECONNREFUSED`:** Confirm that Redis and PostgreSQL services are running (`sudo systemctl status redis` or `docker ps`).
