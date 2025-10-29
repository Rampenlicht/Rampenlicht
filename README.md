# 🎭 Rampenlicht

**Digitale Guthaben-Verwaltung & Zahlungssystem**

Eine moderne Progressive Web App (PWA) für digitale Guthaben-Verwaltung mit QR-Code-basiertem Zahlungssystem.

---

## ✨ Features

### 👤 Für Benutzer
- 💰 **Guthaben-Übersicht** mit Realtime-Updates
- 📱 **QR-Code** für einfache Zahlungen
- 📊 **Transaktionshistorie** mit Live-Updates
- 🌙 **Dark Mode** mit automatischer Speicherung
- 📲 **PWA** - Installierbar auf iOS & Android

### 💼 Für Kassierer
- 📷 **QR-Scanner** für schnelle Transaktionen
- 👥 **Benutzer-Verwaltung**
- 📈 **Transaktions-Übersicht**
- 💵 **Kassensystem**

---

## 🛠️ Tech Stack

- ⚛️ **React 19** + **Vite 7**
- 🎨 **Tailwind CSS 4** (Dark Mode)
- 🔐 **Supabase** (Auth + Database + Realtime)
- 🧭 **React Router 7**
- 📱 **PWA** Support
- 🔄 **Real-time Updates**

---

## 🚀 Quick Start

### 1. Repository klonen
```bash
git clone <ihr-repo-url>
cd rampenlicht
```

### 2. Dependencies installieren
```bash
npm install
```

### 3. Environment Variables
Erstellen Sie eine `.env` Datei:
```env
VITE_SUPABASE_URL=https://ihr-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=ihre-anon-key
```

### 4. Supabase Setup
Führen Sie die SQL-Skripte in Supabase aus:
```bash
# 1. Profiles Tabelle
supabase/profiles_table.sql

# 2. Transactions Tabelle
supabase/transactions_table.sql

# 3. Realtime aktivieren
supabase/enable_realtime.sql
```

### 5. Development Server starten
```bash
npm run dev
```

App läuft auf: `http://localhost:5173`

---

## 📦 Build & Deployment

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deployment

**Coolify/Railway (Empfohlen):**
```bash
# Siehe COOLIFY_DEPLOYMENT.md für Details
git push origin main
```

Die App ist für folgende Plattformen vorkonfiguriert:
- ✅ **Coolify** (via `nixpacks.toml` oder `Dockerfile`)
- ✅ **Railway** (via `nixpacks.toml`)
- ✅ **Render** (via `Dockerfile`)
- ⚠️ **Vercel** (via `vercel.json` - eingeschränkter Realtime Support)

**Wichtig:** Für Realtime auf iPhone verwenden Sie **SPA/Node.js Hosting**, nicht Static Site!

---

## 📱 PWA Installation

### iOS (Safari):
1. Öffnen Sie die App in Safari
2. Tippen Sie auf "Teilen" Button
3. Wählen Sie "Zum Home-Bildschirm"

### Android (Chrome):
1. Öffnen Sie die App in Chrome
2. Tippen Sie auf "Menü" (3 Punkte)
3. Wählen Sie "App installieren"

---

## 🗂️ Projekt-Struktur

```
rampenlicht/
├── public/
│   ├── manifest.json          # PWA Manifest
│   ├── icon-192x192.png       # App Icon
│   └── icon-512x512.png       # App Icon
├── src/
│   ├── components/
│   │   ├── dashboard/         # Dashboard-Komponenten
│   │   │   ├── BalanceCard.jsx
│   │   │   ├── QRDisplay.jsx
│   │   │   ├── UserCard.jsx
│   │   │   └── RecentTransactions.jsx
│   │   ├── BottomNav.jsx      # Mobile Navigation
│   │   ├── HeaderFix.jsx      # Fixed Header
│   │   └── ProtectedRoute.jsx # Route Protection
│   ├── contexts/
│   │   └── AuthContext.jsx    # Auth State Management
│   ├── pages/
│   │   ├── Dashboards/
│   │   │   ├── User.jsx       # User Dashboard
│   │   │   └── Cashier.jsx    # Kassierer Dashboard
│   │   ├── Tabs/
│   │   │   └── HomeTab.jsx    # Home Tab Content
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Home.jsx           # Root Redirect
│   ├── services/
│   │   ├── authService.js     # Supabase Auth
│   │   └── profileService.js  # Profile Management
│   ├── lib/
│   │   └── supabase.js        # Supabase Client
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css              # Tailwind + Custom Styles
├── supabase/
│   ├── profiles_table.sql     # Profiles Schema + RLS
│   ├── transactions_table.sql # Transactions Schema + RLS
│   └── enable_realtime.sql    # Realtime Configuration
├── nixpacks.toml              # Coolify/Railway Config
├── Dockerfile                 # Docker Build
├── vercel.json                # Vercel Config
└── package.json
```

---

## 🔐 Sicherheit

### Row Level Security (RLS)
Alle Supabase-Tabellen sind mit RLS geschützt:
- ✅ Benutzer können nur ihre eigenen Daten sehen
- ✅ Kassierer haben erweiterte Rechte
- ✅ Automatische User-ID Validierung

### Environment Variables
- ✅ Keine Secrets im Code
- ✅ `.env` wird nicht committed
- ✅ `VITE_` Präfix für Client-Side Variablen

---

## 🌐 Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+ (iOS 14+)
- ✅ Samsung Internet 14+

---

## 📚 Dokumentation

Weitere Dokumentation finden Sie in:
- 📄 `COOLIFY_DEPLOYMENT.md` - Deployment Guide
- 📄 `MD/SUPABASE_SETUP.md` - Supabase Setup
- 📄 `MD/ROLLE_AENDERN.md` - Rollen ändern
- 📄 `MD/IPHONE_REALTIME_DEBUG.md` - Realtime Debugging

---

## 🐛 Bekannte Issues

### Realtime auf iPhone
**Problem:** Realtime-Updates funktionieren nicht bei Static Site Hosting  
**Lösung:** Verwenden Sie SPA/Node.js Hosting (Coolify, Railway, Render)

Details: Siehe `MD/IPHONE_REALTIME_DEBUG.md`

---

## 🤝 Contributing

1. Fork das Repository
2. Erstellen Sie einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffnen Sie einen Pull Request

---

## 📝 Lizenz

Dieses Projekt ist private/proprietär.

---

## 👥 Team

Entwickelt von Jens für Rampenlicht

---

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Dokumentation
2. Supabase Logs prüfen
3. Browser DevTools Console prüfen

---

**Version:** 0.0.0  
**Letztes Update:** Oktober 2025
