# FlowPay AI — Pitch Guide · 3 Minutos

> Guion alineado a los requisitos del hackathon: facturas, pagos cripto, on/off-ramp y panel de control.
> Estructurado segundo a segundo para el panel técnico del WEB3PACK Hackathon 2026.

---

## REQUISITOS CUBIERTOS (para referencia interna)

| Requisito del hackathon | Feature de FlowPay AI | Pantalla |
|------------------------|----------------------|----------|
| Facturas personalizables fiat y cripto | Generación de facturas con monto en USD/SOL/USDC | `Invoices.tsx` + `InvoiceConfirm.tsx` |
| Solicitudes de pago en criptomonedas | Pagos SOL en lenguaje natural + registro on-chain | `Confirm.tsx` → `Success.tsx` |
| Rampa de entrada y salida | Off-ramp cripto → fiat con precio real CoinGecko | `OffRamp.tsx` |
| Procesamiento de pagos directos | Transferencias SOL instantáneas + StreamFlow streaming | `Success.tsx` + Explorer |
| Panel de visión general | Dashboard con gráficas, métricas y estado de facturas | `Dashboard.tsx` |

---

## 1. EL HOOK — 0:00 a 0:30

> *Pausa de 2 segundos. Contacto visual con el juez principal. Voz firme.*

**"Gestionar pagos internacionales como empresa hoy significa: un banco que cobra el 5%, tres días de espera, y una hoja de cálculo que nadie entiende."**

> *Pausa de 2 segundos.*

**"Los freelancers no cobran a tiempo. Las empresas no tienen visibilidad. Y nadie tiene una herramienta que unifique facturas, pagos cripto y conversión a fiat en un solo lugar."**

**"FlowPay AI resuelve eso. En lenguaje natural. En Solana."**

> *→ Abre la app. El Command Center visible en pantalla.*

---

## 2. GUION MINUTO A MINUTO

---

### MINUTO 1 — Pagos Directos en Cripto (0:30 a 1:20)

**[0:30]** → *Pantalla: Index.tsx — Command Center*

**"Empecemos por el core: pagos directos en criptomonedas."**

**"El administrador escribe en español:"** → *Tipea en vivo:* `"Paga 0.05 SOL a Ana y Carlos cada viernes"`

**"Nuestra IA — Groq con Llama-3.1 — interpreta la instrucción. Extrae destinatarios, monto, frecuencia. No hay formularios, no hay campos, no hay errores de IBAN."**

---

**[0:45]** → *Pantalla: Confirm.tsx*

**"El sistema verifica wallets y saldo disponible antes de ejecutar. Si hay fondos insuficientes, avisa aquí — antes de gastar un centavo en fees."**

**"Confirmamos."** → *Click. Phantom firma.*

---

**[1:00]** → *Pantalla: Success.tsx*

**"Dos pagos confirmados en Solana en menos de 4 segundos."**

*Señala los dos links por empleado:*

**"Link uno: la transferencia en el Explorer — verificable por cualquier auditor del mundo."**
**"Link dos: el registro inmutable en nuestro Smart Contract Anchor — un recibo permanente, on-chain, que nadie puede editar."**

**"Esto es procesamiento de pagos directos en criptomonedas — con auditoría que los bancos no pueden ofrecer."**

---

### MINUTO 2 — Facturas y Off-Ramp (1:20 a 2:20)

**[1:20]** → *Pantalla: Index.tsx — Command Center*

**"Segundo requisito: facturación."**

*Tipea:* `"Genera factura de 1500 USD a Acme Inc por servicios de desarrollo"`

**"La IA detecta el intent 'factura' y extrae cliente, monto y descripción."**

---

**[1:30]** → *Pantalla: InvoiceConfirm.tsx*

**"El sistema genera la factura con número único, fecha y estado. El cliente puede pagar en SOL o USD — nosotros hacemos la conversión al tipo de cambio real."**

---

**[1:40]** → *Pantalla: Invoices.tsx — Listado*

**"Aquí el panel de facturas: pendientes, pagadas, canceladas. Trazabilidad completa de cada cobro."**

**"Facturas personalizables en fiat y cripto — cubierto."**

---

**[1:50]** → *Pantalla: Index.tsx — Command Center*

**"Tercer requisito: rampa de salida."**

*Tipea:* `"Convierte 2 SOL a USD en mi cuenta bancaria"`

---

**[2:00]** → *Pantalla: OffRamp.tsx*

**"El sistema muestra el precio real de SOL en tiempo real — datos de CoinGecko — y calcula exactamente cuántos dólares recibes después del fee."**

**"El usuario confirma, ingresa su cuenta bancaria, y la conversión queda registrada."**

**"Rampa de salida cripto a fiat — cubierto."**

---

### MINUTO 3 — Panel, Automatización y Cierre (2:20 a 3:00)

**[2:20]** → *Pantalla: Dashboard.tsx*

**"Quinto requisito: panel de visión general."**

