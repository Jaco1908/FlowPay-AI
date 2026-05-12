import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@5.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function generateSessionToken(payload: object, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  );
  const data = `${header}.${body}`;
  const keyBytes = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  return `${data}.${sig}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let publicKey: string, signature: string, message: string;
  try {
    ({ publicKey, signature, message } = await req.json());
    if (!publicKey || !signature || !message) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: "Payload inválido: se requieren publicKey, signature y message" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const supabase = getServiceClient();

  // ─── 1. Extraer y validar el nonce del mensaje ───────────────────────────
  const nonceMatch = message.match(/^Nonce: (.+)$/m);
  if (!nonceMatch) {
    return new Response(JSON.stringify({ error: "Nonce no encontrado en el mensaje" }), {
      status: 400,
      headers: corsHeaders,
    });
  }
  const nonce = nonceMatch[1].trim();

  const { data: nonceRow } = await supabase
    .from("siws_nonces")
    .select("*")
    .eq("public_key", publicKey)
    .eq("nonce", nonce)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!nonceRow) {
    return new Response(JSON.stringify({ error: "Nonce inválido, expirado o ya usado" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  // ─── 2. Verificar la firma Ed25519 con tweetnacl ─────────────────────────
  let isValid = false;
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = base64ToUint8Array(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (err) {
    console.error("Error verificando firma:", err);
    return new Response(JSON.stringify({ error: "Error al decodificar la firma" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!isValid) {
    return new Response(JSON.stringify({ error: "Firma inválida: no corresponde a la wallet declarada" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  // Consumir el nonce para prevenir replay attacks
  await supabase.from("siws_nonces").update({ used: true }).eq("id", nonceRow.id);

  // ─── 3. Buscar el empleado por su wallet ─────────────────────────────────
  const { data: employee } = await supabase
    .from("employees")
    .select("id, nombre, email, wallet, role")
    .eq("wallet", publicKey)
    .single();

  if (!employee) {
    return new Response(
      JSON.stringify({
        error: "Wallet no registrada. Pide al administrador que te agregue al equipo en FlowPay.",
      }),
      { status: 404, headers: corsHeaders }
    );
  }

  // ─── 4. Emitir token de sesión ───────────────────────────────────────────
  const jwtSecret = Deno.env.get("FLOWPAY_SECRET")!;
  const token = await generateSessionToken(
    { sub: employee.id, wallet: publicKey, role: employee.role },
    jwtSecret
  );

  return new Response(
    JSON.stringify({
      userId: employee.id,
      publicKey,
      role: employee.role,
      nombre: employee.nombre,
      token,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
