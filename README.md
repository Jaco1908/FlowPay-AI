# FlowPay AI

> B2B Command Center para automatizar nóminas, facturación y off-ramp en Solana usando lenguaje natural.

Construido en el **WEB3PACK Hackathon 2026** — transacciones reales en Solana Devnet, verificables on-chain.

---

## ¿Qué hace?

FlowPay AI permite a administradores de empresas automatizar pagos cripto escribiendo una sola frase:

> *"Paga 0.05 SOL a Ana, Luis y Carlos cada viernes"*
> *"Genera factura de $1500 a Acme Inc por servicios de desarrollo"*
> *"Convierte 2 SOL a USD en mi cuenta bancaria"*

La IA interpreta la instrucción, clasifica el intent y ejecuta transacciones reales en Solana — con hash verificable on-chain y registro inmutable en un smart contract Anchor desplegado en Devnet.

Incluye paneles separados para administradores y empleados, con funcionalidades completas de gestión de nóminas, facturación, off-ramp y más.

---

## Arquitectura

```
Usuario (Browser)
    │
    ▼
Vercel — React 18 SPA (TypeScript + Vite)
    │
    ├─► Panel Admin
    │   ├── Command Center (NLP → reglas)
    │   ├── Dashboard (métricas, gráficas)
    │   ├── Gestión Equipo (CRUD empleados)
    │   ├── Facturas (generación, seguimiento)
    │   ├── Off-Ramp (SOL → USD)
    │   └── Historial (transacciones on-chain)
    │
    ├─► Panel Empleado
    │   ├── Balance Wallet (tiempo real)
    │   ├── Historial Pagos (ejecuciones recibidas)
    │   ├── Reglas Activas (visualización)
    │   ├── Configuración CLABE (cuenta bancaria)
    │   ├── Solicitud Retiros (off-ramp)
    │   └── Cambio Contraseña
    │
    ├─► Supabase Edge Functions (Deno)
    │       ├── rules-parse    → Groq AI (NLP, llama-3.1-8b-instant)
    │       ├── rules-execute  → Solana Devnet (pagos inmediatos)
    │       ├── scheduler      → Solana Devnet (pagos recurrentes)
    │       ├── siws-nonce     → Sign In With Solana
    │       └── siws-verify    → Sign In With Solana
    │
    ├─► Supabase PostgreSQL
    │       ├── Tablas: users, rules, executions, invoices, employees
    │       └── pg_cron + pg_net → scheduler (cada minuto)
    │
    └─► Solana Devnet
            ├── Transferencias SOL (SystemProgram)
            ├── FlowPay Anchor Program (PDAs — registro inmutable)
            │   Dv3iyDKKqxxno1DvuJGHfp6MDHhQsVVejfztcmoqUnds
            └── StreamFlow Finance SDK (payment streams)
```

---

## Funcionalidades

### Panel Admin
| Feature | Descripción |
|---------|-------------|
| **Command Center** | Input en lenguaje natural con chips de acción rápida |
| **Pagos directos** | Transferencias SOL inmediatas con verificación on-chain |
| **Reglas recurrentes** | Pagos automáticos (diario / semanal / mensual / única vez) |
| **Registro on-chain** | Cada pago queda registrado en el contrato FlowPay (Anchor) |
| **Payment Streams** | Integración StreamFlow Finance para pagos por segundo |
| **Gestión de equipo** | CRUD de colaboradores con wallets Solana |
| **Facturas** | Generación, seguimiento y previsualización de recibos |
| **Off-Ramp** | Conversión cripto → fiat con precio SOL en tiempo real |
| **Dashboard** | Gráficas de SOL enviado, top destinatarios, métricas |
| **Historial** | Transacciones con hash copiable y link a Solana Explorer |

