# 🚀 Quickstart: Docker Setup

**In 3 Schritten zur laufenden App mit WebSocket-Support!**

---

## 📋 Voraussetzungen

- Docker installiert
- Supabase URL & Anon Key

---

## ⚡ 3 Schritte

### 1️⃣ Environment Variables erstellen

```bash
# Erstelle .env Datei
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_ENABLE_REALTIME=true
EOF
```

**Oder mit Makefile:**
```bash
make env
# Dann .env bearbeiten
```

### 2️⃣ App starten

**Development (mit Hot Reload):**
```bash
make dev
# oder
docker-compose --profile dev up
```
→ App läuft auf **http://localhost:5173**

**Production (optimiert):**
```bash
make prod
# oder
docker-compose --profile prod up -d
```
→ App läuft auf **http://localhost:3000**

### 3️⃣ Testen

Öffnen Sie: **http://localhost:3000** (oder 5173)

✅ **WebSockets funktionieren!**
✅ **Realtime-Updates!**
✅ **Keine Polling-Verzögerung!**

---

## 🎯 Häufige Befehle

```bash
# Logs anschauen
make logs

# Container neustarten
make restart

# Alles stoppen
make clean

# Health Check
make health

# In Container einsteigen
make shell
```

---

## 📚 Mehr Infos

Siehe `DOCKER_SETUP.md` für detaillierte Dokumentation.

---

**Das war's!** 🎉 Ihre App läuft jetzt mit Docker und WebSocket-Support!


