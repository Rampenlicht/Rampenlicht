-- Transactions Tabelle erstellen

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'remove', 'send')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);

-- Row Level Security aktivieren
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Benutzer können ihre eigenen Transaktionen sehen
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Cashiers und Admins können alle Transaktionen sehen
DROP POLICY IF EXISTS "Cashiers can view all transactions" ON transactions;
CREATE POLICY "Cashiers can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('cashier', 'admin')
    )
  );

-- Policy: System kann Transaktionen erstellen
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON transactions;
CREATE POLICY "Enable insert for authenticated users"
  ON transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Test-Daten (optional, zum Testen)
-- INSERT INTO transactions (user_id, amount, type) VALUES
-- ('user-uuid-hier', 10.50, 'add'),
-- ('user-uuid-hier', -5.00, 'remove'),
-- ('user-uuid-hier', 20.00, 'send');

