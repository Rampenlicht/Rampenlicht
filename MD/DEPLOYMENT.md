# 🚀 Deployment Anleitung - Rampenlicht SPA

## 📦 App-Typ

**Rampenlicht ist eine Client-Side Single Page Application (SPA)**

- ✅ **Frontend**: React + Vite (läuft im Browser)
- ✅ **Backend**: Supabase (BaaS - Backend as a Service)
- ✅ **Realtime**: WebSocket-Verbindung zu Supabase
- ❌ **NICHT**: Server-Side Rendered oder Static Site

## ⚠️ WICHTIG: Deployment-Typ

**Die App MUSS als SPA deployed werden, NICHT als Static Site!**

### Warum?
- **Static Site** = Nur statische HTML/CSS/JS Dateien → ❌ Keine WebSocket-Unterstützung
- **SPA** = Server der die App ausliefert → ✅ WebSocket für Supabase Realtime funktioniert

## 📋 Konfigurationsdateien

Ich habe folgende Config-Dateien erstellt:

| Datei | Plattform | Zweck |
|-------|-----------|-------|
| `nixpacks.toml` | Coolify, Railway | Definiert Build & Start für Nixpacks |
| `Dockerfile` | Docker, Coolify | Docker-basiertes Deployment |
| `vercel.json` | Vercel | Vercel-Konfiguration mit SPA Rewrites |
| `netlify.toml` | Netlify | Netlify-Konfiguration mit Redirects |

## 🛠️ Build & Start Commands

### Build:
```bash
npm run build
```
**Output Directory**: `dist/`

### Start (Produktion):
```bash
npm start
# oder
npx serve -s dist -p $PORT
```

### Lokaler Test:
```bash
npm run build
npm run serve
```
Öffnen Sie: http://localhost:3000

## 🚀 Deployment auf Coolify

### Methode 1: Nixpacks (Empfohlen)

**Die `nixpacks.toml` konfiguriert alles automatisch!**

1. **Push Code zu Git**
2. **In Coolify:**
   - **Source**: Ihr Git Repository
   - **Build Pack**: Nixpacks (Auto-detect)
   - **Environment Variables**:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```
3. **Deploy!**

Nixpacks liest die `nixpacks.toml` und:
- Installiert Node.js 22
- Führt `npm ci` aus
- Führt `npm run build` aus
- Startet mit `npx serve -s dist -p $PORT`

### Methode 2: Docker

1. **In Coolify:**
   - **Source**: Ihr Git Repository
   - **Build Pack**: Dockerfile
   - **Dockerfile Path**: `Dockerfile` (im Root)
   - **Environment Variables**: (siehe oben)
2. **Deploy!**

### Methode 3: Manuelle Konfiguration

Falls auto-detect nicht funktioniert:

**Settings in Coolify:**
- **Build Command**: `npm run build`
- **Start Command**: `npx serve -s dist -p $PORT`
- **Port**: 3000 (oder $PORT)
- **Install Command**: `npm ci`

## 🌐 Deployment auf anderen Plattformen

### Vercel (am einfachsten!)

```bash
npm install -g vercel
vercel --prod
```

Oder verbinden Sie Ihr Git Repository im Vercel Dashboard.

### Netlify

1. Verbinden Sie Ihr Git Repository
2. Netlify erkennt automatisch die `netlify.toml`
3. Deploy!

### Railway

```bash
railway login
railway init
railway up
```

Railway erkennt die `nixpacks.toml` automatisch.

## 🔧 Environment Variables

**Diese MÜSSEN gesetzt sein:**

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Wo setzen?**
- Coolify: Project → Environment
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

## ✅ Nach dem Deployment testen:

### 1. App öffnen
Öffnen Sie die deployed URL

### 2. Browser Console öffnen (F12)
Suchen Sie nach:
```
✅ Realtime verbunden!
🔌 Realtime Status: SUBSCRIBED
```

### 3. WebSocket prüfen
- DevTools → Network Tab → WS (WebSockets)
- Sie sollten eine aktive WebSocket-Verbindung zu Supabase sehen

### 4. Realtime testen
- Öffnen Sie Supabase Dashboard → Table Editor → profiles
- Ändern Sie Ihre Balance
- **Die App sollte sich innerhalb von 1-2 Sekunden aktualisieren!**

## 🐛 Troubleshooting

### ❌ "CHANNEL_ERROR" in Console

**Problem**: Supabase Realtime nicht aktiviert

**Lösung**: Führen Sie in Supabase SQL Editor aus:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

### ❌ Balance aktualisiert sich nicht

**Mögliche Ursachen:**

1. **Als Static Site deployed**
   - Lösung: Redeploy als SPA (siehe oben)

2. **Realtime nicht aktiviert**
   - Lösung: SQL oben ausführen

3. **Environment Variables fehlen**
   - Lösung: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY setzen

4. **RLS blockiert**
   - Lösung: Führen Sie `supabase/fix_rls_policies.sql` aus

### ❌ Build schlägt fehl

**Check 1**: Node.js Version
```bash
node --version  # Sollte v22.x sein
```

**Check 2**: Dependencies installieren
```bash
npm ci
npm run build
```

**Check 3**: Linter-Fehler
```bash
npm run lint
```

## 📊 Performance

**Mit korrektem SPA Deployment:**
- ✅ Realtime funktioniert sofort
- ✅ Balance-Updates: < 2 Sekunden
- ✅ Fallback Polling: Alle 60 Sekunden
- ✅ iOS/Android Support: Volle WebSocket-Unterstützung

**Mit falscher Static Site:**
- ❌ Kein Realtime
- ⚠️ Balance-Updates: Alle 5 Sekunden (Polling)
- ⚠️ Mehr Server-Last

## 📝 Checkliste für erfolgreichen Deploy:

- [ ] ✅ Als **SPA** deployed (nicht Static Site)
- [ ] ✅ Build Command: `npm run build`
- [ ] ✅ Start Command: `npx serve -s dist -p $PORT`
- [ ] ✅ Environment Variables gesetzt
- [ ] ✅ Supabase Realtime aktiviert (`enable_realtime.sql`)
- [ ] ✅ RLS Policies korrekt (`fix_rls_policies.sql`)
- [ ] ✅ Port-Variable korrekt (`$PORT` oder `${PORT}`)
- [ ] ✅ Node.js Version: 22.x

## 🎉 Fertig!

Nach dem korrekten Deployment sollte Ihre App:
- ⚡ Schnell laden
- 🔄 Realtime Updates erhalten
- 📱 Auf iOS/Android funktionieren
- 🌐 WebSocket-Verbindung haben

Bei Fragen oder Problemen: Prüfen Sie die Browser Console für detaillierte Logs!
