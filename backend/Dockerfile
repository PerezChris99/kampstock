# ────────────────────────────────────────────────────────────────
# Stage 1: build
# ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

# Copy package files and install ALL deps (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy Prisma schema(s) and generate client
COPY prisma ./prisma
COPY prisma-pg ./prisma-pg
RUN npx prisma generate --schema=./prisma-pg/schema.prisma

# Build TypeScript
COPY . .
RUN npm run build

# ────────────────────────────────────────────────────────────────
# Stage 2: production image
# ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma-pg ./prisma-pg

# Non-root user for security
RUN addgroup -S kampstock && adduser -S kampstock -G kampstock
USER kampstock

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health/ready', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Run migrations then start the server
CMD ["node", "dist/main"]
