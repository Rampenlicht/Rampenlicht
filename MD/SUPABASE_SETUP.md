# Supabase Setup Anleitung

## 1. Supabase Projekt erstellen

1. Gehen Sie zu [https://supabase.com](https://supabase.com)
2. Erstellen Sie ein kostenloses Konto
3. Erstellen Sie ein neues Projekt
4. Warten Sie, bis das Projekt eingerichtet ist

## 2. API Credentials holen

1. Gehen Sie zu **Project Settings** (Zahnrad-Symbol)
2. Klicken Sie auf **API** in der Seitenleiste
3. Kopieren Sie:
   - **Project URL** (z.B. `https://xxxxx.supabase.co`)
   - **anon public** Key

## 3. Umgebungsvariablen einrichten

Erstellen Sie eine `.env` Datei im Projekt-Root:

```env
VITE_SUPABASE_URL=https://ihr-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=ihr-anon-key
```

**Wichtig:** Die `.env` Datei ist in `.gitignore` und wird nicht ins Repository committed!

## 4. Datenbank Schema einrichten

**WICHTIG:** Die Profiles-Tabelle ist erforderlich für die App!

### Schritt 1: SQL Editor öffnen
1. Gehen Sie in Ihrem Supabase-Projekt zu **SQL Editor**
2. Klicken Sie auf **New Query**

### Schritt 2: SQL Script ausführen
Kopieren Sie den Inhalt der Datei `supabase/profiles_table.sql` und führen Sie ihn aus.

Oder kopieren Sie diesen Code direkt:

```sql
-- Wichtig: Siehe supabase/profiles_table.sql für das vollständige Script
```

Die Datei `supabase/profiles_table.sql` enthält:
- ✅ **Profiles Tabelle** mit id, name, email, role, balance, qrcode_id
- ✅ **Automatische QR-Code Generierung** (eindeutige 10-stellige ID)
- ✅ **Row Level Security (RLS)** Policies
- ✅ **Trigger** für automatische Profil-Erstellung bei Registrierung
- ✅ **Rollen-System** (user, cashier, admin)
- ✅ **Balance Management**

### Schritt 3: Script ausführen
1. Fügen Sie den SQL-Code ein
2. Klicken Sie auf **Run** (oder drücken Sie Cmd/Ctrl + Enter)
3. Überprüfen Sie, dass keine Fehler aufgetreten sind

## 5. Verwendung in der App

Die Auth-Funktionen sind jetzt verfügbar:

```javascript
import { useAuth } from './contexts/AuthContext'

function MeineKomponente() {
  const { user, signIn, signUp, signOut } = useAuth()
  
  // Login
  const handleLogin = async () => {
    const { error } = await signIn(email, password)
    if (!error) {
      // Erfolgreich eingeloggt
    }
  }
  
  // Registrierung
  const handleRegister = async () => {
    const { error } = await signUp(email, password, { name: 'Max' })
    if (!error) {
      // Erfolgreich registriert
    }
  }
  
  // Logout
  const handleLogout = async () => {
    await signOut()
  }
}
```

## 6. E-Mail Bestätigung konfigurieren (Optional)

Standardmäßig verlangt Supabase eine E-Mail-Bestätigung. Zum Deaktivieren:

1. Gehen Sie zu **Authentication** → **Settings**
2. Deaktivieren Sie **Enable email confirmations**

## Fertig! 🎉

Ihre App ist jetzt mit Supabase verbunden!

