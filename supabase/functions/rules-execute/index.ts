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
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getSupabaseServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function getEmpresaKeypair(): Keypair {
  const privateKey = Deno.env.get("EMPRESA_WALLET_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("EMPRESA_WALLET_PRIVATE_KEY is not set");
  }
  const decoded = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}

const CONNECTION = new Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);

interface DestinatarioConWallet {
  nombre: string;
  wallet: string | null;
}

interface ParsedRuleBody {
  destinatarios: string[];
  destinatariosConWallet: DestinatarioConWallet[];
  monto_por_persona: number;
  moneda: string;
  frecuencia: string | null;
  dia_de_pago: string | null;
  textoOriginal: string;
}

interface ExecutionResult {
  nombre: string;
  wallet: string;
  monto: number;
  moneda: string;
  tx_hash: string;
  explorer_url: string;
  status: "success" | "error";
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: ParsedRuleBody = await req.json();

    // 1. Save rule to Supabase
    const supabase = getSupabaseServiceClient();

    const { data: ruleData, error: ruleError } = await supabase
      .from("rules")
      .insert({
        raw_text: body.textoOriginal,
        destinatarios: body.destinatariosConWallet,
        monto_por_persona: body.monto_por_persona,
        moneda: body.moneda || "USDC",
        frecuencia: body.frecuencia,
        dia_de_pago: body.dia_de_pago,
        status: "active",
      })
      .select("id")
      .single();

    if (ruleError) {
      return new Response(
        JSON.stringify({ error: `Error guardando regla: ${ruleError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ruleId = ruleData.id;

    // 2. Execute transfers for each recipient
    const executions: ExecutionResult[] = [];
    const empresaKeypair = getEmpresaKeypair();

    for (const dest of body.destinatariosConWallet) {
      // Skip if no wallet
      if (!dest.wallet) {
        executions.push({
          nombre: dest.nombre,
          wallet: "",
          monto: body.monto_por_persona,
          moneda: body.moneda || "USDC",
          tx_hash: "",
          explorer_url: "",
          status: "error",
          error: "Wallet no encontrada",
        });

        // Record failed execution
        await supabase.from("executions").insert({
          rule_id: ruleId,
          destinatario_nombre: dest.nombre,
          destinatario_wallet: null,
          monto: body.monto_por_persona,
          tx_hash: null,
          status: "error",
        });

        continue;
      }

      try {
        const toPubkey = new PublicKey(dest.wallet);
        const lamports = Math.floor(body.monto_por_persona * 1_000_000_000);

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: empresaKeypair.publicKey,
            toPubkey,
            lamports,
          })
        );

        const signature = await CONNECTION.sendTransaction(transaction, [
          empresaKeypair,
        ]);

        await CONNECTION.confirmTransaction(signature, "confirmed");

        // Record successful execution
        await supabase.from("executions").insert({
          rule_id: ruleId,
          destinatario_nombre: dest.nombre,
          destinatario_wallet: dest.wallet,
          monto: body.monto_por_persona,
          tx_hash: signature,
          status: "completed",
        });

        executions.push({
          nombre: dest.nombre,
          wallet: dest.wallet,
          monto: body.monto_por_persona,
          moneda: body.moneda || "USDC",
          tx_hash: signature,
          explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          status: "success",
        });
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Error desconocido";

        await supabase.from("executions").insert({
          rule_id: ruleId,
          destinatario_nombre: dest.nombre,
          destinatario_wallet: dest.wallet,
          monto: body.monto_por_persona,
          tx_hash: null,
          status: "error",
        });

        executions.push({
          nombre: dest.nombre,
          wallet: dest.wallet || "",
          monto: body.monto_por_persona,
          moneda: body.moneda || "USDC",
          tx_hash: "",
          explorer_url: "",
          status: "error",
          error: errorMsg,
        });
      }
    }

    return new Response(
      JSON.stringify({ executions, rule_id: ruleId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Error interno del servidor";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