### Panel Empleado
| Feature | Descripción |
|---------|-------------|
| **Balance de Wallet** | Visualización en tiempo real del saldo SOL |
| **Historial de Pagos** | Lista de ejecuciones recibidas con detalles on-chain |
| **Reglas Activas** | Visualización de reglas recurrentes aplicables |
| **Cambio de Contraseña** | Actualización segura de credenciales |
| **Configuración CLABE** | Registro de cuenta bancaria para retiros (bancos ecuatorianos) |
| **Solicitud de Retiros** | Conversión SOL → USD a cuenta bancaria con confirmación |

### Seguridad
- Contraseñas hasheadas con SHA-256 + salt (email)
- Verificación de sesión contra DB en cada carga de página
- Edge Functions protegidas con header secreto (`X-FlowPay-Secret`)
- Scheduler protegido con secreto dedicado (`FLOWPAY_CRON_SECRET`) guardado en Supabase Vault
- Sign In With Solana (SIWS) — autenticación Web3 nativa
- Brute force protection (5 intentos fallidos → 30s lockout)
- Recuperación de contraseña con token temporal de un solo uso

### Automatización
- **pg_cron** dispara el scheduler cada minuto
- **pg_net** hace HTTP POST a la Edge Function sin bloquear el DB
- Logs auditables en tabla `scheduler_logs`
- Secreto leído desde **Supabase Vault** (nunca hardcodeado)

---

## Instalación y Setup

### Prerrequisitos
- Node.js 18+
- Rust 1.70+ (para Anchor)
- Solana CLI
- Supabase CLI
- Yarn o npm

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/FlowPay-AI.git
cd FlowPay-AI
```

### 2. Instalar dependencias
```bash
# Frontend
npm install

# Programa Solana (Anchor)
cd programs/flowpay
anchor build
```

### 3. Configurar Supabase
```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase local
supabase start

# Aplicar migraciones
supabase db reset
```

### 4. Variables de entorno
Crear `.env.local` con:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GROQ_API_KEY=your_groq_key
VITE_EMPRESA_WALLET_ADDRESS=your_solana_wallet
```

### 5. Ejecutar
```bash
# Frontend
npm run dev

# Programa Solana (en otra terminal)
anchor deploy
```

---

## Tech Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS 3.4 + Radix UI |
| Animaciones | Framer Motion |
| Gráficas | Recharts |
| Formularios | React Hook Form + Zod |
| Backend | Supabase Edge Functions (Deno) |
| Base de datos | Supabase (PostgreSQL) + pg_cron + pg_net |
| Automatización | Supabase Vault para secretos |
| IA | Groq API — `llama-3.1-8b-instant` |
| Blockchain | Solana Devnet · `@solana/web3.js` · `@solana/wallet-adapter` |
| Smart Contract | Anchor v0.30 · Rust |
| Payment Streams | StreamFlow Finance SDK v12 |
| Wallet | Phantom · Solflare |
| Price Oracle | CoinGecko API |
| Deploy | Vercel (frontend) + Supabase (backend) |
| Testing | ESLint + TypeScript strict mode |
| Build Tools | Vite + Cargo |

---

## Archivos Adicionales

- **[AUDIT.md](AUDIT.md)** — Reporte de auditoría de seguridad
- **[PITCH.md](PITCH.md)** — Presentación del proyecto para inversores
- **[JUDGE_REPORT.md](JUDGE_REPORT.md)** — Evaluación del hackathon
- **[supabase/schema.sql](supabase/schema.sql)** — Esquema completo de la base de datos
- **[programs/flowpay/](programs/flowpay/)** — Código fuente del smart contract Anchor

---

## Pantallas

| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/login` | Email/password o Sign In With Solana | Todos |
| `/` | Command Center — input lenguaje natural | Admin |
| `/confirm` | Confirmación y ejecución de pagos | Admin |
| `/success` | Resultado con hashes on-chain + registro Anchor | Admin |
| `/rules` | Reglas activas — vista calendario y lista | Admin |
| `/history` | Historial completo de transacciones | Admin |
| `/team` | CRUD de colaboradores | Admin |
| `/invoice` | Confirmar y crear factura | Admin |
| `/invoices` | Listado y gestión de facturas | Admin |
| `/offramp` | Conversión cripto → fiat | Admin |
| `/dashboard` | Métricas y gráficas | Admin |
| `/employee` | Dashboard del colaborador | Employee |

---

## Inicio rápido (desarrollo local)

### Requisitos
- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **Phantom Wallet** (extensión browser) — [phantom.app](https://phantom.app)
- Cuenta **Supabase** — [supabase.com](https://supabase.com)
- API key **Groq** — [console.groq.com](https://console.groq.com)

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/flowpay-ai.git
cd flowpay-ai
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores reales (ver tabla en la sección [Variables de entorno](#variables-de-entorno)).

### 3. Levantar dev server

```bash
npm run dev
# → http://localhost:5173
```

---

## Configuración de Supabase

### Paso 1 — Crear el esquema (SQL Editor)

Ejecuta este script completo en **Supabase → SQL Editor → New query**:

```sql
-- ── Tablas principales ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employees (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  wallet     TEXT,
  role       TEXT DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rules (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_text          TEXT NOT NULL,
  destinatarios     JSONB NOT NULL,
  monto_por_persona DECIMAL NOT NULL,
  moneda            TEXT DEFAULT 'SOL',
  frecuencia        TEXT,
  dia_de_pago       TEXT,
  status            TEXT DEFAULT 'active',
  last_executed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executions (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id              UUID REFERENCES rules(id) ON DELETE SET NULL,
  destinatario_nombre  TEXT,
  destinatario_wallet  TEXT,
  monto                DECIMAL,
  moneda               TEXT DEFAULT 'SOL',
  tx_hash              TEXT,
  on_chain_record      TEXT,
  status               TEXT DEFAULT 'pending',
  executed_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id      TEXT UNIQUE NOT NULL,
  cliente         TEXT NOT NULL,
  monto           DECIMAL NOT NULL,
  moneda_factura  TEXT DEFAULT 'USD',
  moneda_pago     TEXT DEFAULT 'SOL',
  descripcion     TEXT,
  status          TEXT DEFAULT 'pendiente',
  raw_text        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Scheduler logs (pg_cron audit trail) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS scheduler_logs (
  id              BIGSERIAL PRIMARY KEY,
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  net_request_id  BIGINT,
  status          TEXT NOT NULL DEFAULT 'triggered',
  response_status INT,
  notes           TEXT
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE employees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_employees"  ON employees      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_rules"   ON rules          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_rules"      ON rules          FOR SELECT TO anon USING (true);
CREATE POLICY "service_role_exec"    ON executions     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_exec"       ON executions     FOR SELECT TO anon USING (true);
CREATE POLICY "service_role_inv"     ON invoices       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_logs"    ON scheduler_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Admin inicial ─────────────────────────────────────────────────────────────

INSERT INTO employees (nombre, email, password, wallet, role)
VALUES ('Administrador', 'admin@flowpay.com', 'admin123', '', 'admin')
ON CONFLICT (email) DO NOTHING;
```

### Paso 2 — pg_cron + pg_net (automatización)

Ejecuta este segundo script **después** del primero:

```sql
-- Habilitar extensiones (ya vienen preinstaladas en Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Guardar el secreto en Vault
-- Reemplaza 'tu-flowpay-cron-secret' con el valor de FLOWPAY_CRON_SECRET
SELECT vault.create_secret(
  'tu-flowpay-cron-secret',
  'flowpay_cron_secret',
  'Secret para pg_cron → scheduler Edge Function'
);

-- Función que dispara el scheduler
CREATE OR REPLACE FUNCTION public.flowpay_trigger_scheduler()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, vault AS $$
DECLARE
  v_secret     text;
  v_request_id bigint;
  v_url        text := 'https://TU-PROJECT-REF.supabase.co/functions/v1/scheduler';
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'flowpay_cron_secret' LIMIT 1;

  IF v_secret IS NULL THEN
    INSERT INTO scheduler_logs (status, notes)
      VALUES ('error', 'Vault secret flowpay_cron_secret no encontrado');
    RETURN;
  END IF;

  SELECT net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-flowpay-secret', v_secret
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  INSERT INTO scheduler_logs (net_request_id, status) VALUES (v_request_id, 'triggered');
EXCEPTION WHEN OTHERS THEN
  INSERT INTO scheduler_logs (status, notes) VALUES ('error', SQLERRM);
END;
$$;

-- Cron job: cada minuto (ideal para demo)
SELECT cron.schedule(
  'flowpay-scheduler',
  '* * * * *',
  'SELECT public.flowpay_trigger_scheduler()'
);
```

> Reemplaza `TU-PROJECT-REF` con tu project ref de Supabase (ej: `ofnijwxokgzdzoiomptp`).

### Paso 3 — Edge Functions

```bash
# Login (solo la primera vez)
npx supabase login

# Vincular al proyecto
npx supabase link --project-ref TU-PROJECT-REF

# Configurar secrets de las funciones
npx supabase secrets set \
  GROQ_API_KEY=tu-groq-api-key \
  FLOWPAY_SECRET=tu-flowpay-secret \
  FLOWPAY_CRON_SECRET=tu-flowpay-cron-secret \
  EMPRESA_WALLET_PRIVATE_KEY=tu-private-key-base58

# Desplegar funciones
npx supabase functions deploy rules-parse
npx supabase functions deploy rules-execute
npx supabase functions deploy scheduler --no-verify-jwt
npx supabase functions deploy siws-nonce
npx supabase functions deploy siws-verify
```

> El scheduler se despliega con `--no-verify-jwt` porque pg_cron usa un header secreto en lugar de JWT.

---

## Deploy en Vercel

### Opción A — GitHub (recomendado)

1. Haz push del repo a GitHub
2. Ve a [vercel.com/new](https://vercel.com/new) e importa el repositorio
3. Vercel detecta Vite automáticamente (build: `npm run build`, output: `dist`)
4. Agrega las variables de entorno en **Settings → Environment Variables**:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://tu-project-ref.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key pública |
| `VITE_FLOWPAY_SECRET` | Tu secreto de Edge Functions |
| `VITE_EMPRESA_WALLET_ADDRESS` | Wallet pública de la empresa |
| `VITE_APP_URL` | `https://tu-app.vercel.app` |

5. Haz clic en **Deploy** — listo en ~60 segundos.

### Opción B — Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

Vercel leerá `vercel.json` automáticamente (SPA routing ya configurado).

### Verificar el deploy

Todas las rutas (`/login`, `/rules`, `/dashboard`, etc.) deben funcionar al refrescar el browser gracias al rewrite en `vercel.json`.

---

## Variables de entorno

### Frontend (`.env.local` en dev / Vercel dashboard en prod)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública de Supabase | `eyJhbGci...` |
| `VITE_FLOWPAY_SECRET` | Secreto compartido con Edge Functions | `fp_secret_...` |
| `VITE_EMPRESA_WALLET_ADDRESS` | Wallet pública de la empresa (Base58) | `6tV38Z...` |
| `VITE_APP_URL` | URL base de la app | `http://localhost:5173` |

### Edge Functions (Supabase Secrets — nunca en `.env`)

| Secret | Descripción |
|--------|-------------|
| `GROQ_API_KEY` | API key de Groq para el NLP |
| `FLOWPAY_SECRET` | Mismo valor que `VITE_FLOWPAY_SECRET` |
| `FLOWPAY_CRON_SECRET` | Secreto exclusivo para pg_cron (guardado en Vault) |
| `EMPRESA_WALLET_PRIVATE_KEY` | Clave privada Base58 de la wallet que firma pagos |
| `SUPABASE_URL` | Inyectado automáticamente por Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Inyectado automáticamente por Supabase |

---

## Smart Contract (Anchor)

El programa **FlowPay** está desplegado en Solana Devnet:

```
Program ID: Dv3iyDKKqxxno1DvuJGHfp6MDHhQsVVejfztcmoqUnds
```

- [Ver en Solana Explorer](https://explorer.solana.com/address/Dv3iyDKKqxxno1DvuJGHfp6MDHhQsVVejfztcmoqUnds?cluster=devnet)
- Cada pago ejecutado crea un PDA (`PaymentRecord`) con: monto, empleado, empresa, timestamp, rule_id
- Construido con Anchor v0.30.1 + `cargo build-sbf`

Para recompilar y redesplegar (requiere WSL2 + Solana CLI):

```bash
# Desde WSL2
cargo build-sbf --manifest-path programs/flowpay/Cargo.toml
solana program deploy target/deploy/flowpay.so
```

O usando Docker (multiplataforma):

```bash
docker build -f programs/flowpay/Dockerfile.build -t flowpay-builder .
docker run --rm -v $(pwd):/workspace flowpay-builder
# Luego deploy como arriba
```

---

## Monitoreo del scheduler

```sql
-- Últimas ejecuciones del cron
SELECT id, triggered_at, status, response_status, notes
FROM scheduler_logs
ORDER BY triggered_at DESC
LIMIT 20;

-- Estado del job
SELECT jobid, jobname, schedule, active FROM cron.job;

-- Historial de pg_cron
SELECT * FROM cron.job_run_details
WHERE jobname = 'flowpay-scheduler'
ORDER BY start_time DESC LIMIT 10;

-- Pausar / reanudar
UPDATE cron.job SET active = false WHERE jobname = 'flowpay-scheduler';
UPDATE cron.job SET active = true  WHERE jobname = 'flowpay-scheduler';
```

---

## Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@flowpay.com` | `admin123` |
| Empleado | Creado desde `/team` | Asignado por admin |

> La wallet de demo usa Solana Devnet. Obtén SOL gratis en [faucet.solana.com](https://faucet.solana.com).

---

## Scripts

```bash
npm run dev      # Dev server → localhost:5173
npm run build    # Build de producción → dist/
npm run preview  # Preview del build local
npm run lint     # ESLint
```

---

## Red

**Solana Devnet** — todas las transacciones son reales y verificables en [explorer.solana.com](https://explorer.solana.com?cluster=devnet).

---

## Estado Actual y Limitaciones

> **Importante:** Este proyecto está en desarrollo activo y contiene bugs críticos documentados. No se recomienda usar en producción o para transacciones reales.

### Bugs Críticos Conocidos
- **Cálculo de Lamports Incorrecto:** Los pagos se envían con un multiplicador erróneo (1000 veces menor). Ver [AUDIT.md](AUDIT.md) para detalles.
- **Confusión USDC/SOL:** La interfaz muestra "USDC" pero transfiere SOL nativo.
- **Integración de Empleados:** Los empleados agregados en `/team` no se conectan con el parser de IA.
- **Contraseñas en Texto Plano:** Las credenciales no están hasheadas correctamente.

### Limitaciones
- Solo funciona en Solana Devnet.
- Scheduler no está completamente automatizado.
- Falta integración real con USDC SPL Token.
- No hay ejecución automática de reglas recurrentes sin intervención manual.

Para una auditoría técnica completa, consulta [AUDIT.md](AUDIT.md). Para evaluación como juez de hackathon, ver [JUDGE_REPORT.md](JUDGE_REPORT.md).

---

## Documentos Adicionales

- **[AUDIT.md](AUDIT.md)** — Auditoría técnica completa con bugs, vulnerabilidades y recomendaciones.
- **[PITCH.md](PITCH.md)** — Guion de presentación para hackathons (3 minutos).
- **[JUDGE_REPORT.md](JUDGE_REPORT.md)** — Evaluación desde perspectiva de juez de hackathon Solana.

---

## Equipo

Construido en el **WEB3PACK Hackathon 2026**.
