import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-FlowPay-Secret",
};

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = req.headers.get("X-FlowPay-Secret");
  if (secret !== Deno.env.get("FLOWPAY_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  let publicKey: string;
  try {
    ({ publicKey } = await req.json());
    if (!publicKey) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: "publicKey requerida" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const supabase = getServiceClient();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabase.from("siws_nonces").insert({
    public_key: publicKey,
    nonce,
    expires_at: expiresAt,
    used: false,
  });

  if (error) {
    console.error("Error insertando nonce:", error);
    return new Response(JSON.stringify({ error: "Error interno al generar nonce" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ nonce }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
