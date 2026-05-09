import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "npm:@solana/web3.js@1.98.2";
import bs58 from "npm:bs58@6.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CONNECTION = new Connection("https://api.devnet.solana.com", "confirmed");

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

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

    // Actualiza last_executed_at
    await supabase
      .from("rules")
      .update({ last_executed_at: now.toISOString() })
      .eq("id", rule.id);

    // Si es única vez, desactiva la regla
    if (isUnicaVez) {
      await supabase.from("rules").update({ status: "completed" }).eq("id", rule.id);
    }

    results.push({ rule_id: rule.id, raw_text: rule.raw_text, executions: ruleResults });
  }

  return new Response(
    JSON.stringify({ processed: results.length, results, timestamp: now.toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
