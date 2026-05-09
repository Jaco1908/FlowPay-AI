/*
  # FlowPay AI - Core Tables

  1. New Tables
    - `rules` - Stores parsed payment rules from natural language input
      - `id` (uuid, primary key)
      - `raw_text` (text) - Original user input
      - `destinatarios` (jsonb) - Parsed recipients array
      - `monto_por_persona` (decimal) - Amount per person
      - `moneda` (text) - Currency, defaults to USDC
      - `frecuencia` (text) - Payment frequency
      - `dia_de_pago` (text) - Day of payment
      - `status` (text) - Rule status, defaults to active
      - `created_at` (timestamptz)
    - `executions` - Stores individual transaction execution records
      - `id` (uuid, primary key)
      - `rule_id` (uuid, FK to rules)
      - `destinatario_nombre` (text)
      - `destinatario_wallet` (text)
      - `monto` (decimal)
      - `tx_hash` (text)
      - `status` (text) - defaults to pending
      - `executed_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Service role used for all operations (Edge Functions)
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
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Edge Functions use service role)
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
