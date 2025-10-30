-- ============================================================================
-- RAMPENLICHT APP - COMPLETE DATABASE SETUP
-- ============================================================================
-- Diese Datei enthält alle SQL-Befehle für die komplette Datenbank-Einrichtung
-- Führen Sie diese Datei in Supabase SQL Editor aus
-- ============================================================================

-- ============================================================================
-- SCHRITT 1: PROFILES TABELLE ERSTELLEN
-- ============================================================================

-- Alte Trigger und Tabellen aufräumen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TABLE IF EXISTS profiles CASCADE;

-- Profiles Tabelle erstellen
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

-- Indizes für Performance erstellen
CREATE INDEX idx_profiles_qrcode_id ON profiles(qrcode_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================================
-- SCHRITT 2: QR-CODE GENERIERUNG
-- ============================================================================

-- Funktion: Unique QR-Code-ID generieren
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

-- ============================================================================
-- SCHRITT 3: AUTOMATISCHES PROFIL ERSTELLEN BEI REGISTRIERUNG
-- ============================================================================

-- Funktion: Automatisches Profil erstellen nach Registrierung
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

-- Trigger: Profil automatisch bei Registrierung erstellen
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SCHRITT 4: UPDATED_AT AUTOMATISCH AKTUALISIEREN
-- ============================================================================

-- Funktion: Updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Updated_at bei jeder Aktualisierung setzen
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SCHRITT 5: ROW LEVEL SECURITY (RLS) FÜR PROFILES
-- ============================================================================

-- RLS aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Alle alten Policies löschen
DROP POLICY IF EXISTS "Benutzer können ihr eigenes Profil sehen" ON profiles;
DROP POLICY IF EXISTS "Benutzer können ihr eigenes Profil aktualisieren" ON profiles;
DROP POLICY IF EXISTS "Admins können alle Profile sehen" ON profiles;
DROP POLICY IF EXISTS "Admins können alle Profile aktualisieren" ON profiles;
DROP POLICY IF EXISTS "Cashiers können Profile lesen" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Cashiers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Policy 1: Benutzer können ihr eigenes Profil sehen
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Benutzer können ihr eigenes Profil aktualisieren
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

-- ============================================================================
-- SCHRITT 6: TRANSACTIONS TABELLE ERSTELLEN
-- ============================================================================

-- Transactions Tabelle erstellen
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'remove', 'send', 'receive')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  description TEXT
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);

-- ============================================================================
-- SCHRITT 7: ROW LEVEL SECURITY (RLS) FÜR TRANSACTIONS
-- ============================================================================

-- RLS aktivieren
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Alte Policies löschen
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Cashiers can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON transactions;

-- Policy 1: Benutzer können Transaktionen sehen wo sie beteiligt sind
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = sender_id 
    OR auth.uid() = receiver_id
  );

-- Policy 2: Cashiers und Admins können alle Transaktionen sehen
CREATE POLICY "Cashiers can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('cashier', 'admin')
    )
  );

-- Policy 3: Authentifizierte Benutzer können Transaktionen erstellen
CREATE POLICY "Enable insert for authenticated users"
  ON transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- SCHRITT 8: REALTIME AKTIVIEREN
-- ============================================================================

-- Profiles Tabelle zur Realtime Publication hinzufügen
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    RAISE NOTICE '✅ profiles Tabelle zur Realtime Publication hinzugefügt';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️  profiles Tabelle ist bereits in der Realtime Publication';
END $$;

-- Transactions Tabelle zur Realtime Publication hinzufügen
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    RAISE NOTICE '✅ transactions Tabelle zur Realtime Publication hinzugefügt';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️  transactions Tabelle ist bereits in der Realtime Publication';
END $$;

-- ============================================================================
-- SCHRITT 9: ÜBERPRÜFUNG
-- ============================================================================

-- Überprüfen ob alle Tabellen erstellt wurden
SELECT 
    table_name,
    'Tabelle existiert ✅' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'transactions');

-- Überprüfen ob Realtime aktiv ist
SELECT 
    schemaname,
    tablename,
    'Realtime aktiv ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('profiles', 'transactions');

-- Überprüfen ob RLS aktiviert ist
SELECT 
    tablename,
    'RLS aktiv ✅' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'transactions')
AND rowsecurity = true;

-- ============================================================================
-- FERTIG! 🎉
-- ============================================================================
-- 
-- Die Datenbank ist jetzt vollständig eingerichtet:
-- ✅ Profiles Tabelle mit automatischer QR-Code Generierung
-- ✅ Transactions Tabelle mit Sender/Empfänger Tracking
-- ✅ Row Level Security (RLS) für beide Tabellen
-- ✅ Realtime für Live-Updates
-- ✅ Automatisches Profil bei Registrierung
-- 
-- Sie können jetzt:
-- 1. Neue Benutzer registrieren (Profil wird automatisch erstellt)
-- 2. Balance verwalten
-- 3. Transaktionen tracken
-- 4. Realtime-Updates empfangen
-- 
-- ============================================================================
-- NÜTZLICHE ABFRAGEN FÜR DIE ENTWICKLUNG
-- ============================================================================

-- Alle Profile anzeigen:
-- SELECT id, name, email, role, balance, qrcode_id FROM profiles;

-- Alle Transaktionen anzeigen:
-- SELECT * FROM transactions ORDER BY timestamp DESC;

-- Profil anhand QR-Code suchen:
-- SELECT * FROM profiles WHERE qrcode_id = 'ABC123XYZ9';

-- Balance aktualisieren:
-- UPDATE profiles SET balance = balance + 10.00 WHERE id = auth.uid();

-- Rolle eines Benutzers ändern:
-- UPDATE profiles SET role = 'cashier' WHERE email = 'user@example.com';

-- Neue Transaktion erstellen:
-- INSERT INTO transactions (user_id, amount, type, description)
-- VALUES (auth.uid(), 10.50, 'add', 'Guthaben aufgeladen');

-- ============================================================================