**"SOL enviado por día. Top destinatarios. Facturas por estado. Transacciones recientes. Todo en tiempo real, todo desde la blockchain."**

**"No es una base de datos interna que alguien puede editar. Son datos que viven en Solana."**

---

**[2:35]** → *Pantalla: Rules.tsx — vista calendario*

**"Y lo que convierte FlowPay AI en un producto real y no en un demo — la automatización."**

**"Las reglas de pago se ejecutan solas. pg_cron dispara el scheduler cada minuto. Cero intervención humana. Cero nóminas olvidadas."**

---

**[2:45]** → *Pausa. Contacto visual. Voz más lenta.*

**"En 48 horas construimos las cinco características del problema: facturas, pagos cripto, rampa, procesamiento directo y panel — con una capa de IA que ningún competidor tiene."**

**"El administrador no necesita saber qué es una wallet. Solo escribe lo que quiere hacer."**

---

## 3. COREOGRAFÍA DE PANTALLAS

| Tiempo | Pantalla | Requisito cubierto |
|--------|----------|--------------------|
| `0:00 – 0:30` | **Sin app** — solo hablas | — Hook del problema |
| `0:30 – 0:45` | **Index.tsx** — Command Center | Pagos directos en cripto |
| `0:45 – 1:00` | **Confirm.tsx** → Phantom | Pagos directos + verificación |
| `1:00 – 1:20` | **Success.tsx** + Explorer | Pagos confirmados on-chain |
| `1:20 – 1:30` | **Index.tsx** → **InvoiceConfirm.tsx** | Generación de facturas |
| `1:30 – 1:50` | **Invoices.tsx** — listado | Facturas personalizables fiat/cripto |
| `1:50 – 2:10` | **Index.tsx** → **OffRamp.tsx** | Rampa de salida cripto → fiat |
| `2:10 – 2:35` | **Dashboard.tsx** | Panel de visión general |
| `2:35 – 2:50` | **Rules.tsx** — calendario | Automatización + diferenciador |
| `2:50 – 3:00` | **Index.tsx** — Command Center | Cierre con la app en pantalla |

---

## 4. EL CIERRE "MIC DROP" — a las 2:55

> *Voz calmada. Mira al juez más senior.*

---

> **"El problema pedía una app fácil de usar para facturas, pagos y conversiones."**
>
> **"Nosotros lo construimos — y le pusimos inteligencia artificial encima para que cualquier empresa lo use sin tocar una sola wallet."**
>
> **"Transacciones en 400 milisegundos. Fees de fracción de centavo. Auditoría permanente en Solana."**
>
> **"FlowPay AI — operaciones financieras cripto, en español, para el mundo real."**

> *Baja las manos. No digas nada más.*

---

## CHECKLIST ANTES DE SUBIR AL ESCENARIO

- [ ] Phantom conectada a **Devnet** con SOL suficiente → [faucet.solana.com](https://faucet.solana.com)
- [ ] **Tab 1:** `https://flowpayia.vercel.app` — Command Center listo
- [ ] **Tab 2:** `Invoices.tsx` — al menos una factura pendiente y una pagada visibles
- [ ] **Tab 3:** Solana Explorer con un tx reciente (de respaldo)
- [ ] **Tab 4:** `https://app.streamflow.finance` con stream activo
- [ ] Practica el tipeo de las **3 instrucciones** en vivo: pago, factura y off-ramp
- [ ] Zoom del browser al **125%** — texto legible desde el fondo de la sala
- [ ] Modo No Molestar activado — sin notificaciones
- [ ] Cierra todas las tabs innecesarias

---

## Q&A — PREGUNTAS PROBABLES DE LOS JUECES

| Pregunta | Respuesta |
|----------|-----------|
| *¿Por qué Solana y no Ethereum?* | Fees de $0.0001 vs $5–40. El streaming de pagos segundo a segundo solo es viable a ese costo. |
| *¿El smart contract está auditado?* | Desplegado y activo en Devnet: `Dv3iyDKKqxxno1DvuJGHfp6MDHhQsVVejfztcmoqUnds`. PDAs inmutables por diseño de Anchor. |
| *¿Cómo monetizan?* | 0.5% de fee por ejecución de nómina — por debajo del costo bancario actual del 5%. |
| *¿Soportan otras criptomonedas?* | Actualmente SOL nativo. La arquitectura soporta cualquier SPL Token — USDC en el roadmap inmediato. |
| *¿Qué diferencia a FlowPay de Request Finance?* | Lenguaje natural. Sin onboarding cripto. El admin no necesita saber qué es una wallet ni una dirección Base58. |
| *¿El off-ramp es real?* | La conversión es simulada en demo — muestra el flujo y el precio real de CoinGecko. El settlement bancario sería via Bitso o Banxa en producción. |

---

*Construido en el WEB3PACK Hackathon 2026 · Solana Devnet*
*React + Vite + Supabase + Anchor + StreamFlow + Groq AI*
