-- Realtime für die profiles Tabelle aktivieren

-- SCHRITT 1: Realtime für die profiles Tabelle aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- SCHRITT 2: Überprüfen ob Realtime aktiviert ist
-- Führen Sie diese Query aus um zu sehen ob profiles dabei ist:
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- WICHTIG: Sie müssen auch in Ihrem Supabase Dashboard folgendes tun:
-- 1. Gehen Sie zu "Database" → "Replication"
-- 2. Aktivieren Sie "profiles" für Realtime
-- 3. Klicken Sie auf "Save"

-- Alternative: Falls das nicht funktioniert, erstellen Sie eine neue Publication
-- DROP PUBLICATION IF EXISTS profiles_realtime;
-- CREATE PUBLICATION profiles_realtime FOR TABLE profiles;

