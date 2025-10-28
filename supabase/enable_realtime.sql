-- Supabase Realtime für profiles Tabelle aktivieren

-- Schritt 1: Prüfen ob die profiles Tabelle in der Realtime Publication ist
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Schritt 2: profiles Tabelle zur Realtime Publication hinzufügen
-- Wenn die Tabelle bereits existiert, wird dies einen Fehler geben - das ist OK!
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    RAISE NOTICE 'profiles Tabelle wurde zur Realtime Publication hinzugefügt';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'profiles Tabelle ist bereits in der Realtime Publication';
END $$;

-- Schritt 3: Bestätigen dass es funktioniert hat
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'profiles';

-- Schritt 4: Realtime für die gesamte Tabelle aktivieren (nicht nur einzelne Spalten)
ALTER PUBLICATION supabase_realtime SET TABLE profiles;

-- Schritt 5: Überprüfung - Diese Query sollte 'profiles' zeigen
SELECT 
    schemaname,
    tablename,
    'Realtime ist aktiv' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'profiles';

-- Optional: Wenn Sie auch transactions Realtime brauchen
-- DO $$
-- BEGIN
--     ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
--     RAISE NOTICE 'transactions Tabelle wurde zur Realtime Publication hinzugefügt';
-- EXCEPTION
--     WHEN duplicate_object THEN
--         RAISE NOTICE 'transactions Tabelle ist bereits in der Realtime Publication';
-- END $$;
