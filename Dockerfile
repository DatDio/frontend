# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build production (không SSR)
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

# Install serve globally
RUN npm install -g serve

EXPOSE 4000

ENV NODE_ENV=production

# Serve static files
CMD ["serve", "-s", "dist/mailshop-fe/browser", "-l", "4000"]
