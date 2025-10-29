-- Transactions Tabelle erweitern für Sender/Empfänger Info
-- Führen Sie dies in Supabase SQL Editor aus

-- WICHTIG: Zuerst die alte CHECK Constraint entfernen
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Neue CHECK Constraint mit 'receive' hinzufügen
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('add', 'remove', 'send', 'receive'));

-- Neue Spalten hinzufügen
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);

-- RLS Policies aktualisieren (Benutzer können Transaktionen sehen wo sie Sender ODER Empfänger sind)
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = sender_id 
    OR auth.uid() = receiver_id
  );

