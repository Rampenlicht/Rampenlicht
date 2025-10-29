# ⚠️ Netlify & WebSocket-Limitierungen

## Problem

Beim Deployment auf **Netlify** erscheint der Fehler:
```
WebSocket connection failed
CHANNEL_ERROR
```

## Ursache

**Netlify unterstützt keine WebSockets**, da es ein **statischer Hosting-Dienst** ist:
- ✅ Statische Dateien (HTML, CSS, JS)
- ✅ API-Calls (HTTP/HTTPS)
- ❌ **WebSockets** (Realtime-Verbindungen)
- ❌ **Server-Side Rendering**

## Lösung

Die App ist bereits so konfiguriert, dass sie **automatisch auf Polling umschaltet**, wenn WebSockets fehlschlagen:

### ✅ Was funktioniert auf Netlify:
- ✅ Login & Registrierung
- ✅ Dashboard-Navigation
- ✅ Geld senden (Transaktionen)
- ✅ Profil-Verwaltung
- ✅ QR-Code Scanner
- ✅ **Manuelle Balance-Updates** (Refresh-Button)

### ⚠️ Was NICHT in Echtzeit funktioniert:
- ❌ **Automatische Balance-Updates** ohne Refresh
- ❌ **Live-Transaktions-Updates** ohne Reload
- ❌ **Realtime-Benachrichtigungen**

### 🔄 Automatisches Fallback-System:

Die App verwendet bereits **adaptives Polling**:

```javascript
// In BalanceCard.jsx:
if (status === 'CHANNEL_ERROR') {
  // Automatisches Polling alle 5 Sekunden
  pollInterval = setInterval(() => {
    loadBalance();
  }, 5000);
}
```

**Zusätzliche Polling-Events:**
- ✅ **Tab-Wechsel**: Lädt Balance neu
- ✅ **App-Fokus**: Lädt Balance neu (wichtig für iOS)
- ✅ **Manueller Refresh**: Refresh-Button

## Alternative Hosting-Plattformen

Für **echtes Realtime** mit WebSocket-Support verwenden Sie:

### 1️⃣ **Coolify** (Empfohlen für Self-Hosting)
- ✅ WebSocket-Support
- ✅ Docker-basiert
- ✅ Full-Stack Apps
- ✅ Eigener Server

**Deployment:**
```bash
# Bereits konfiguriert in nixpacks.toml & Dockerfile
git push
```

### 2️⃣ **Railway**
- ✅ WebSocket-Support
- ✅ Einfaches Deployment
- ✅ Free Tier verfügbar
- 🌐 https://railway.app

### 3️⃣ **Vercel**
- ✅ WebSocket-Support (mit Einschränkungen)
- ✅ Gute Vite-Integration
- ⚠️ Limitierungen im Free Tier
- 🌐 https://vercel.com

### 4️⃣ **Render**
- ✅ WebSocket-Support
- ✅ Free Tier verfügbar
- ✅ Einfache Docker-Deployments
- 🌐 https://render.com

## Deployment-Empfehlung

### Für Production:
**Coolify** oder **Railway** verwenden für volle Realtime-Funktionalität

### Für Testing/Preview:
**Netlify** ist okay, aber User müssen:
- Balance manuell refreshen (Refresh-Button)
- Seite neu laden nach Transaktionen
- Keine Live-Updates erwarten

## Environment Variables auf Netlify

Falls Sie trotzdem Netlify verwenden möchten, setzen Sie diese Variablen im Netlify Dashboard:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Die App funktioniert dann mit **Polling-Fallback**.

## Zusammenfassung

| Feature | Netlify | Coolify/Railway |
|---------|---------|-----------------|
| Statische Dateien | ✅ | ✅ |
| API Calls | ✅ | ✅ |
| WebSockets | ❌ | ✅ |
| Realtime | ❌ (Polling) | ✅ (WebSocket) |
| Preis | Kostenlos | Variabel |
| Setup | Einfach | Mittel |

---

**💡 Tipp:** Für die beste User-Experience deployen Sie auf einer Plattform mit WebSocket-Support!

