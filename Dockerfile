# ==================== BUILD STAGE ====================
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ==================== PRODUCTION STAGE ====================
FROM nginx:stable-alpine AS runner

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Support SPA routing (React Router)
  location / {
    try_files \$uri /index.html;
  }

  # Ensure WebSocket upgrade headers are passed through
  proxy_http_version 1.1;
  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection "upgrade";
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
