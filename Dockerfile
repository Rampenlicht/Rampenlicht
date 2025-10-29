# Multi-Stage Dockerfile für Coolify/Railway
# Optimiert für Vite + React SPA

# ==================== BUILD STAGE ====================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# ==================== PRODUCTION STAGE ====================
FROM node:22-alpine AS runner

WORKDIR /app

# Install serve globally
RUN npm install -g serve@14.2.3

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port (Coolify/Railway will use PORT env variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app with serve
# -s = Single Page Application mode (wichtig für React Router!)
# -l = Listen port (verwendet PORT env variable)
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]

