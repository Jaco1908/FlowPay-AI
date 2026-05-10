import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "npm:@solana/web3.js@1.87.6";

export const FLOWPAY_PROGRAM_ID = new PublicKey(
  "Dv3iyDKKqxxno1DvuJGHfp6MDHhQsVVejfztcmoqUnds"
);

// ── Helpers de serialización Borsh / Anchor ──────────────────────────────────

// Discriminador Anchor = primeros 8 bytes de SHA-256("global:<nombre>")
async function buildDiscriminator(name: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`global:${name}`)
  );
  return new Uint8Array(hash).slice(0, 8);
}

function u64ToLeBytes(value: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return buf;
}

// String Borsh: 4 bytes LE (longitud) + bytes UTF-8
function borshString(s: string): Uint8Array {
  const text = new TextEncoder().encode(s);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, text.length, true);
  return new Uint8Array([...len, ...text]);
}

// ── PDA helpers ──────────────────────────────────────────────────────────────

export function getPayrollConfigPDA(authority: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config"), authority.toBuffer()],
    FLOWPAY_PROGRAM_ID
  );
  return pda;
}

export function getPaymentRecordPDA(
  authority: PublicKey,
  paymentCount: bigint
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment"),
      authority.toBuffer(),
      u64ToLeBytes(paymentCount),
    ],
    FLOWPAY_PROGRAM_ID
  );
  return pda;
}

// ── Leer payment_count del PayrollConfig PDA ─────────────────────────────────
// Layout en memoria (Borsh): [8 disc][32 authority][8 payment_count][1 bump]
async function readPaymentCount(
  connection: Connection,
  configPDA: PublicKey
): Promise<bigint> {
  const info = await connection.getAccountInfo(configPDA);
  if (!info) throw new Error("PayrollConfig no inicializado");
  const view = new DataView(
    info.data.buffer,
    info.data.byteOffset,
    info.data.byteLength
  );
  return view.getBigUint64(40, true); // offset 40 = 8 disc + 32 authority
}

// ── initialize_payroll ───────────────────────────────────────────────────────
// Crea el PayrollConfig PDA si no existe. Idempotente — no falla si ya existe.
async function ensurePayrollInitialized(
  connection: Connection,
  authority: Keypair
): Promise<void> {
  const configPDA = getPayrollConfigPDA(authority.publicKey);
  const info = await connection.getAccountInfo(configPDA);
  if (info !== null) return; // Ya inicializado

  const disc = await buildDiscriminator("initialize_payroll");

  const ix = new TransactionInstruction({
    programId: FLOWPAY_PROGRAM_ID,
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(disc),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [authority]);
  await connection.confirmTransaction(sig, "confirmed");
}

// ── register_payment ─────────────────────────────────────────────────────────
// Llama DESPUÉS de que el SystemProgram.transfer ya confirmó.
// Devuelve la signature del tx de registro. Si falla, lanza Error.
export async function registerPaymentOnChain(
  connection: Connection,
  authority: Keypair,   // wallet empresa (misma que firma las transferencias)
  employee: PublicKey,  // wallet del empleado que recibió el pago
  lamports: bigint,     // monto exacto en lamports
  ruleId: string        // UUID de Supabase — máx 64 chars, cabe perfecto
): Promise<string> {
  await ensurePayrollInitialized(connection, authority);

  const configPDA = getPayrollConfigPDA(authority.publicKey);
  const paymentCount = await readPaymentCount(connection, configPDA);
  const recordPDA = getPaymentRecordPDA(authority.publicKey, paymentCount);

  // Instruction data: [8 disc][8 amount u64][32 employee pubkey][4+N rule_id string]
  const disc = await buildDiscriminator("register_payment");
  const data = new Uint8Array([
    ...disc,
    ...u64ToLeBytes(lamports),
    ...employee.toBytes(),
    ...borshString(ruleId.slice(0, 64)),
  ]);

  const ix = new TransactionInstruction({
    programId: FLOWPAY_PROGRAM_ID,
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: recordPDA, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [authority]);
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}
