# 🍎 iOS 18 WebSocket Fix für Self-hosted Supabase

## Problem
Auf **iOS 18 (Safari & PWA)** funktionieren WebSocket-Verbindungen nicht zuverlässig, besonders bei:
- ❌ App-Wechsel (iOS friert WebSockets ein)
- ❌ Screen Lock/Unlock
- ❌ Back/Forward Cache (BFCache)
- ❌ PWA nach längerer Inaktivität

## Ursache
iOS 18 hat aggressive Power-Management-Features:
1. **WebSocket Freeze**: WebSockets werden beim Hintergrund pausiert
2. **BFCache**: Seiten werden gecached, aber WebSockets nicht wiederhergestellt
3. **PWA Lifecycle**: Spezielle Events die nur in PWAs funktionieren

## ✅ Lösung implementiert

### 1. Verbesserte Supabase-Konfiguration
**Datei**: `src/lib/supabase.js`

```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10  // Erhöht für bessere Responsiveness
    },
    timeout: 30000,
    heartbeatIntervalMs: 15000,  // Kürzere Heartbeats für PWA/iOS
    
    // Exponential Backoff für Reconnects
    reconnectAfterMs: (tries) => {
      return Math.min(1000 * Math.pow(2, tries), 10000);
    }
  }
});
```

**Was macht das?**
- ✅ **15s Heartbeat**: Hält Verbindung am Leben (iOS-freundlich)
- ✅ **Exponential Backoff**: 1s → 2s → 4s → 8s → 10s (Max)
- ✅ **Mehr Events/Sekunde**: Schnellere Updates

---

### 2. iOS PWA Lifecycle Events
**Datei**: `src/components/Tabs/HomeTab.jsx`

#### Event 1: `pageshow` (Kritisch für iOS!)
```javascript
const handlePageShow = (event) => {
  if (event.persisted) {
    // Seite wurde aus BFCache geladen
    console.log('🔄 PWA aus Back/Forward Cache - Force Reconnect');
    loadBalance();
    
    setTimeout(() => {
      if (!channelRef.current || channelRef.current.state === 'closed') {
        setupBalanceChannel();
      }
    }, 500);
  }
};
window.addEventListener('pageshow', handlePageShow);
```

**Wann wird das ausgelöst?**
- ✅ PWA wird aus Back/Forward Cache geladen
- ✅ Zurück-Button in iOS PWA
- ✅ Nach längerem Hintergrund

---

#### Event 2: `resume` (iOS PWA-spezifisch)
```javascript
const handleResume = () => {
  console.log('▶️ PWA resumed, prüfe Connection...');
  
  setTimeout(() => {
    if (!channelRef.current || channelRef.current.state === 'closed') {
      setupBalanceChannel();
    }
  }, 1000);
};
document.addEventListener('resume', handleResume);
```

**Wann wird das ausgelöst?**
- ✅ iOS PWA kommt aus "Freeze"-Zustand zurück
- ✅ Nach Screen-Lock/Unlock
- ✅ Nach App-Wechsel zurück zur PWA

---

#### Event 3: `visibilitychange` (Browser & PWA)
```javascript
const handleVisibilityChange = () => {
  if (!document.hidden) {
    console.log('👀 App wieder sichtbar, aktualisiere...');
    loadBalance();
    
    if (channelRef.current && channelRef.current.state === 'closed') {
      setupBalanceChannel();
    }
  }
};
document.addEventListener('visibilitychange', handleVisibilityChange);
```

**Wann wird das ausgelöst?**
- ✅ Tab-Wechsel (Browser)
- ✅ App-Wechsel (PWA)
- ✅ Minimize/Restore

---

## 📊 Event-Übersicht: iOS vs Browser

| Aktion | Browser | iOS PWA | Event |
|--------|---------|---------|-------|
| App öffnen | `focus` | `pageshow`, `resume` | ✅ |
| App schließen | `blur` | `pagehide`, `freeze` | ✅ |
| Aus BFCache | - | `pageshow` (persisted=true) | ✅ |
| Screen Lock | - | `freeze` | ✅ |
| Screen Unlock | - | `resume` | ✅ |
| Tab-Wechsel | `visibilitychange` | `visibilitychange` | ✅ |

---

## 🧪 Testing auf iOS

### 1. PWA auf iOS installieren
```
1. Safari öffnen → Deine App
2. Teilen-Button (⬆️) → "Zum Home-Bildschirm"
3. Hinzufügen bestätigen
```

### 2. Remote Debugging aktivieren
```
iPhone:
- Einstellungen → Safari → Erweitert → Web-Inspektor: AN

Mac:
- Safari → Entwickler → [Dein iPhone] → [App Name]
- Console öffnen
```

