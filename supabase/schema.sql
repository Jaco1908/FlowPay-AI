-- FlowPay AI database schema
-- Run this in your Supabase SQL Editor

CREATE TABLE rules (
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

CREATE TABLE executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES rules(id),
  destinatario_nombre TEXT,
  destinatario_wallet TEXT,
  monto DECIMAL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
