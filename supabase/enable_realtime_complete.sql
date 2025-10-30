-- Supabase Realtime für profiles UND transactions Tabellen aktivieren
-- Für self-hosted Supabase

-- ============================================
-- PROFILES TABELLE
-- ============================================

-- Schritt 1: profiles Tabelle zur Realtime Publication hinzufügen
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    RAISE NOTICE '✅ profiles Tabelle wurde zur Realtime Publication hinzugefügt';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️  profiles Tabelle ist bereits in der Realtime Publication';
END $$;

-- ============================================
-- TRANSACTIONS TABELLE
-- ============================================

-- Schritt 2: transactions Tabelle zur Realtime Publication hinzufügen
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    RAISE NOTICE '✅ transactions Tabelle wurde zur Realtime Publication hinzugefügt';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️  transactions Tabelle ist bereits in der Realtime Publication';
END $$;

-- ============================================
-- ÜBERPRÜFUNG
-- ============================================

-- Zeige alle Tabellen mit aktiviertem Realtime
SELECT 
    schemaname,
    tablename,
    '✅ Realtime aktiv' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('profiles', 'transactions')
ORDER BY tablename;

-- Falls keine Ergebnisse, zeige ALLE Realtime-Tabellen
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

