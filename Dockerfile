# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and Prisma files
COPY tsconfig.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma Client and compiled assets from build stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/generated ./src/generated
COPY --from=builder /usr/src/app/prisma ./prisma

# Expose server port
EXPOSE 5000

# Start server (run pending database migrations first)
CMD npx prisma migrate deploy && node dist/server.js
