/*
  # FlowPay AI — Core Schema

  1. New Tables
    - `rules` — stores parsed payment rules from natural language input
      - `id` (uuid, PK)
      - `raw_text` (text) — original user input
      - `destinatarios` (jsonb) — parsed recipients array
      - `monto_por_persona` (decimal) — amount per person
      - `moneda` (text) — currency, defaults to USDC
      - `frecuencia` (text) — payment frequency
      - `dia_de_pago` (text) — day of payment
      - `status` (text) — rule status, defaults to active
      - `created_at` (timestamptz)
    - `executions` — stores individual payment execution records
      - `id` (uuid, PK)
      - `rule_id` (uuid, FK → rules.id)
      - `destinatario_nombre` (text)
      - `destinatario_wallet` (text)
      - `monto` (decimal)
      - `tx_hash` (text) — Solana transaction signature
      - `status` (text) — defaults to pending
      - `executed_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Service role used for all operations (edge functions)
*/

CREATE TABLE IF NOT EXISTS rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_text TEXT NOT NULL,
  destinatarios JSONB NOT NULL,
  monto_por_persona DECIMAL NOT NULL,
  moneda TEXT DEFAULT 'USDC',
  frecuencia TEXT,
  dia_de_pago TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES rules(id),
  destinatario_nombre TEXT,
  destinatario_wallet TEXT,
  monto DECIMAL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'rules' AND rowsecurity = true
  ) THEN
    ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'executions' AND rowsecurity = true
  ) THEN
    ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Allow service_role full access (edge functions use service key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rules' AND policyname = 'Service role full access on rules'
  ) THEN
    CREATE POLICY "Service role full access on rules"
      ON rules FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'executions' AND policyname = 'Service role full access on executions'
  ) THEN
    CREATE POLICY "Service role full access on executions"
      ON executions FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to read rules and executions (for frontend display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rules' AND policyname = 'Anon can read rules'
  ) THEN
    CREATE POLICY "Anon can read rules"
      ON rules FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'executions' AND policyname = 'Anon can read executions'
  ) THEN
    CREATE POLICY "Anon can read executions"
      ON executions FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;