-- RLS Policies reparieren - Diese ermöglichen korrekten Zugriff

-- SCHRITT 1: Alle alten Policies löschen
DROP POLICY IF EXISTS "Benutzer können ihr eigenes Profil sehen" ON profiles;
DROP POLICY IF EXISTS "Benutzer können ihr eigenes Profil aktualisieren" ON profiles;
DROP POLICY IF EXISTS "Admins können alle Profile sehen" ON profiles;
DROP POLICY IF EXISTS "Admins können alle Profile aktualisieren" ON profiles;
DROP POLICY IF EXISTS "Cashiers können Profile lesen" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

-- SCHRITT 2: RLS aktivieren (falls nicht aktiv)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SCHRITT 3: Neue, funktionierende Policies erstellen

-- Policy 1: Jeder authentifizierte Benutzer kann sein eigenes Profil lesen
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Jeder authentifizierte Benutzer kann sein eigenes Profil aktualisieren
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Service Role kann Profile erstellen (wichtig für Trigger!)
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (true);

-- Policy 4: Cashiers können alle Profile lesen (für QR-Code Scanning)
CREATE POLICY "Cashiers can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('cashier', 'admin')
    )
  );

-- Policy 5: Admins können alle Profile aktualisieren
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- SCHRITT 4: Überprüfung - Diese Query sollte Ihr Profil anzeigen
-- SELECT * FROM profiles WHERE id = auth.uid();

-- FERTIG! Jetzt sollte RLS funktionieren.

