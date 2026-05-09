import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_WALLETS: Record<string, string> = {
  ana: "9T6FswBKsFy72ZE8NMfwZmAjxhV25RhfToh3AQUae5bx",
  luis: "6ALa8gVLB89oYCar8Q2DJ3zwbngjka5z3RMQy542jNu9",
  carlos: "GT2dTf1agW353aNeTSg5hEGVJA3QSSGEqsgMHDpchCTx",
};

const SYSTEM_PROMPT = `Eres un analizador de instrucciones de pago cripto.
Extrae del texto del usuario estos campos en formato JSON:
- destinatarios: array de strings con nombres en minúscula
- monto_por_persona: número (solo el número, sin símbolo)
- moneda: siempre "USDC" (si dice dólares o dolares también es USDC)
- frecuencia: "semanal" | "mensual" | "única vez"
- dia_de_pago: "lunes"|"martes"|"miércoles"|"jueves"|"viernes"|"sábado"|"domingo" o null
Si un campo no está claro, ponlo como null.
Responde SOLO el JSON válido, sin texto adicional, sin markdown, sin bloques de código.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Se requiere el campo 'text'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Groq API
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: text },
          ],
          max_tokens: 500,
        }),
      }
    );

    if (!groqResponse.ok) {
      const errBody = await groqResponse.text();
      return new Response(
        JSON.stringify({ error: `Groq API error: ${groqResponse.status} - ${errBody}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqData = await groqResponse.json();
    const responseText = groqData.choices?.[0]?.message?.content || "";

    // Clean response in case Gemini wraps it in markdown code block
    const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: {
      destinatarios: string[];
      monto_por_persona: number;
      moneda: string;
      frecuencia: string | null;
      dia_de_pago: string | null;
    };

    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      return new Response(
        JSON.stringify({ error: "No pude interpretar la instrucción", raw: cleanedText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const destinatariosConWallet = (parsed.destinatarios || []).map(
      (nombre: string) => ({
        nombre,
        wallet: DEMO_WALLETS[nombre.toLowerCase()] || null,
      })
    );

    const result = {
      destinatarios: parsed.destinatarios || [],
      destinatariosConWallet,
      monto_por_persona: parsed.monto_por_persona,
      moneda: parsed.moneda || "USDC",
      frecuencia: parsed.frecuencia || null,
      dia_de_pago: parsed.dia_de_pago || null,
      textoOriginal: text,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Error interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
