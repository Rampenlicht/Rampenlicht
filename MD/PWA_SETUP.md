# PWA Setup mit Vite Plugin PWA

## 📱 Übersicht

Die Rampenlicht App verwendet das `vite-plugin-pwa` Plugin für vollständige Progressive Web App (PWA) Funktionalität.

## ✅ Installierte Packages

```bash
npm install -D vite-plugin-pwa workbox-window
```

## 🔧 Konfiguration

### 1. **Vite Config** (`vite.config.js`)

Die PWA-Konfiguration umfasst:

- **Auto-Update**: Service Worker aktualisiert sich automatisch
- **Manifest**: App-Metadaten (Name, Icons, Theme-Farben)
- **Workbox Caching**: Intelligente Caching-Strategien
- **Offline Support**: App funktioniert auch ohne Internet

#### Caching-Strategien:

| Ressource | Strategie | Cache-Zeit | Beschreibung |
|-----------|-----------|------------|--------------|
| **Supabase API** | `NetworkFirst` | 5 Minuten | Immer frische Daten, Fallback auf Cache |
| **Bilder** | `CacheFirst` | 30 Tage | Schnelles Laden, selten aktualisiert |
| **CSS/JS** | `StaleWhileRevalidate` | 7 Tage | Sofort aus Cache, Update im Hintergrund |

### 2. **Custom Hook** (`src/hooks/usePWA.js`)

Bietet React-Integration für:
- ✅ Service Worker Status
- 🔄 Update-Benachrichtigungen
- 📴 Offline-Ready Status
- 🔁 Automatische Update-Checks (alle 60 Sekunden)

### 3. **Update-Komponente** (`src/components/PWAUpdateNotification.jsx`)

Zeigt Benachrichtigungen für:
- **App-Updates**: Nutzer kann sofort aktualisieren oder später
- **Offline-Bereitschaft**: Info, dass App offline funktioniert

## 🚀 Features

### ✅ Automatische Updates
```javascript
// Service Worker prüft alle 60 Sekunden auf neue Versionen
setInterval(() => {
  registration.update();
}, 60 * 1000);
```

### 📴 Offline-Funktionalität
- Alle wichtigen Assets werden beim ersten Besuch gecacht
- App lädt auch ohne Internetverbindung
- API-Calls nutzen Cache als Fallback

### 🔄 Smart Caching
- **Network First** für Supabase: Immer aktuell, Fallback auf Cache
- **Cache First** für Bilder: Schnell, spart Bandbreite
- **Stale While Revalidate** für Code: Sofort verfügbar + Update im Hintergrund

### 🎨 App-Installation
- iOS: "Zum Home-Bildschirm" Option
- Android: Automatischer Install-Prompt
- Desktop: Chrome/Edge Install-Button

## 📦 Build & Deployment

### Development
```bash
npm run dev
```
> ⚠️ Service Worker ist im Dev-Mode **deaktiviert** für schnelleres Development

### Production Build
```bash
npm run build
```

Nach dem Build werden generiert:
- `dist/sw.js` - Service Worker
- `dist/workbox-*.js` - Workbox Runtime
- `dist/manifest.webmanifest` - PWA Manifest

### Testen
```bash
npm run preview
```
> ✅ Service Worker ist im Preview-Mode **aktiv**

## 🔍 Debugging

### Chrome DevTools
1. **Application Tab** → **Service Workers**
   - Status: Activated and running
   - Update on reload: Aktivieren für Development
   
2. **Application Tab** → **Cache Storage**
   - `workbox-precache` - Vorgeladene Assets
   - `supabase-api` - API-Responses
   - `images` - Bilder
   - `static-resources` - CSS/JS

3. **Application Tab** → **Manifest**
   - Überprüfe App-Name, Icons, Theme-Farben

### Console Logs
```javascript
✅ Service Worker registriert: [ServiceWorkerRegistration]
🔄 Update verfügbar - Seite muss aktualisiert werden
✅ App ist offline-bereit!
```

## 🛠️ Anpassungen

### Cache-Zeiten ändern
```javascript
// vite.config.js
workbox: {
  runtimeCaching: [{
    options: {
      expiration: {
        maxAgeSeconds: 60 * 60 * 24 // Hier anpassen
      }
    }
  }]
}
```

### Update-Intervall ändern
```javascript
// src/hooks/usePWA.js
setInterval(() => {
  registration.update();
}, 30 * 1000); // z.B. alle 30 Sekunden
```

### Dev-Mode aktivieren
```javascript
// vite.config.js
devOptions: {
  enabled: true, // Service Worker auch in Development
}
```

## 📱 iOS Besonderheiten

### Installation
1. Safari öffnen
2. **Teilen** Button (Quadrat mit Pfeil)
3. **Zum Home-Bildschirm** wählen
4. App öffnet sich im Vollbild-Modus

### PWA Features auf iOS
- ✅ Offline-Funktionalität
- ✅ App-Icon auf Home-Screen
- ✅ Vollbild-Modus
- ✅ Cache funktioniert
- ⚠️ Background Sync (eingeschränkt)
- ⚠️ Push Notifications (ab iOS 16.4+)

## 🔐 Sicherheit

### HTTPS erforderlich
- Service Workers funktionieren **nur** über HTTPS
- Ausnahme: `localhost` für Development

### Cache-Sicherheit
- Sensible Daten (Auth-Tokens) werden **nicht** gecacht
- Nur öffentliche Assets im Cache
- API-Cache hat kurze Laufzeit (5 Min)

## 📊 Performance

### Lighthouse Score Ziele
- **Performance**: 90+
- **PWA**: 100
- **Accessibility**: 90+
- **Best Practices**: 90+
- **SEO**: 90+

### Optimierungen
- ✅ Precaching wichtiger Assets
- ✅ Lazy Loading von Routes
- ✅ Code Splitting
- ✅ Image Optimization
- ✅ Runtime Caching

## 🚨 Troubleshooting

### Service Worker aktualisiert nicht
```javascript
// Chrome DevTools → Application → Service Workers
// "Update on reload" aktivieren oder:
// "Unregister" klicken und Seite neu laden
```

### Cache leeren
```javascript
// Console:
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

### Update erzwingen
```javascript
// Im Code:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.update());
  });
}
```

## 📚 Weitere Infos

- [Vite Plugin PWA Docs](https://vite-pwa-org.netlify.app/)
- [Workbox Docs](https://developers.google.com/web/tools/workbox)
- [PWA Checklist](https://web.dev/pwa-checklist/)

