# ────────────────────────────────────────────────────────────────
# Stage 1: build
# ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
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
FROM node:22-alpine AS production
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

# Run migrations then start the server
CMD ["node", "dist/main"]
