# FlowPay-AI — Auditoría Técnica Completa

> Generado el 2026-05-09. Cubre todo el código fuente actual en `main`.

---

## Índice

1. [Bugs Críticos](#1-bugs-críticos)
2. [Vulnerabilidades de Seguridad](#2-vulnerabilidades-de-seguridad)
3. [Inconsistencias Lógicas](#3-inconsistencias-lógicas)
4. [Funcionalidades Rotas o Incompletas](#4-funcionalidades-rotas-o-incompletas)
5. [Problemas de Arquitectura](#5-problemas-de-arquitectura)
6. [Deuda Técnica y Calidad de Código](#6-deuda-técnica-y-calidad-de-código)
7. [Checklist de Estado General](#7-checklist-de-estado-general)

---

## 1. Bugs Críticos

### BUG-01 — Cálculo de lamports incorrecto
**Archivo:** `supabase/functions/rules-execute/index.ts:137`
**Severidad:** CRÍTICA

```ts
// ACTUAL (mal)
const lamports = Math.floor(body.monto_por_persona * 1_000_000);

// CORRECTO
const lamports = Math.floor(body.monto_por_persona * 1_000_000_000);
```

**Por qué:** SOL usa 9 decimales (1 SOL = 1,000,000,000 lamports), no 6. Con el código actual, si el admin escribe "paga 10 SOL", el sistema envía 0.01 SOL. El pago es 1000 veces menor de lo que dice la UI.

**Cómo resolverlo:** Cambiar el multiplicador a `1_000_000_000` o usar la constante importada `LAMPORTS_PER_SOL` de `@solana/web3.js`.

---

### BUG-02 — La app dice "USDC" pero envía SOL nativo
**Archivos:** `supabase/functions/rules-execute/index.ts`, todas las páginas de UI
**Severidad:** CRÍTICA

El sistema usa `SystemProgram.transfer` que transfiere **SOL nativo**. Sin embargo, toda la interfaz (historial, confirmación, dashboard del empleado) muestra "USDC".

**Por qué es grave:** Un juez técnico ejecutará la transacción y verificará en el explorer. Verá que se envió SOL, no USDC. Esto destruye la credibilidad del prototipo.

**Cómo resolverlo:** Dos opciones:
- **Opción A (más simple):** Cambiar toda la UI de "USDC" a "SOL" y ser honesto con que es SOL en Devnet.
- **Opción B (correcto):** Implementar SPL Token transfer real con la mint address de USDC en Devnet (`Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`).

---

### BUG-03 — Team page no conecta con el parser de AI
**Archivos:** `src/pages/Team.tsx`, `supabase/functions/rules-parse/index.ts:9-13`
**Severidad:** CRÍTICA

El admin puede agregar empleados con wallets reales en la página `/team`, pero el parser de IA **sigue usando los wallets hardcodeados** (`Ana`, `Luis`, `Carlos`). Los empleados registrados nunca son encontrados por el sistema.

```ts
// rules-parse/index.ts — sigue aquí después de que Team.tsx esté funcionando
const DEMO_WALLETS: Record<string, string> = {
  ana: "9T6FswBKsFy72ZE8NMfwZmAjxhV25RhfToh3AQUae5bx",
  luis: "6ALa8gVLB89oYCar8Q2DJ3zwbngjka5z3RMQy542jNu9",
  carlos: "GT2dTf1agW353aNeTSg5hEGVJA3QSSGEqsgMHDpchCTx",
};
```

**Por qué:** La función Edge no tiene acceso a la BD en este momento para resolver nombres. La integración entre las dos partes no se completó.

**Cómo resolverlo:** En `rules-parse`, inicializar Supabase client y consultar la tabla `employees` antes de resolver nombres:

```ts
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const { data: employees } = await supabase.from('employees').select('nombre, wallet');
const walletMap = Object.fromEntries(employees.map(e => [e.nombre.toLowerCase(), e.wallet]));
```

---

### BUG-04 — Query JSONB del EmployeeDashboard probablemente falla
**Archivo:** `src/pages/EmployeeDashboard.tsx:64`
**Severidad:** ALTA

```ts
supabase.from('rules')
  .select('...')
  .contains('destinatarios', JSON.stringify([{ nombre }]))
```

El operador `contains` en Supabase JSONB requiere que el JSON sea exactamente igual al almacenado. Si el registro guardado tiene `{ nombre: "ana", wallet: "..." }` y la query busca `[{ nombre: "ana" }]` (sin wallet), el match falla.

**Cómo resolverlo:** Usar una consulta con filtro de texto o un operador `@>` explícito desde SQL, o cambiar la estructura JSONB para hacer la búsqueda más robusta.

---

## 2. Vulnerabilidades de Seguridad

### SEC-01 — Contraseñas almacenadas en texto plano
**Archivo:** `src/contexts/AuthContext.tsx:36-40`, `src/pages/Team.tsx:43`
**Severidad:** CRÍTICA

```ts
// AuthContext.tsx — consulta comparando contraseña en texto plano
.eq('password', password)

// Team.tsx — guarda contraseña sin hashear
password: form.password,
```

Las contraseñas se guardan directamente en la base de datos sin ningún hash. Cualquier persona con acceso a la tabla `employees` (incluyendo a través del anon key de Supabase si RLS está mal configurado) ve todas las contraseñas.

**Cómo resolverlo:** Usar **Supabase Auth** nativo. Supabase ya tiene un sistema de autenticación completo con hash bcrypt:

```ts
// Registro
await supabase.auth.signUp({ email, password })

// Login
await supabase.auth.signInWithPassword({ email, password })
```

---

### SEC-02 — Sistema de autenticación custom sin JWT
**Archivo:** `src/contexts/AuthContext.tsx`
**Severidad:** ALTA

El sistema de auth actual guarda el usuario en `localStorage` como JSON plano sin ningún token firmado. Cualquier script puede escribir en `localStorage` y suplantar a cualquier usuario incluyendo admins.

```ts
localStorage.setItem('flowpay_user', JSON.stringify(employee)); // sin firma, sin expiración
```

**Cómo resolverlo:** Migrar a Supabase Auth. Proporciona JWT firmados, expiración automática y refresh tokens.

---

### SEC-03 — CORS completamente abierto en Edge Functions
**Archivos:** `supabase/functions/rules-parse/index.ts:3-7`, `supabase/functions/rules-execute/index.ts:12-17`
**Severidad:** MEDIA

```ts
"Access-Control-Allow-Origin": "*",
```

Cualquier sitio web puede llamar estas Edge Functions desde un browser. En un contexto de producción, los fondos de la empresa podrían activarse desde sitios maliciosos.

**Cómo resolverlo:** Restringir el origen a la URL del frontend en producción o requerir un header de autenticación en las Edge Functions.

---

### SEC-04 — Sin validación de wallet al agregar empleados
**Archivo:** `src/pages/Team.tsx:43-57`
**Severidad:** MEDIA

El campo wallet se guarda sin verificar que sea una dirección Solana válida. Una dirección malformada causará un error críptico en tiempo de ejecución.

**Cómo resolverlo:**
```ts
import { PublicKey } from '@solana/web3.js';
try { new PublicKey(wallet); } catch { throw new Error('Wallet inválida'); }
```

---

## 3. Inconsistencias Lógicas

### INC-01 — "Pagos automáticos" que no son automáticos
**Archivo:** `src/pages/Rules.tsx:93` — dice: *"X reglas ejecutándose automáticamente"*
**Severidad:** ALTA

Las reglas con frecuencia `semanal` o `mensual` **nunca se ejecutan solas**. No existe ningún cron job, scheduler, ni Edge Function que revise qué reglas deben ejecutarse hoy. El único momento en que se ejecuta un pago es cuando el admin manualmente pasa por el flujo `Index → Confirm → Success`.

La UI miente: muestra "ejecutándose automáticamente" pero es completamente manual.

**Cómo resolverlo:** Implementar un cron job real. Supabase Edge Functions soporta `pg_cron`:

```sql
-- Ejecutar un check cada día a las 9am
SELECT cron.schedule('check-payments', '0 9 * * *', 'SELECT net.http_post(...)');
```

O usar una Edge Function con trigger de database en Supabase.

---

### INC-02 — El historial muestra "USDC enviados" pero son SOL
**Archivo:** `src/pages/History.tsx:115`

```ts
<p className="text-3xl font-bold text-primary">{totalUsdc.toFixed(0)}</p>
<p className="text-sm text-muted-foreground mt-1">USDC enviados</p>
```

La variable se llama `totalUsdc` y el label dice "USDC enviados", pero las transacciones son en SOL nativo. Directamente relacionado con BUG-02.

---

### INC-03 — Balance del header no está ligado al usuario actual
**Archivo:** `src/hooks/use-wallet-balance.ts`

El header muestra un "saldo de empresa" pero no está claro si es el saldo del wallet conectado por Phantom o el wallet de la empresa (`EMPRESA_WALLET_PRIVATE_KEY`). El empleado también ve ese balance aunque no sea relevante para él.

---

### INC-04 — Datos pasados entre páginas vía sessionStorage
**Archivos:** `src/pages/Index.tsx:31`, `src/pages/Confirm.tsx:15`, `src/pages/Success.tsx`

```ts
sessionStorage.setItem('parsedRule', JSON.stringify(parsed));
// ...
const stored = sessionStorage.getItem('parsedRule');
```

Si el usuario abre `/confirm` en una nueva pestaña, refresca la página, o cierra accidentalmente la pestaña, pierde todo el estado. No hay forma de recuperar una transacción en curso.

**Cómo resolverlo:** Persistir el estado pendiente en la base de datos con un status `draft`, o usar React state management compartido.

---

## 4. Funcionalidades Rotas o Incompletas

### FEAT-01 — Ejecución automática de reglas: NO EXISTE
El nombre "reglas automáticas" implica que el sistema ejecuta pagos sin intervención. No hay ningún mecanismo de scheduling implementado.

**Lo que falta:** Un job que cada día (o semana) revise qué reglas `active` tienen `dia_de_pago` = hoy y las ejecute.

---

### FEAT-02 — USDC real (SPL Token): NO IMPLEMENTADO
El sistema usa `SystemProgram.transfer` (SOL nativo). No hay ninguna implementación de SPL Token transfers.

**Lo que falta:** Usar `@solana/spl-token` con la mint de USDC en Devnet para hacer transferencias reales de tokens.

---

### FEAT-03 — Verificación de saldo antes de pagar: NO EXISTE
El sistema intenta ejecutar la transacción sin verificar primero si la wallet de la empresa tiene suficiente SOL. Falla en runtime con un error genérico.

**Lo que falta:**
```ts
const balance = await CONNECTION.getBalance(empresaKeypair.publicKey);
const needed = body.destinatariosConWallet.length * lamports + FEE_BUFFER;
if (balance < needed) throw new Error(`Saldo insuficiente: ${balance} lamports`);
```

---

### FEAT-04 — Notificaciones al empleado cuando recibe un pago: NO EXISTE
El empleado no sabe que recibió un pago a menos que abra la app. No hay push notification, email ni ningún tipo de alerta.

---

### FEAT-05 — Editar o eliminar reglas: NO IMPLEMENTADO
En Rules page solo se puede pausar/activar. No se puede modificar el monto, los destinatarios, ni la frecuencia de una regla existente. Tampoco se puede eliminar.

---

### FEAT-06 — Eliminación de empleado no limpia datos relacionados
**Archivo:** `src/pages/Team.tsx:60-65`

Cuando se elimina un empleado, no se eliminan ni actualizan las reglas que lo incluyen como destinatario. Las reglas quedan apuntando a un usuario que ya no existe.

---

## 5. Problemas de Arquitectura

### ARCH-01 — Supabase Auth ignorado, auth custom inseguro
Se construyó un sistema de login completamente custom usando la tabla `employees` con contraseñas en texto plano, cuando Supabase ya provee un sistema de autenticación seguro, probado y con manejo de sesiones.

**Impacto:** Sin Supabase Auth no se puede configurar Row Level Security (RLS) correctamente basado en el usuario. Cualquier persona con el anon key puede leer toda la tabla `employees`.

---

### ARCH-02 — La tabla `employees` guarda contraseñas
La tabla `employees` tiene una columna `password` con texto plano. Esto rompe cualquier modelo de seguridad serio y no es compatible con RLS estándar de Supabase.

---

### ARCH-03 — Sin separación entre tabla de auth y datos del empleado
Mezclar credenciales (email/password) con datos de negocio (nombre, wallet, role) en una sola tabla hace que sea imposible usar herramientas estándar de autenticación.

**Estructura recomendada:**
```
supabase.auth.users (manejo nativo de Supabase)
    ↕ user_id (FK)
employees (nombre, wallet, role, created_at)
```

---

### ARCH-04 — Edge Functions sin autenticación
Las Edge Functions `rules-parse` y `rules-execute` no validan si quien las llama es un usuario autenticado con rol admin. Cualquiera que tenga el URL y el anon key puede ejecutar pagos.

---

## 6. Deuda Técnica y Calidad de Código

| Item | Archivo | Problema |
|------|---------|---------|
| Comentario incorrecto | `rules-parse/index.ts:79` | Dice `// Clean response in case Gemini wraps it` — el modelo es Groq, no Gemini |
| Sin loading state en Team delete | `Team.tsx` | El botón eliminar no da feedback visual correcto mientras carga |
| `as unknown as` casts | `History.tsx:70`, `EmployeeDashboard.tsx:67` | Indica que los tipos de Supabase no están bien definidos; mejor generar tipos con `supabase gen types` |
| Sin manejo de error en fetchBalance | `EmployeeDashboard.tsx:47` | El catch silencia el error sin mostrar nada al usuario |
| Sin paginación real | `History.tsx:68` | Hardcoded `.limit(50)` sin botón "cargar más" |
| Sin tests | Todo el proyecto | Cero cobertura de tests unitarios o de integración |

---

## 7. Checklist de Estado General

| Área | Estado | Notas |
|------|--------|-------|
| Conexión Solana Devnet | ✅ OK | Correctamente configurado |
| Ejecución de transacciones | ⚠️ PARCIAL | Funciona pero manda SOL, no USDC; lamports mal |
| Parser IA lenguaje natural | ✅ OK | Groq funciona bien |
| Auth / Login | ❌ INSEGURO | Contraseñas en texto plano, sin JWT |
| Gestión de empleados (Team) | ⚠️ PARCIAL | UI funciona, no conecta con parser |
| Dashboard empleado | ⚠️ PARCIAL | UI bien hecha, query JSONB puede fallar |
| Reglas activas | ⚠️ ENGAÑOSO | No hay ejecución automática real |
| Historial de pagos | ✅ OK | Funciona, confusión SOL/USDC |
| Seguridad general | ❌ CRÍTICO | Múltiples vulnerabilidades |
| Tests | ❌ NINGUNO | Cero cobertura |
| CI/CD | ❌ NINGUNO | Deploy manual |
| Documentación técnica | ❌ MÍNIMA | README desactualizado |

---

*Fin de auditoría. Ver `JUDGE_REPORT.md` para evaluación como juez de hackathon.*
