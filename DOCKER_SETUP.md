# 🐳 Docker Setup für Rampenlicht App

Diese Anleitung erklärt, wie Sie die Rampenlicht App mit Docker und Docker Compose ausführen - **mit vollem WebSocket-Support**!

## 📋 Voraussetzungen

- Docker installiert ([Installation](https://docs.docker.com/get-docker/))
- Docker Compose installiert (meist bereits in Docker Desktop enthalten)
- Supabase-Projekt mit URL und Anon Key

---

## 🚀 Schnellstart

### 1️⃣ Environment Variables erstellen

Erstellen Sie eine `.env` Datei im Projektverzeichnis:

```bash
# Erstellen Sie die .env Datei
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_ENABLE_REALTIME=true
EOF
```

**Wichtig:** Ersetzen Sie die Werte mit Ihren echten Supabase-Daten!

### 2️⃣ App starten

#### **Development Mode (mit Hot Reload):**
```bash
docker-compose --profile dev up
```

Die App läuft dann auf: **http://localhost:5173**

#### **Production Mode (optimiert):**
```bash
docker-compose --profile prod up
```

Die App läuft dann auf: **http://localhost:3000**

#### **Mit Nginx Reverse Proxy:**
```bash
docker-compose --profile nginx --profile prod up
```

Die App läuft dann auf: **http://localhost:80**

---

## 📦 Verfügbare Services

### 1. **Dev Service** (Development)
- **Port:** 5173
- **Features:**
  - ✅ Hot Module Reload (HMR)
  - ✅ WebSocket-Support
  - ✅ Source Maps
  - ✅ Live-Entwicklung

**Starten:**
```bash
docker-compose --profile dev up
```

**Logs anschauen:**
```bash
docker-compose --profile dev logs -f dev
```

**Stoppen:**
```bash
docker-compose --profile dev down
```

---

### 2. **App Service** (Production)
- **Port:** 3000
- **Features:**
  - ✅ Optimierter Build
  - ✅ Nginx Web Server
  - ✅ Gzip Kompression
  - ✅ Static Asset Caching
  - ✅ WebSocket-Support

**Starten:**
```bash
docker-compose --profile prod up -d
```

**Logs anschauen:**
```bash
docker-compose --profile prod logs -f app
```

**Stoppen:**
```bash
docker-compose --profile prod down
```

---

### 3. **Nginx Service** (Reverse Proxy)
- **Port:** 80, 443 (HTTPS)
- **Features:**
  - ✅ WebSocket-Proxying
  - ✅ SSL/TLS Support
  - ✅ Load Balancing
  - ✅ Security Headers
  - ✅ Gzip Kompression

**Starten:**
```bash
docker-compose --profile nginx --profile prod up -d
```

---

## 🔧 Erweiterte Konfiguration

### Build neu erstellen

Nach Code-Änderungen:

```bash
# Development
docker-compose --profile dev up --build

# Production
docker-compose --profile prod up --build
```

### Container neu starten

```bash
docker-compose --profile prod restart
```

### Alle Container stoppen und entfernen

```bash
docker-compose down --remove-orphans
```

### Volumes löschen (kompletter Reset)

```bash
docker-compose down -v
```

---

## 🌐 WebSocket-Konfiguration

### Warum funktionieren WebSockets mit Docker?

Docker-Container haben **volle Netzwerk-Kontrolle** und können:
- ✅ WebSocket-Verbindungen aufbauen
- ✅ Lange laufende Connections halten
- ✅ Realtime-Updates empfangen

Im Gegensatz zu Netlify, das nur statische Dateien hostet!

### Nginx WebSocket-Proxying

Die `nginx.conf` enthält bereits WebSocket-Support:

```nginx
location ~ ^/realtime/v1 {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    # Lange Timeouts für WebSockets
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

---

## 🐛 Debugging

### Logs anschauen

**Alle Services:**
```bash
docker-compose logs -f
```

**Nur ein Service:**
```bash
docker-compose logs -f app
docker-compose logs -f dev
docker-compose logs -f nginx
```

### In Container einsteigen

```bash
# Development Container
docker exec -it rampenlicht-dev sh

# Production Container
docker exec -it rampenlicht-app sh
```

### WebSocket-Verbindung testen

Im Browser-Console (F12):
```javascript
// Sollte "SUBSCRIBED" zeigen
console.log('Realtime Status:', supabase.channel('test').subscribe());
```

---

## 📊 Health Checks

### App Health Check

```bash
curl http://localhost:3000/health
# Sollte "healthy" zurückgeben
```

### Docker Health Status

```bash
docker ps
# Sollte "healthy" in STATUS zeigen
```

---

## 🔒 SSL/HTTPS Setup (Optional)

### 1. SSL-Zertifikate generieren

**Für Entwicklung (Self-Signed):**
```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=DE/ST=State/L=City/O=Organization/CN=localhost"
```

**Für Production (Let's Encrypt):**
Verwenden Sie Certbot oder Ihre Domain-Konfiguration.

### 2. Nginx-Konfiguration anpassen

Uncomment den HTTPS-Server-Block in `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest der Konfiguration
}
```

### 3. Service neu starten

```bash
docker-compose --profile nginx --profile prod up -d
```

---

## 🚢 Production Deployment

### Deployment-Optionen:

#### 1. **Docker auf eigenem Server**
```bash
# Auf dem Server
git clone your-repo
cd rampenlicht
cp .env.example .env
# .env bearbeiten
docker-compose --profile prod up -d
```

#### 2. **Coolify (Empfohlen)**
- Pushen Sie den Code ins Git-Repo
- Coolify erkennt `Dockerfile` automatisch
- ✅ Automatisches Deployment
- ✅ WebSocket-Support
- ✅ Zero-Downtime Deployments

#### 3. **Docker Swarm / Kubernetes**
Für große Deployments mit Load Balancing und Skalierung.

---

## 📈 Performance-Tipps

### 1. Multi-Stage Builds nutzen
Bereits implementiert im `Dockerfile`!

### 2. Layer-Caching optimieren
```dockerfile
# Zuerst package.json kopieren (cached wenn unverändert)
COPY package*.json ./
RUN npm ci

# Dann Code kopieren
COPY . .
```

### 3. Build-Zeiten reduzieren
```bash
# Parallel builds
docker-compose build --parallel
```

### 4. Container-Ressourcen limitieren
In `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
```

---

## 🆚 Vergleich: Docker vs. Netlify

| Feature | Docker (dieser Setup) | Netlify |
|---------|----------------------|---------|
| WebSocket-Support | ✅ Ja | ❌ Nein |
| Realtime-Updates | ✅ Instant | ⚠️ Polling (5 Sek.) |
| Performance | ✅ Nativ | ✅ CDN |
| Setup-Komplexität | ⚠️ Mittel | ✅ Einfach |
| Kosten | 💰 Server-Kosten | ✅ Free Tier |
| Kontrolle | ✅ Vollständig | ⚠️ Limitiert |
| SSL | ⚠️ Manuell | ✅ Automatisch |

---

## 📝 Troubleshooting

### Problem: Container startet nicht

**Lösung:**
```bash
# Logs anschauen
docker-compose logs

# Container neu bauen
docker-compose build --no-cache

# Alles neu starten
docker-compose down && docker-compose --profile prod up
```

### Problem: WebSockets funktionieren nicht

**Prüfen:**
1. Ist `VITE_ENABLE_REALTIME=true` gesetzt?
2. Läuft die App hinter einem Proxy? (Nginx-Config prüfen)
3. Firewall blockiert WebSockets?

**Testen:**
```bash
# In Browser-Console
console.log(supabase.channel('test').subscribe());
```

### Problem: Port bereits belegt

**Lösung:**
Port in `docker-compose.yml` ändern:
```yaml
ports:
  - "8080:80"  # Statt 80:80
```

---

## 🎉 Fertig!

Ihre App läuft jetzt mit **vollem WebSocket-Support**! 🚀

### Nächste Schritte:
- ✅ Testen Sie Realtime-Updates
- ✅ Checken Sie die Performance
- ✅ Deployen Sie auf einen Server

### Support:
Bei Fragen oder Problemen: Siehe `COOLIFY_DEPLOYMENT.md` für Server-Deployment.

---

**💡 Tipp:** Für Production empfehle ich Coolify - es verwendet Docker unter der Haube und bietet ein schönes UI! 🎨


