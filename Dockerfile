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

# Replace default nginx config properly
RUN rm /etc/nginx/conf.d/default.conf
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
  listen 3000;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files \$uri /index.html;
  }

  proxy_http_version 1.1;
  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection "upgrade";
}
EOF

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