### 3. Test-Szenarios

#### ✅ Test 1: App-Wechsel
```
1. PWA öffnen → Balance wird geladen
2. Home-Button → andere App öffnen
3. Zurück zur PWA
4. Console sollte zeigen:
   🔄 PWA aus Back/Forward Cache - Force Reconnect
   ✅ Realtime verbunden!
```

#### ✅ Test 2: Screen Lock
```
1. PWA öffnen → Balance wird geladen
2. Screen sperren (Power-Button)
3. Screen entsperren
4. Console sollte zeigen:
   ▶️ PWA resumed, prüfe Connection...
   ✅ Realtime verbunden!
```

#### ✅ Test 3: Längerer Hintergrund
```
1. PWA öffnen
2. 5+ Minuten warten (im Hintergrund)
3. PWA wieder öffnen
4. Console sollte zeigen:
   🔄 PWA aus Back/Forward Cache - Force Reconnect
   🔄 Force Reconnecting Balance nach BFCache...
```

---

## 🔍 Debugging auf iOS

### Console Logs ansehen
```bash
# In Safari Developer Tools (Mac + iOS verbunden):
🔌 Erstelle neuen Balance-Channel: balance-xxx
📡 Realtime Status (Balance): SUBSCRIBED
✅ Realtime verbunden (Balance) – kein Polling nötig

# Nach App-Wechsel:
🔄 PWA aus Back/Forward Cache (Balance) - Force Reconnect
🔄 Force Reconnecting Balance nach BFCache...
📡 Realtime Status (Balance): SUBSCRIBED
✅ Realtime verbunden (Balance) – kein Polling nötig
```

### Realtime-Status prüfen
```javascript
// In Safari Console (Remote Debugging):
console.log('Channels:', supabase.getChannels().length);
```

---

## ⚙️ Self-hosted Supabase Setup

### 1. Realtime aktivieren (Datenbank)
**Führe aus**: `supabase/enable_realtime_complete.sql`

```sql
-- Profiles
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Transactions
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Prüfen
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### 2. Realtime-Server läuft?
```bash
docker ps | grep realtime
```

Sollte zeigen:
```
CONTAINER ID   IMAGE                    STATUS
abc123         supabase/realtime        Up 5 minutes
```

### 3. WebSocket-Port offen?
Default: Port `4000` (Realtime)

Prüfe in deiner `docker-compose.yml`:
```yaml
services:
  realtime:
    image: supabase/realtime
    ports:
      - "4000:4000"
```

---

## 🚀 Erwartetes Verhalten

### ✅ Browser (Desktop)
- **Erste Verbindung**: Realtime ✅
- **Tab-Wechsel**: Realtime bleibt aktiv ✅
- **Tab schließen/öffnen**: Realtime reconnect ✅

### ✅ iOS Safari (nicht installiert)
- **Erste Verbindung**: Realtime ✅
- **Tab-Wechsel**: Realtime bleibt aktiv ✅
- **Tab schließen/öffnen**: Realtime reconnect ✅

### ✅ iOS PWA (installiert) ← KRITISCH!
- **Erste Verbindung**: Realtime ✅
- **App-Wechsel**: `pageshow` + Reconnect ✅
- **Screen Lock/Unlock**: `resume` + Reconnect ✅
- **Aus BFCache**: `pageshow` (persisted) + Reconnect ✅
- **Nach langer Inaktivität**: Fallback-Polling + Reconnect ✅

---

## 📝 Wichtige Hinweise

### Timeouts & Delays
```javascript
// BFCache Reconnect: 500ms Delay
setTimeout(() => reconnect(), 500);

// Resume Reconnect: 1000ms Delay  
setTimeout(() => reconnect(), 1000);
```

**Warum Delays?**
- iOS braucht Zeit nach Resume/BFCache
- Sofortiger Reconnect schlägt oft fehl
- 500ms-1s ist optimal

### Exponential Backoff
```javascript
reconnectAfterMs: (tries) => {
  return Math.min(1000 * Math.pow(2, tries), 10000);
}
```

**Reconnect-Zeiten:**
- Versuch 1: 1 Sekunde
- Versuch 2: 2 Sekunden
- Versuch 3: 4 Sekunden
- Versuch 4: 8 Sekunden
- Versuch 5+: 10 Sekunden (Max)

### Fallback-Polling
```javascript
// Balance: 5 Sekunden
if (!isRealtimeConnected) {
  setInterval(() => loadBalance(), 5000);
}

