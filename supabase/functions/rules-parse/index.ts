import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-FlowPay-Secret",
};

interface Employee {
  id: string;
  nombre: string;
  wallet: string | null;
}

async function getEmployeesFromDB(): Promise<Employee[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Get ALL employees (with and without wallet) to distinguish registered vs unknown
  const { data } = await supabase
    .from("employees")
    .select("id, nombre, wallet")
    .eq("role", "employee");

  return (data || []) as Employee[];
}

interface MatchResult {
  wallet: string | null;
  exists: boolean;
  employeeId: string | null;
  ambiguous: boolean;
  matches: string[];
}

function textContainsNumber(text: string): boolean {
  return /\d+(\.\d+)?/.test(text);
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findEmployee(nombre: string, employees: Employee[]): MatchResult {
  const search = normalizeName(nombre).trim();
  const searchTokens = search.split(/\s+/).filter(Boolean);
  
  // Primero: buscar coincidencia exacta completa (prioridad máxima)
  for (const emp of employees) {
    const fullName = normalizeName(emp.nombre).trim();
    if (fullName === search) {
      return { wallet: emp.wallet, exists: true, employeeId: emp.id, ambiguous: false, matches: [] };
    }
  }

  // Si es una sola palabra, buscar por primer nombre
  if (searchTokens.length === 1) {
    const found: Employee[] = [];
    for (const emp of employees) {
      const fullName = normalizeName(emp.nombre).trim();
      const firstName = fullName.split(/\s+/)[0];
      
      if (firstName === search || firstName.startsWith(search)) {
        found.push(emp);
      }
    }
    
    if (found.length === 1) {
      const emp = found[0];
      return { wallet: emp.wallet, exists: true, employeeId: emp.id, ambiguous: false, matches: [] };
    }
    if (found.length > 1) {
      return {
        wallet: null,
        exists: true,
        employeeId: null,
        ambiguous: true,
        matches: found.map(e => e.nombre),
      };
    }
  }
  
  // Si son múltiples palabras, buscar por coincidencia de tokens
  const found: Employee[] = [];
  for (const emp of employees) {
    const fullName = normalizeName(emp.nombre).trim();
    const fullTokens = fullName.split(/\s+/).filter(Boolean);
    
    // Verificar si el primer token coincide
    if (fullTokens[0] === searchTokens[0]) {
      // Luego verificar si contiene otros tokens del búsqueda
      const allMatch = searchTokens.every(token => 
        fullTokens.some(empToken => empToken.startsWith(token))
      );
      if (allMatch) {
        found.push(emp);
      }
    }
  }
  
  if (found.length === 1) {
    const emp = found[0];
    return { wallet: emp.wallet, exists: true, employeeId: emp.id, ambiguous: false, matches: [] };
  }
  if (found.length > 1) {
    return {
      wallet: null,
      exists: true,
      employeeId: null,
      ambiguous: true,
      matches: found.map(e => e.nombre),
    };
  }

  return { wallet: null, exists: false, employeeId: null, ambiguous: false, matches: [] };
}

const SYSTEM_PROMPT = `Eres un orquestador financiero cripto. Clasifica la intención del usuario y extrae los datos relevantes.

INTENCIONES POSIBLES:
- "pago": pagar a empleados o colaboradores (nómina, salario, transferencia)
- "factura": generar factura o solicitud de cobro a un cliente
- "offramp": convertir cripto a dinero fiat o retirar a banco
- "ayuda": el usuario pregunta qué puede hacer la app, pide ayuda, saluda o escribe algo que no es una instrucción financiera

Responde SIEMPRE con este JSON (pon null en campos que no apliquen):

{
  "intent": "pago" | "factura" | "offramp" | "ayuda",

  // SOLO para intent="pago":
  "destinatarios": ["nombre1", "nombre2"],
  "monto_por_persona": 0.05,
  "moneda": "SOL",
  "frecuencia": "semanal" | "mensual" | "única vez",
  "dia_de_pago": "lunes"|"martes"|"miércoles"|"jueves"|"viernes"|null,

  // SOLO para intent="factura":
  "cliente": "nombre del cliente o empresa",
  "monto_factura": 1000,
  "moneda_factura": "USD" | "SOL" | "USDC",
  "descripcion_factura": "descripción del servicio",

  // SOLO para intent="offramp":
  "monto_offramp": 200,
  "moneda_origen": "SOL" | "USDC",
  "destino_offramp": "descripción del destino",

  // SOLO para intent="ayuda":
  "mensaje_ayuda": "respuesta amigable y breve explicando las 3 cosas que puedes hacer"
}

REGLAS:
- La moneda para pagos siempre es "SOL"
- Si dice "factura", "cobro", "invoice", "solicitud de pago a cliente" → intent="factura"
- Si dice "retira", "convierte", "banco", "fiat", "off-ramp" → intent="offramp"
- Si el usuario pregunta "qué puedes hacer", "ayuda", "help", "cómo funciona", "hola", "qué eres", o escribe algo que no es una instrucción financiera concreta → intent="ayuda"
- Si es una instrucción de pago concreta con destinatarios y monto → intent="pago"
- Para intent="ayuda", el mensaje_ayuda debe ser en español, máximo 3 líneas, mencionando las 3 funciones: pagar nómina en SOL, generar facturas, convertir cripto a fiat.
- CRÍTICO — NUNCA inventes ni asumas datos que el usuario NO escribió:
  - Si el usuario NO menciona un monto numérico explícito → devuelve monto_por_persona: null
  - Si el usuario NO menciona frecuencia → devuelve frecuencia: null
  - Si el usuario NO menciona un día específico → devuelve dia_de_pago: null
  - Si el usuario NO menciona el monto de la factura → devuelve monto_factura: null
  - Si el usuario NO menciona cuánto convertir → devuelve monto_offramp: null
  - Extrae ÚNICAMENTE lo que el usuario escribió explícitamente. No completes, no sugieras, no pongas valores por defecto.
- Para intent="factura": el cliente es una empresa o persona EXTERNA, no necesita estar en ninguna base de datos. Pon destinatarios: [] siempre.
- Responde SOLO el JSON, sin texto adicional, sin markdown.

EJEMPLOS CRÍTICOS DE MONTO NULL:
Usuario: "Genera factura a Acme Inc por servicios de desarrollo web"
→ monto_factura: null  (no mencionó ningún número)

Usuario: "Crea factura para Google por consultoría"
→ monto_factura: null  (sin monto especificado)

Usuario: "Genera factura de 500 USD a Acme Inc por diseño"
→ monto_factura: 500   (el usuario SÍ especificó el número 500)

Usuario: "Paga a Juan"
→ monto_por_persona: null  (no especificó cuánto)`;


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("FLOWPAY_SECRET");
    if (secret && req.headers.get("X-FlowPay-Secret") !== secret) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Clean response in case Groq wraps it in markdown code block
    const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: {
      intent: string;
      destinatarios: string[];
      monto_por_persona: number;
      moneda: string;
      frecuencia: string | null;
      dia_de_pago: string | null;
      cliente?: string;
      monto_factura?: number;
      moneda_factura?: string;
      descripcion_factura?: string;
      monto_offramp?: number;
      moneda_origen?: string;
      destino_offramp?: string;
    };

    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      return new Response(
        JSON.stringify({ error: "No pude interpretar la instrucción", raw: cleanedText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const employees = await getEmployeesFromDB();
    const ambiguousNames: { nombre: string; matches: string[] }[] = [];

    const destinatariosConWallet = (parsed.destinatarios || []).map(
      (nombre: string) => {
        const result = findEmployee(nombre, employees);
        if (result.ambiguous) {
          ambiguousNames.push({ nombre, matches: result.matches });
        }
        return { nombre, wallet: result.wallet, exists: result.exists, employeeId: result.employeeId };
      }
    );

    // No devolver error, incluir ambiguousNames en el resultado
    // if (ambiguousNames.length > 0) {
    //   const msg = ambiguousNames.map(a =>
    //     `"${a.nombre}" puede ser: ${a.matches.join(" o ")}`
    //   ).join(". ");
    //   return new Response(
    //     JSON.stringify({ error: `Nombre ambiguo — ${msg}. Por favor usa el nombre completo.` }),
    //     { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    const result = {
      intent: parsed.intent || "pago",
      destinatarios: parsed.destinatarios || [],
      destinatariosConWallet,
      monto_por_persona: parsed.monto_por_persona || null,
      moneda: parsed.moneda || "SOL",
      frecuencia: parsed.frecuencia || null,
      dia_de_pago: parsed.dia_de_pago || null,
      textoOriginal: text,
      // Factura — null out amounts the LLM invented when the user wrote no number
      cliente: parsed.cliente || null,
      monto_factura: (parsed.monto_factura && textContainsNumber(text)) ? parsed.monto_factura : null,
      moneda_factura: parsed.moneda_factura || null,
      descripcion_factura: parsed.descripcion_factura || null,
      // Off-ramp
      monto_offramp: (parsed.monto_offramp && textContainsNumber(text)) ? parsed.monto_offramp : null,
      moneda_origen: parsed.moneda_origen || null,
      destino_offramp: parsed.destino_offramp || null,
      // Ayuda
      mensaje_ayuda: parsed.mensaje_ayuda || null,
      // Ambigüedades
      ambiguousNames,
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
