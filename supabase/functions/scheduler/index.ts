import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "npm:@solana/web3.js@1.87.6";
import bs58 from "npm:bs58@5.0.0";
import { registerPaymentOnChain } from "../_shared/flowpay-anchor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DAY_MAP: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, "miércoles": 3,
  jueves: 4, viernes: 5, "sábado": 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function getEmpresaKeypair(): Keypair {
  const privateKey = Deno.env.get("EMPRESA_WALLET_PRIVATE_KEY")!;
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function verifySessionJWT(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, payload, sig] = parts;
    const data = `${header}.${payload}`;
    const keyBytes = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, new TextEncoder().encode(data));
    if (!valid) return false;
    const { exp } = JSON.parse(atob(payload));
    return !exp || exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("FLOWPAY_CRON_SECRET") ?? "";
  const incomingSecret = req.headers.get("x-flowpay-secret") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const jwtSecret = Deno.env.get("FLOWPAY_SECRET") ?? "";

  const validCronSecret = cronSecret && incomingSecret === cronSecret;
  const validServiceKey = authHeader === `Bearer ${serviceKey}`;
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const validSiwsJwt = bearerToken && jwtSecret ? await verifySessionJWT(bearerToken, jwtSecret) : false;

  if (!validCronSecret && !validServiceKey && !validSiwsJwt) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const CONNECTION = new Connection("https://api.devnet.solana.com", "confirmed");
  const supabase = getSupabase();
  const now = new Date();
  const todayDayNumber = now.getDay();
  const todayStart = startOfToday();

  // Busca reglas activas cuyo día de pago coincide con hoy
  // y que no se hayan ejecutado hoy ya
  const { data: rules, error: rulesError } = await supabase
    .from("rules")
    .select("*")
    .eq("status", "active")
    .or(`last_executed_at.is.null,last_executed_at.lt.${todayStart}`);

  if (rulesError) {
    return new Response(JSON.stringify({ error: rulesError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const results: any[] = [];
  const empresaKeypair = getEmpresaKeypair();

  for (const rule of rules || []) {
    // Verifica que hoy es el día de pago
    const ruleDayNumber = DAY_MAP[rule.dia_de_pago?.toLowerCase()];
    const isUnicaVez = rule.frecuencia === "única vez";
    const isSemanal = rule.frecuencia === "semanal";
    const isMensual = rule.frecuencia === "mensual";

    let shouldRun = false;

    if (isSemanal && ruleDayNumber === todayDayNumber) shouldRun = true;
    if (isMensual && now.getDate() === (ruleDayNumber || 1)) shouldRun = true;
    if (isUnicaVez && !rule.last_executed_at) shouldRun = true;

    if (!shouldRun) continue;

    const destinatarios = rule.destinatarios || [];
    const ruleResults: any[] = [];

    for (const dest of destinatarios) {
      if (!dest.wallet) {
        ruleResults.push({ nombre: dest.nombre, status: "error", error: "Sin wallet" });
        continue;
      }

      try {
        const lamports = Math.floor(rule.monto_por_persona * 1_000_000_000);
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: empresaKeypair.publicKey,
            toPubkey: new PublicKey(dest.wallet),
            lamports,
          })
        );

        const signature = await CONNECTION.sendTransaction(transaction, [empresaKeypair]);
        await CONNECTION.confirmTransaction(signature, "confirmed");

        // Registro inmutable on-chain en el contrato FlowPay
        let onChainSig: string | null = null;
        try {
          onChainSig = await registerPaymentOnChain(
            CONNECTION,
            empresaKeypair,
            new PublicKey(dest.wallet),
            BigInt(lamports),
            String(rule.id)
          );
        } catch (regErr) {
          console.error("register_payment on-chain falló:", regErr);
        }

        await supabase.from("executions").insert({
          rule_id: rule.id,
          destinatario_nombre: dest.nombre,
          destinatario_wallet: dest.wallet,
          monto: rule.monto_por_persona,
          tx_hash: signature,
          status: "completed",
        });

        ruleResults.push({
          nombre: dest.nombre,
          tx_hash: signature,
          explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          on_chain_record: onChainSig
            ? `https://explorer.solana.com/tx/${onChainSig}?cluster=devnet`
            : null,
          status: "success",
        });
      } catch (err) {
        ruleResults.push({
          nombre: dest.nombre,
          status: "error",
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    const anySuccess = ruleResults.some(r => r.status === "success");

    if (anySuccess) {
      await supabase
        .from("rules")
        .update({ last_executed_at: now.toISOString() })
        .eq("id", rule.id);

      if (isUnicaVez) {
        await supabase.from("rules").update({ status: "paused" }).eq("id", rule.id);
      }
    }

    results.push({ rule_id: rule.id, raw_text: rule.raw_text, executions: ruleResults });
  }

  return new Response(
    JSON.stringify({ processed: results.length, results, timestamp: now.toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