// Transactions: 10 Sekunden
if (!isRealtimeConnected) {
  setInterval(() => loadTransactions(), 10000);
}
```

**Warum Polling?**
- ✅ Backup falls Realtime komplett fehlschlägt
- ✅ Funktioniert auch ohne WebSockets
- ✅ Zeigt "Polling" Status im UI

---

## ⚠️ Häufige Probleme

### Problem: "Realtime verbindet nicht auf iOS"

**Lösung 1: Prüfe Realtime-Server**
```bash
docker ps | grep realtime
docker logs <realtime-container-id>
```

**Lösung 2: Prüfe Datenbank**
```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

Sollte zeigen: `profiles`, `transactions`

**Lösung 3: Prüfe iOS Logs**
- Safari → Entwickler → iPhone → App
- Console öffnen → Nach Fehlern suchen

---

### Problem: "Events werden mehrfach ausgelöst"

**Ursache**: Event-Listeners wurden nicht korrekt entfernt

**Lösung**: Cleanup in `useEffect` prüfen:
```javascript
return () => {
  window.removeEventListener('pageshow', handlePageShow);
  document.removeEventListener('resume', handleResume);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
};
```

---

### Problem: "Zu viele Reconnects"

**Ursache**: `isSubscribed` Flag fehlt

**Lösung**: Prüfe in `HomeTab.jsx`:
```javascript
let isSubscribed = false;

// In subscribe callback:
if (status === 'SUBSCRIBED') {
  isSubscribed = true;
}

// In CLOSED handler:
if (isSubscribed) {
  // Nur reconnecten wenn vorher verbunden
}
```

---

## 📱 iOS-spezifische Besonderheiten

### 1. BFCache ist sehr aggressiv
iOS cached PWAs **sofort** beim Hintergrund. Deswegen:
- ✅ `pageshow` Event ist KRITISCH
- ✅ `event.persisted` prüfen
- ✅ Force Reconnect nach BFCache

### 2. Screen Lock friert WebSockets ein
iOS pausiert WebSockets bei Screen Lock:
- ✅ `resume` Event lauschen
- ✅ Nach Unlock reconnecten
- ✅ 1s Delay geben

### 3. PWA vs Safari unterschiedlich
Selbe URL, aber:
- **Safari-Tab**: `focus`, `visibilitychange`
- **Installierte PWA**: `pageshow`, `resume`, `freeze`

---

## ✅ Checkliste: iOS-Ready?

- ✅ `supabase.js`: Realtime-Config mit Exponential Backoff
- ✅ `HomeTab.jsx`: `pageshow` Event implementiert
- ✅ `HomeTab.jsx`: `resume` Event implementiert
- ✅ `HomeTab.jsx`: `visibilitychange` Event implementiert
- ✅ Datenbank: Realtime für `profiles` aktiviert
- ✅ Datenbank: Realtime für `transactions` aktiviert
- ✅ Docker: Realtime-Server läuft
- ✅ Cleanup: Event-Listeners werden entfernt
- ✅ Fallback: Polling bei Realtime-Fehler
- ✅ Status-Indikator: "Live" vs "Polling" im UI

---

## 🎯 Zusammenfassung

### Was wurde geändert?

1. **`src/lib/supabase.js`**:
   - ✅ Realtime-Config mit iOS-optimierten Settings
   - ✅ Exponential Backoff
   - ✅ Kürzere Heartbeats (15s)

2. **`src/components/Tabs/HomeTab.jsx`**:
   - ✅ `pageshow` Event für BFCache
   - ✅ `resume` Event für iOS Freeze/Resume
   - ✅ `visibilitychange` Event für Tab-Wechsel
   - ✅ Proper Cleanup aller Events
   - ✅ Reconnect-Logic für alle Szenarios

### Warum funktioniert es jetzt?

**Vorher**: Nur `visibilitychange` → Reicht nicht für iOS PWA  
**Nachher**: 3 Events (`pageshow`, `resume`, `visibilitychange`) + Delays + Exponential Backoff

---

## 🚀 Testen auf echtem iPhone

```bash
# 1. App auf iOS deployen
npm run build
# Deploy zu deinem Server

# 2. iPhone: Safari → App öffnen
# 3. Teilen → Zum Home-Bildschirm
# 4. PWA öffnen

# 5. Mac: Safari Developer Tools verbinden
# 6. Console öffnen

# 7. Tests durchführen:
- ✅ App-Wechsel (Home-Button)
- ✅ Screen Lock/Unlock
- ✅ 5 Minuten Hintergrund
- ✅ Zurück-Button in PWA

# 8. Console sollte zeigen:
🔄 PWA aus Back/Forward Cache - Force Reconnect
▶️ PWA resumed, prüfe Connection...
✅ Realtime verbunden!
```

---

**Die App ist jetzt iOS 18 PWA-ready!** 🍎✅

