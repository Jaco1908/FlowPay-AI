CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  wallet TEXT,
  role TEXT DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE POLICY "allow_all_employees" ON employees
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

INSERT INTO employees (nombre, email, password, wallet, role)
VALUES ('Administrador', 'admin@flowpay.com', 'admin123', '', 'admin')
ON CONFLICT (email) DO NOTHING;
