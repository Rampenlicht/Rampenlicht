-- Überprüfen Sie zuerst, ob Profile existieren und welche Rollen sie haben
SELECT id, name, email, role, qrcode_id 
FROM profiles;

-- Falls keine Profile existieren oder die Rolle NULL ist, können Sie diese Queries verwenden:

-- OPTION 1: Profil manuell für existierenden User erstellen (falls Trigger nicht funktioniert hat)
-- Ersetzen Sie die Werte mit Ihren echten Daten
/*
INSERT INTO profiles (id, name, email, role, qrcode_id)
VALUES (
  'user-uuid-hier',  -- UUID aus auth.users Tabelle
  'Ihr Name',
  'ihre@email.de',
  'cashier',  -- oder 'user'
  'ABC1234567'  -- 10-stelliger Code
)
ON CONFLICT (id) DO UPDATE 
SET role = 'cashier';
*/

-- OPTION 2: Rolle eines existierenden Profils ändern
-- UPDATE profiles SET role = 'cashier' WHERE email = 'ihre@email.de';

-- OPTION 3: Alle User-IDs aus auth.users anzeigen (um die richtige UUID zu finden)
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

