# 🚀 Coolify/Railway Deployment Guide

Diese Anleitung erklärt, wie Sie die **Rampenlicht App** mit **Coolify** oder **Railway** hosten.

---

## 📋 Voraussetzungen

✅ **Git Repository** auf GitHub/GitLab/Gitea  
✅ **Supabase Projekt** (URL + Anon Key)  
✅ **Coolify/Railway Account**

---

## 🔧 1. Repository vorbereiten

Alle notwendigen Dateien sind bereits vorhanden:
- ✅ `nixpacks.toml` - Nixpacks Konfiguration
- ✅ `Dockerfile` - Docker Build Configuration
- ✅ `.dockerignore` - Optimierte Build-Dateien
- ✅ `package.json` - Mit korrekten Engine-Versionen

### Wichtig: Git Push

```bash
git add .
git commit -m "Add Coolify/Railway deployment configuration"
git push origin main
```

---

## 🎯 2. Coolify Setup

### Schritt 1: Neues Projekt erstellen
1. In Coolify einloggen
2. **"+ New Resource"** klicken
3. **"Application"** auswählen
4. Repository verbinden (GitHub/GitLab/Gitea)

### Schritt 2: Build-Methode wählen

**Wichtig:** Wählen Sie **EINE** der folgenden Methoden:

#### Option A: Nixpacks (Empfohlen ✅)
- **Build Pack:** `Nixpacks`
- Coolify erkennt automatisch `nixpacks.toml`
- Schneller und effizienter
- ✅ **WebSocket-Support für Supabase Realtime**

#### Option B: Dockerfile
- **Build Pack:** `Dockerfile`
- Verwendet das bereitgestellte `Dockerfile`
- Mehr Kontrolle, aber langsamer

### Schritt 3: Environment Variables setzen

**WICHTIG:** Diese Variablen **MÜSSEN** gesetzt werden!

```env
VITE_SUPABASE_URL=https://ihr-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**So fügen Sie sie hinzu:**
1. Im Coolify Dashboard → Ihr Projekt
2. **"Environment"** Tab
3. **"+ Add Variable"** klicken
4. Name + Value eingeben
5. **"Save"** klicken

### Schritt 4: Port & Network Settings

- **Port:** `3000` (wird automatisch erkannt)
- **Health Check Path:** `/` (Optional, aber empfohlen)
- **Protocol:** `HTTP`

### Schritt 5: Deployment starten

1. **"Deploy"** Button klicken
2. Warten auf Build + Deployment (2-5 Minuten)
3. Nach erfolgreichem Deployment: URL öffnen

---

## 🚂 3. Railway Setup

### Schritt 1: Neues Projekt erstellen
1. In Railway einloggen
2. **"New Project"** → **"Deploy from GitHub repo"**
3. Repository auswählen

### Schritt 2: Konfiguration

Railway erkennt automatisch:
- ✅ `nixpacks.toml`
- ✅ Node.js Version
- ✅ Build + Start Commands

### Schritt 3: Environment Variables

**Settings → Variables:**
```env
VITE_SUPABASE_URL=https://ihr-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Schritt 4: Deployment

Railway deployed automatisch bei jedem Git Push!

---

## ⚠️ Wichtige Hinweise

### 1. **Deployment-Typ: SPA/Node.js (NICHT Static Site!)**
   
**Warum?**
- ✅ **WebSocket-Support** für Supabase Realtime
- ✅ **React Router** funktioniert korrekt
- ✅ `serve` Server übernimmt Routing

**Falsch:** ❌ Static Site Hosting (Vercel Free, Netlify Free)  
**Richtig:** ✅ SPA/Node.js (Coolify, Railway, Render)

### 2. **Node.js Version**

Die App benötigt **Node.js 22+**:
```json
"engines": {
  "node": ">=22.11.0",
  "npm": ">=10.0.0"
}
```

Coolify/Railway verwendet automatisch die richtige Version durch:
- `nixpacks.toml`: `nixPkgs = ["nodejs_22"]`
- `Dockerfile`: `FROM node:22-alpine`

### 3. **Build-Zeit**

Erster Build dauert **3-5 Minuten**:
- `npm ci` installiert Dependencies
- `npm run build` baut die App
- Vite optimiert und bundled

Weitere Deployments sind **schneller** (Cache!).

### 4. **Environment Variables**

**WICHTIG:** Environment Variables mit `VITE_` Präfix werden **beim Build** eingebettet!

❌ **Falsch:** Variablen nach dem Build ändern  
✅ **Richtig:** Bei Änderungen → **Rebuild** auslösen

### 5. **Supabase URL & Anon Key**

So finden Sie Ihre Keys:
1. Supabase Dashboard → Ihr Projekt
2. **Settings** → **API**
3. Kopieren Sie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

