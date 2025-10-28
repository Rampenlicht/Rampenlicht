# iPhone Realtime Debugging Guide

## Was wurde verbessert:

### 1. **BalanceCard.jsx**
✅ **Intelligentes Fallback-System:**
- Realtime-Verbindung wird kontinuierlich überwacht
- Bei erfolgreicher Verbindung: Polling alle 60 Sekunden als Backup
- Bei fehlgeschlagener Verbindung: Aggressives Polling alle 5 Sekunden
- Initial: Polling alle 10 Sekunden

✅ **iOS-spezifische Handler:**
- `visibilitychange` Event: Update wenn App wieder sichtbar wird
- `focus` Event: Update wenn App fokussiert wird (wichtig für iOS)

✅ **Bessere Status-Überwachung:**
- Detaillierte Console-Logs mit Emojis für bessere Lesbarkeit
- Status-Tracking: `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`

### 2. **supabase.js**
✅ **Erweiterte Konfiguration:**
- `eventsPerSecond: 10` - Mehr Events pro Sekunde erlaubt
- `autoRefreshToken: true` - Token wird automatisch aktualisiert
- `persistSession: true` - Session bleibt erhalten
- `detectSessionInUrl: true` - Session-Erkennung aus URL

## Debugging auf dem iPhone:

### Option 1: Safari Web Inspector (Empfohlen)

1. **iPhone vorbereiten:**
   - Öffnen Sie `Einstellungen` → `Safari` → `Erweitert`
   - Aktivieren Sie `Web-Inspektor`

2. **Mac vorbereiten:**
   - Öffnen Sie Safari auf dem Mac
   - Menü: `Safari` → `Einstellungen` → `Erweitert`
   - Aktivieren Sie `Menü "Entwickler" in der Menüleiste anzeigen`

3. **Debuggen:**
   - Verbinden Sie iPhone mit dem Mac (USB)
   - Öffnen Sie die App auf dem iPhone
   - In Safari auf dem Mac: Menü `Entwickler` → `[Ihr iPhone]` → `[Ihre Website]`
   - Die Console zeigt alle Logs an!

### Option 2: Erratic (iOS App)

1. Installieren Sie die "Erratic" App aus dem App Store
2. Öffnen Sie Erratic und dann Ihre Website
3. Erratic zeigt alle Console-Logs direkt auf dem iPhone an

### Option 3: Remote Debugging mit Supabase Dashboard

1. Öffnen Sie Ihr Supabase Dashboard
2. Gehen Sie zu `Database` → `Replication` → `Realtime`
3. Prüfen Sie, ob Realtime für die `profiles` Tabelle aktiviert ist

## Was Sie in der Console sehen sollten:

### ✅ Erfolgreiche Realtime-Verbindung:
```
🔌 Realtime Status: SUBSCRIBING
🔌 Realtime Status: SUBSCRIBED
✅ Realtime verbunden!
🔄 Fallback Polling (Realtime aktiv)...
```

### ❌ Fehlgeschlagene Realtime-Verbindung:
```
🔌 Realtime Status: CHANNEL_ERROR
❌ Realtime Fehler, nutze Polling: CHANNEL_ERROR
🔄 Polling Balance (Realtime inaktiv)...
```

### 🔄 Bei App-Wechsel:
```
👀 App wieder sichtbar, aktualisiere Balance...
🎯 App fokussiert, aktualisiere Balance...
```

## Mögliche Probleme & Lösungen:

### Problem 1: Realtime funktioniert nicht
**Lösung:** Die App nutzt automatisch Polling als Fallback (alle 5 Sekunden)

### Problem 2: Balance aktualisiert sich nicht
**Ursachen:**
1. Supabase Realtime ist für `profiles` Tabelle nicht aktiviert
2. Row Level Security (RLS) blockiert Updates
3. Netzwerkprobleme

**Lösung:**
- Prüfen Sie Supabase Dashboard → Database → Replication
- Führen Sie das SQL aus: `ALTER PUBLICATION supabase_realtime ADD TABLE profiles;`
- Testen Sie mit dem Refresh-Button (sollte sofort aktualisieren)

### Problem 3: Zu viele API-Requests
**Anpassung:** In `BalanceCard.jsx` können Sie die Polling-Intervalle anpassen:
```javascript
// Zeile 67: Realtime aktiv
}, 60000); // 60 Sekunden

// Zeile 81: Realtime inaktiv
}, 5000); // 5 Sekunden

// Zeile 91: Initial Polling
}, 10000); // 10 Sekunden
```

## 🚨 CHANNEL_ERROR beheben:

Wenn Sie `CHANNEL_ERROR` in der Console sehen, ist Realtime nicht aktiviert!

### Lösung (WICHTIG!):

1. **Öffnen Sie Ihr Supabase Dashboard**
2. **Gehen Sie zu:** SQL Editor
3. **Führen Sie das SQL-Script aus:** `supabase/enable_realtime.sql`

Oder kopieren Sie diesen Code direkt:

```sql
-- profiles Tabelle zur Realtime Publication hinzufügen
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Prüfen ob es funktioniert hat
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### Alternative: Über das Dashboard

1. **Supabase Dashboard** → **Database** → **Replication**
2. Suchen Sie die `profiles` Tabelle
3. Aktivieren Sie **"Enable Realtime"**
4. Speichern Sie die Änderungen

## Supabase Realtime überprüfen:

### SQL Command (im Supabase SQL Editor):
```sql
-- Prüfen ob Realtime für profiles aktiviert ist
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Falls nicht, aktivieren:
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Alle RLS Policies anzeigen
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## Performance-Überwachung:

Die App zeigt jetzt detaillierte Logs:
- 🔌 = Realtime Status
- ✅ = Erfolg
- ❌ = Fehler
- 🔄 = Polling
- 👀 = Visibility Change
- 🎯 = Focus Event
- 🧹 = Cleanup

## Nächste Schritte:

1. Öffnen Sie die App auf dem iPhone
2. Verbinden Sie Safari Web Inspector (siehe oben)
3. Beobachten Sie die Console-Logs
4. Testen Sie:
   - Balance ändern in Supabase Dashboard
   - App minimieren und wieder öffnen
   - Zwischen Apps wechseln
   - Refresh-Button drücken

Die Balance sollte sich **spätestens nach 5 Sekunden** aktualisieren, auch wenn Realtime nicht funktioniert!

