# FlowPay AI

> B2B Command Center para automatizar nóminas, facturación y off-ramp en Solana usando lenguaje natural.

Construido en el **WEB3PACK Hackathon 2026**.

---

## ¿Qué hace?

FlowPay AI permite a administradores de empresas automatizar pagos cripto escribiendo una sola frase en español o inglés:

> *"Paga 0.05 SOL a Ana, Luis y Carlos cada viernes"*
> *"Genera factura de $1500 a Acme Inc por servicios de desarrollo"*
> *"Convierte 2 SOL a USD en mi cuenta bancaria"*

La IA interpreta la instrucción, clasifica el intent y ejecuta transacciones reales en Solana — cada una con hash verificable on-chain.

---

## Funcionalidades

### Admin
- **Command Center** — Input de lenguaje natural con chips de acción rápida (Pagar Nómina / Generar Factura / Convertir a Fiat)
- **Pagos automáticos** — Ejecuta transferencias SOL en Solana Devnet con verificación on-chain
- **Reglas recurrentes** — Vista calendario y lista, toggle activo/pausado por regla
- **Gestión de equipo** — CRUD de colaboradores con wallets de Solana
- **Facturas** — Generación, seguimiento (pendiente/pagada/cancelada) con previsualización de recibo
- **Off-Ramp simulado** — Conversión cripto→fiat con precio SOL en tiempo real (CoinGecko)
- **Dashboard** — Gráficas de SOL enviado por día, top destinatarios, resumen de facturas
- **Historial** — Todas las transacciones con hash copiable y link a Solana Explorer

### Seguridad
- Contraseñas hasheadas con SHA-256 + salt (email)
- Verificación de sesión contra DB en cada carga
- Edge Functions protegidas con header secreto
- Brute force protection (5 intentos → 30s lockout)
- Recuperación de contraseña con token temporal

---

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS 3.4 + Radix UI |
| Animaciones | Framer Motion |
| Gráficas | Recharts |
| Backend | Supabase Edge Functions (Deno) |
| Base de datos | Supabase (PostgreSQL) |
| IA | Groq API — `llama-3.1-8b-instant` |
| Blockchain | Solana Devnet (`@solana/web3.js`) |
| Wallet | Phantom Wallet Adapter |
| Scheduler | pg_cron + pg_net (Supabase) |
| Price Oracle | CoinGecko API (tiempo real) |

---

## Requisitos previos

- **Node.js** v18 o superior — [nodejs.org](https://nodejs.org)
- **npm** v9 o superior (incluido con Node.js)
- **Cuenta Supabase** — [supabase.com](https://supabase.com)
- **Cuenta Groq** (para la API key) — [console.groq.com](https://console.groq.com)
- **Phantom Wallet** (para firmar transacciones en demo) — [phantom.app](https://phantom.app)

---

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd Hackathon
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_FLOWPAY_SECRET=tu-secreto
```

> Los valores reales los obtiene el equipo directamente del owner del proyecto.

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La app estará en `http://localhost:8080`

---

## Configuración de Supabase

### Tablas necesarias

Ejecuta en **Supabase → SQL Editor**:

```sql
-- Empleados / usuarios
create table employees (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text unique not null,
  wallet text,
  password text not null,
  role text default 'employee',
  created_at timestamptz default now()
);

-- Reglas de pago automático
create table rules (
  id uuid primary key default gen_random_uuid(),
  raw_text text,
  destinatarios jsonb,
  monto_por_persona numeric,
  moneda text default 'SOL',
  frecuencia text,
  dia_de_pago text,
  status text default 'active',
  last_executed_at timestamptz,
  created_at timestamptz default now()
);

-- Historial de ejecuciones
create table executions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references rules(id) on delete set null,
  destinatario_nombre text,
  destinatario_wallet text,
  monto numeric,
  moneda text,
  tx_hash text,
  status text,
  executed_at timestamptz default now()
);

-- Facturas
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_id text unique not null,
  cliente text not null,
  monto numeric not null,
  moneda_factura text default 'USD',
  moneda_pago text default 'SOL',
  descripcion text,
  status text default 'pendiente',
  raw_text text,
  created_at timestamptz default now()
);
```

### Usuario admin inicial

```sql
insert into employees (nombre, email, password, role)
values (
  'Admin',
  'admin@flowpay.com',
  encode(digest('admin@flowpay.com:admin123', 'sha256'), 'hex'),
  'admin'
);
```

### Edge Functions

```bash
# Login con tu cuenta de Supabase
npx supabase login

# Desplegar las funciones
npx supabase functions deploy rules-parse
npx supabase functions deploy rules-execute
npx supabase functions deploy scheduler
```

Configura los secretos en **Supabase → Edge Functions → Manage secrets**:

| Nombre | Valor |
|--------|-------|
| `GROQ_API_KEY` | Tu API key de Groq |
| `FLOWPAY_SECRET` | El mismo valor que `VITE_FLOWPAY_SECRET` |
| `EMPRESA_PRIVATE_KEY` | Array JSON de la private key de la wallet empresa |

---

## Dependencias principales

```
react@18                    UI framework
react-router-dom@6          Routing
typescript@5                Type safety
tailwindcss@3.4             Estilos utility-first
framer-motion@12            Animaciones
recharts@2                  Gráficas
@radix-ui/*                 Componentes accesibles
@solana/web3.js@1           Transacciones en Solana
@solana/wallet-adapter-*    Integración Phantom Wallet
@supabase/supabase-js@2     Cliente de Supabase
lucide-react                Íconos
clsx + tailwind-merge       Utilidades de clases CSS
```

---

## Pantallas

| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/login` | Autenticación con brute-force protection | Todos |
| `/` | Command Center — input de lenguaje natural | Admin |
| `/confirm` | Confirmación y ejecución de pagos en Solana | Admin |
| `/success` | Resultado de transacciones con hashes on-chain | Admin |
| `/rules` | Reglas activas — vista calendario y lista | Admin |
| `/history` | Historial completo de transacciones | Admin |
| `/team` | Gestión de colaboradores | Admin |
| `/invoice` | Confirmar y crear factura con previsualización | Admin |
| `/invoices` | Listado y gestión de facturas | Admin |
| `/offramp` | Conversión cripto → fiat | Admin |
| `/dashboard` | Gráficas y métricas | Admin |
| `/employee` | Dashboard del colaborador | Employee |

---

## Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@flowpay.com | admin123 |
| Empleado | (asignado por admin en /team) | (asignado por admin) |

---

## Scripts

```bash
npm run dev        # Servidor de desarrollo (localhost:8080)
npm run build      # Build de producción
npm run preview    # Preview del build
npm run lint       # Linter ESLint
```

---

## Red

Actualmente en **Solana Devnet**. Las transacciones son reales y verificables en [explorer.solana.com](https://explorer.solana.com?cluster=devnet).

Para solicitar SOL de prueba: [faucet.solana.com](https://faucet.solana.com)

---

## Equipo

Construido en el **WEB3PACK Hackathon 2026** en 48 horas.
