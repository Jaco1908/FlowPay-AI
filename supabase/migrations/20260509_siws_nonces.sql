-- Tabla para nonces de un solo uso del flujo Sign In With Solana
CREATE TABLE IF NOT EXISTS siws_nonces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key  text NOT NULL,
  nonce       text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_siws_nonces_lookup ON siws_nonces (public_key, nonce, used, expires_at);
