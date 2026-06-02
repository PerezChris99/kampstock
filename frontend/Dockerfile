# ────────────────────────────────────────────────────────────────
# Stage 1: build
# ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ────────────────────────────────────────────────────────────────
# Stage 2: serve with nginx
# ────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config and copy our SPA config
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
