-- Profiles Tabelle mit automatischer QR-Code-ID Generierung

-- 1. Profiles Tabelle erstellen
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'cashier', 'admin')),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  qrcode_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Index für schnellere Suche nach QR-Code-ID
CREATE INDEX IF NOT EXISTS idx_profiles_qrcode_id ON profiles(qrcode_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Row Level Security (RLS) aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policies für Profiles

-- Benutzer können ihr eigenes Profil sehen
CREATE POLICY "Benutzer können ihr eigenes Profil sehen"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Benutzer können ihr eigenes Profil aktualisieren (außer balance und qrcode_id)
CREATE POLICY "Benutzer können ihr eigenes Profil aktualisieren"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins können alle Profile sehen
CREATE POLICY "Admins können alle Profile sehen"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins können alle Profile aktualisieren
CREATE POLICY "Admins können alle Profile aktualisieren"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cashiers können Profile lesen (für QR-Code Scanning)
CREATE POLICY "Cashiers können Profile lesen"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('cashier', 'admin')
    )
  );

-- 5. Funktion: Unique QR-Code-ID generieren
CREATE OR REPLACE FUNCTION generate_unique_qrcode_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  qrcode_exists BOOLEAN := TRUE;
BEGIN
  -- Generiere QR-Code solange, bis eine eindeutige ID gefunden wird
  WHILE qrcode_exists LOOP
    result := '';
    
    -- Generiere 10-stelligen Code (z.B. ABC123XYZ9)
    FOR i IN 1..10 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Prüfe ob QR-Code bereits existiert
    SELECT EXISTS(SELECT 1 FROM profiles WHERE qrcode_id = result) INTO qrcode_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Funktion: Automatisches Profil erstellen nach Registrierung
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, qrcode_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Benutzer'),
    new.email,
    generate_unique_qrcode_id()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger: Profil automatisch bei Registrierung erstellen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Funktion: Updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger: Updated_at bei jeder Aktualisierung setzen
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Beispiel-Abfragen (zum Testen)
-- Profil anhand QR-Code suchen:
-- SELECT * FROM profiles WHERE qrcode_id = 'ABC123XYZ9';

-- Balance aktualisieren (nur für Admins/Cashiers):
-- UPDATE profiles SET balance = balance + 10.00 WHERE qrcode_id = 'ABC123XYZ9';

