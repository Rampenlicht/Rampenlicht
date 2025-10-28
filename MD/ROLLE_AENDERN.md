# Benutzer-Rolle ändern

## So machen Sie einen Benutzer zum Kassierer:

### Option 1: Direkt in Supabase (Empfohlen für Tests)

1. Öffnen Sie Ihr Supabase-Projekt
2. Gehen Sie zu **Table Editor**
3. Öffnen Sie die Tabelle `profiles`
4. Suchen Sie den Benutzer (nach E-Mail)
5. Klicken Sie auf die Zeile zum Bearbeiten
6. Ändern Sie das Feld `role` von `user` zu `cashier`
7. Speichern Sie die Änderung

### Option 2: SQL Query

Führen Sie diese SQL-Query im SQL Editor aus:

```sql
-- Benutzer zum Kassierer machen (ersetzen Sie die E-Mail)
UPDATE profiles 
SET role = 'cashier' 
WHERE email = 'ihre@email.de';
```

### Option 3: Über die API (für die App)

Sie können auch die profileService verwenden:

```javascript
import { profileService } from './services/profileService'

// Benutzer zum Kassierer machen
await profileService.updateRole(userId, 'cashier')
```

## Verfügbare Rollen:

- **`user`** - Normaler Benutzer (Standard)
  - Sieht: Home, Verlauf, Profil
  - Dashboard: `/dashboards/user`
  - Navigation: Blau

- **`cashier`** - Kassierer
  - Sieht: Home, Verlauf, Profil, Scanner, User
  - Dashboard: `/dashboards/cashier`
  - Navigation: Grün

- **`admin`** - Administrator (für später)
  - Volle Rechte
  - Kann alle Profile sehen und bearbeiten

## So funktioniert das Routing:

1. **Login:** Nach dem Login wird die Rolle aus der Datenbank geladen
2. **Automatische Weiterleitung:**
   - User → `/dashboards/user`
   - Cashier → `/dashboards/cashier`
3. **Geschützte Routen:** 
   - Jede Route prüft die Rolle
   - Bei falscher Rolle: Automatische Weiterleitung zum richtigen Dashboard

## Test-Workflow:

1. Registrieren Sie einen neuen Benutzer
2. Ändern Sie die Rolle in Supabase zu `cashier`
3. Loggen Sie sich erneut ein
4. Sie werden automatisch zum Kassierer-Dashboard weitergeleitet
5. Die BottomNav zeigt jetzt 5 Tabs (inkl. Scanner & User)
6. Die Farbe ist jetzt Grün statt Blau

## Wichtig:

- Die Rolle wird in der `profiles` Tabelle gespeichert
- Nach dem Ändern der Rolle muss sich der Benutzer neu einloggen
- Die ProtectedRoute-Komponente verhindert unbefugten Zugriff

