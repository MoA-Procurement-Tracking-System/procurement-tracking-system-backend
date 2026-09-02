# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy package files and prisma schema for postinstall script
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/

# Install production-only dependencies (skip postinstall/prisma generate — already done in builder)
RUN npm ci --omit=dev --ignore-scripts

# Copy generated Prisma Client and compiled assets from build stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/generated ./src/generated

# Expose server port
EXPOSE 5000

# Start server (resolve any failed migrations, then apply pending ones, then start)
CMD npx prisma migrate resolve --rolled-back 20260825191228_add_pending_invitation_status 2>/dev/null || true && npx prisma migrate deploy && node dist/server.js