---

## 🔍 Troubleshooting

### Problem: App lädt, aber zeigt weißen Bildschirm

**Lösung:**
1. Browser DevTools öffnen (F12)
2. Console prüfen auf Fehler
3. Häufige Ursache: Fehlende Environment Variables

```bash
# In Coolify Logs prüfen:
docker logs <container-name>
```

### Problem: "404 Not Found" bei React Router

**Ursache:** App als Static Site deployed (kein Server-Side Routing)

**Lösung:**
- Coolify: Build Pack auf **Nixpacks** oder **Dockerfile** ändern
- Nicht als **Static Site** deployen!

### Problem: Realtime funktioniert nicht (iPhone)

**Ursache:** WebSocket-Verbindung wird blockiert

**Lösung:**
1. ✅ **SPA/Node.js Deployment** verwenden (nicht Static Site)
2. ✅ HTTPS aktivieren (Coolify macht das automatisch)
3. ✅ `supabase/enable_realtime.sql` ausführen (siehe Supabase Setup)

### Problem: Build schlägt fehl mit "node: command not found"

**Lösung:**
- `nixpacks.toml` prüfen: `nixPkgs = ["nodejs_22"]`
- Oder `Dockerfile` verwenden

### Problem: "serve: command not found"

**Lösung:**
- `package.json` prüfen: `serve` muss in dependencies sein
- Oder in `Dockerfile`: `npm install -g serve`

---

## 🎨 Custom Domain Setup (Optional)

### Coolify:
1. Projekt → **Domains** Tab
2. **"+ Add Domain"** klicken
3. Domain eingeben (z.B. `app.rampenlicht.de`)
4. DNS Records in Ihrem Domain-Provider setzen:
   ```
   Type: A
   Name: app
   Value: <Coolify-Server-IP>
   ```
5. SSL wird automatisch via Let's Encrypt eingerichtet

### Railway:
1. Settings → **Domains**
2. **"Custom Domain"** hinzufügen
3. DNS CNAME Record setzen:
   ```
   Type: CNAME
   Name: app
   Value: <railway-app-url>
   ```

---

## 📊 Performance-Tipps

### 1. **Build Cache aktivieren**
Coolify cached automatisch `node_modules` → schnellere Builds

### 2. **Health Checks**
```yaml
# Coolify Health Check
Path: /
Interval: 30s
Timeout: 5s
```

### 3. **Logs überwachen**
```bash
# In Coolify:
docker logs -f <container-name>

# Auf Fehler prüfen:
docker logs <container-name> | grep ERROR
```

---

## 🔐 Sicherheit

### 1. **Environment Variables niemals im Code!**
❌ Hardcoded: `const url = "https://xyz.supabase.co"`  
✅ Env Variable: `const url = import.meta.env.VITE_SUPABASE_URL`

### 2. **Supabase Row Level Security (RLS)**
Stellen Sie sicher, dass RLS aktiviert ist:
```sql
-- In Supabase SQL Editor:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Alle Tabellen sollten `rowsecurity = true` haben!

### 3. **.env Dateien NICHT committen**
Prüfen Sie `.gitignore`:
```
.env
.env.local
.env.production
```

---

## 📚 Weitere Ressourcen

- 📖 [Coolify Dokumentation](https://coolify.io/docs)
- 🚂 [Railway Dokumentation](https://docs.railway.app)
- ⚡ [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- 🗄️ [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

## ✅ Checklist vor Deployment

- [ ] Git Repository ist aktuell (`git push`)
- [ ] `VITE_SUPABASE_URL` in Coolify gesetzt
- [ ] `VITE_SUPABASE_ANON_KEY` in Coolify gesetzt
- [ ] Supabase RLS Policies sind korrekt
- [ ] Supabase Realtime ist aktiviert (`supabase/enable_realtime.sql`)
- [ ] Build Pack: **Nixpacks** oder **Dockerfile** (NICHT Static Site)
- [ ] Port 3000 ist freigegeben
- [ ] Health Check konfiguriert (optional)

---

## 🎉 Erfolg!

Nach erfolgreichem Deployment sollten Sie sehen:
- ✅ Login/Register funktioniert
- ✅ Dashboard lädt
- ✅ Balance wird angezeigt
- ✅ Realtime Updates funktionieren (iPhone!)
- ✅ Dark Mode funktioniert
- ✅ Navigation funktioniert (React Router)

**URL:** `https://ihre-app.coolify.io` oder Custom Domain

---

## 💬 Support

Bei Problemen:
1. Coolify Logs prüfen
2. Browser DevTools Console prüfen
3. Supabase Dashboard → Logs prüfen

**Viel Erfolg mit dem Deployment! 🚀**

