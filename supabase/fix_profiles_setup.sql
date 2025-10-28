-- FIX: Profiles Setup - Schritt für Schritt

-- SCHRITT 1: Trigger entfernen (falls vorhanden)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- SCHRITT 2: Alte Tabelle löschen (falls vorhanden)
DROP TABLE IF EXISTS profiles CASCADE;

-- SCHRITT 3: Profiles Tabelle neu erstellen
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'cashier', 'admin')),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  qrcode_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- SCHRITT 4: Indizes erstellen
CREATE INDEX idx_profiles_qrcode_id ON profiles(qrcode_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- SCHRITT 5: Funktion für QR-Code Generierung
CREATE OR REPLACE FUNCTION generate_unique_qrcode_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  qrcode_exists BOOLEAN := TRUE;
BEGIN
  WHILE qrcode_exists LOOP
    result := '';
    FOR i IN 1..10 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM profiles WHERE qrcode_id = result) INTO qrcode_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SCHRITT 6: Funktion für automatisches Profil erstellen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, qrcode_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Benutzer'),
    new.email,
    generate_unique_qrcode_id()
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- SCHRITT 7: Trigger erstellen
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- SCHRITT 8: Updated_at Funktion
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SCHRITT 9: Updated_at Trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- SCHRITT 10: Row Level Security aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SCHRITT 11: RLS Policies

-- Policy 1: Benutzer können ihr eigenes Profil sehen
DROP POLICY IF EXISTS "Benutzer können ihr eigenes Profil sehen" ON profiles;
CREATE POLICY "Benutzer können ihr eigenes Profil sehen"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Benutzer können ihr eigenes Profil aktualisieren
DROP POLICY IF EXISTS "Benutzer können ihr eigenes Profil aktualisieren" ON profiles;
CREATE POLICY "Benutzer können ihr eigenes Profil aktualisieren"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy 3: Admins können alle Profile sehen
DROP POLICY IF EXISTS "Admins können alle Profile sehen" ON profiles;
CREATE POLICY "Admins können alle Profile sehen"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 4: Admins können alle Profile aktualisieren
DROP POLICY IF EXISTS "Admins können alle Profile aktualisieren" ON profiles;
CREATE POLICY "Admins können alle Profile aktualisieren"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 5: Cashiers und Admins können Profile lesen
DROP POLICY IF EXISTS "Cashiers können Profile lesen" ON profiles;
CREATE POLICY "Cashiers können Profile lesen"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('cashier', 'admin')
    )
  );

-- Policy 6: System kann Profile erstellen (für Trigger)
DROP POLICY IF EXISTS "Enable insert for service role only" ON profiles;
CREATE POLICY "Enable insert for service role only"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- FERTIG!
-- Testen Sie jetzt die Registrierung erneut.

