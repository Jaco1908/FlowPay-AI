import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, AlertCircle, Clock, X, Users, UserPlus, Mail, Wallet,
  Lock, CheckCircle2, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import { parseRule } from '@/api/rules/parse';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';
import { resolveAmbiguousNames, updateTextWithResolvedNames } from '@/services/ambiguousNameResolver';
import type { AmbiguousName, ParsedRule } from '@/types';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const QUICK_CHIPS = [
  {
    label: 'Pagar Nómina',
    text: 'Paga 0.05 SOL a Ana, Luis y Carlos cada viernes',
    color: 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50',
  },
  {
    label: 'Generar Factura',
    text: 'Genera factura de $1500 a Acme Inc por servicios de desarrollo web',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50',
  },
  {
    label: 'Convertir a Fiat',
    text: 'Convierte 2 SOL a USD en mi cuenta bancaria',
    color: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50',
  },
];

const EXAMPLES = [
  { text: 'Paga 0.05 SOL a Ana, Luis y Carlos cada viernes', lang: 'ES' },
  { text: 'Envía 0.1 SOL a luis los lunes', lang: 'ES' },
  { text: 'Paga 0.02 SOL a carlos hoy', lang: 'ES' },
  { text: 'Pay 0.05 SOL to Ana, Luis and Carlos every Friday', lang: 'EN' },
  { text: 'Send 0.1 SOL to luis every monday', lang: 'EN' },
];

const HELP_PATTERNS =
  /^(hola|hello|hi|hey|buenos\s+días?|buenas|buen\s+día|qué\s+puedes|que\s+puedes|what\s+can|ayuda|help|cómo\s+funciona|como\s+funciona|qué\s+eres|que\s+eres|qué\s+haces|que\s+haces|para\s+qué|para\s+que|info|información)[\s.,!?]*/i;

const HELP_DEFAULT =
  'Puedo hacer 3 cosas por ti: 1) Pagar nómina — transfiero SOL a tu equipo con una frase. 2) Generar facturas — creo y rastreo cobros a tus clientes. 3) Convertir cripto a fiat — convierto tu SOL a dinero en tu cuenta bancaria. ¿Por dónde quieres empezar?';

interface MissingForm {
  nombre: string;
  email: string;
  wallet: string;
  clabe: string;
  password: string;
  created: boolean;
  exists: boolean;
  employeeId: string | null;
}

interface MissingField {
  field: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
  value: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseAmbiguousError(message: string): AmbiguousName[] | null {
  const regex = /"([^"]+)"\s+puede\s+ser:\s*([^\.]+)\./gi;
  const results: AmbiguousName[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(message)) !== null) {
    const nombre = match[1].trim();
    const rawOptions = match[2].trim();
    const matches = rawOptions.split(/\s+o\s+|,\s*/).map(item => item.trim()).filter(Boolean);
    if (nombre && matches.length > 0) {
      results.push({ nombre, matches });
    }
  }

  return results.length > 0 ? results : null;
}

function buildParsedForAmbiguous(text: string, ambiguousNames: AmbiguousName[]): ParsedRule {
  return {
    intent: 'pago',
    textoOriginal: text,
    destinatarios: ambiguousNames.map(a => a.nombre),
    destinatariosConWallet: ambiguousNames.map(a => ({ nombre: a.nombre, wallet: null, exists: false, employeeId: null })),
    monto_por_persona: null,
    moneda: 'SOL',
    frecuencia: null,
    dia_de_pago: null,
    cliente: null,
    monto_factura: null,
    moneda_factura: null,
    descripcion_factura: null,
    monto_offramp: null,
    moneda_origen: null,
    destino_offramp: null,
    mensaje_ayuda: null,
    ambiguousNames,
  };
}

function getMissingFields(parsed: ParsedRule): MissingField[] {
  const fields: MissingField[] = [];
  if (parsed.intent === 'pago') {
    if (!parsed.destinatarios?.length)
      fields.push({
        field: 'destinatarios',
        label: '¿A quién vas a pagar? (separa con comas)',
        type: 'text',
        placeholder: 'Ana, Luis, Carlos',
        value: '',
      });
    if (!parsed.monto_por_persona)
      fields.push({
        field: 'monto_por_persona',
        label: 'Monto por persona (SOL)',
        type: 'number',
        placeholder: '0.05',
        value: '',
      });
    if (parsed.frecuencia === 'semanal' && !parsed.dia_de_pago)
      fields.push({
        field: 'dia_de_pago',
        label: 'Día de pago semanal',
        type: 'select',
        options: DIAS,
        value: '',
      });
  } else if (parsed.intent === 'factura') {
    if (!parsed.cliente)
      fields.push({
        field: 'cliente',
        label: 'Nombre del cliente o empresa',
        type: 'text',
        placeholder: 'Acme Inc.',
        value: '',
      });
    if (!parsed.monto_factura)
      fields.push({
        field: 'monto_factura',
        label: 'Monto de la factura (USD)',
        type: 'number',
        placeholder: '1500',
        value: '',
      });
  } else if (parsed.intent === 'offramp') {
    if (!parsed.monto_offramp && !parsed.monto_por_persona)
      fields.push({
        field: 'monto_offramp',
        label: 'Cantidad a convertir (SOL)',
        type: 'number',
        placeholder: '2',
        value: '',
      });
  }
  return fields;
}

function buildInstruction(parsed: ParsedRule, fields: MissingField[]): string {
  const map: Record<string, string> = {};
  fields.forEach(f => { map[f.field] = f.value; });

  if (parsed.intent === 'pago') {
    const nombres = map.destinatarios || (parsed.destinatarios || []).join(', ');
    const monto = map.monto_por_persona || parsed.monto_por_persona || '';
    const freq = parsed.frecuencia || 'única vez';
    const dia = map.dia_de_pago || parsed.dia_de_pago || '';
    return `Paga ${monto} SOL a ${nombres}${freq !== 'única vez' ? ` ${freq}${dia ? ` cada ${dia}` : ''}` : ''}`;
  }
  return '';
}

function buildAITitle(parsed: ParsedRule): string {
  if (parsed.intent === 'pago') return parsed.frecuencia ? 'Detecté un pago recurrente:' : 'Detecté un pago puntual:';
  if (parsed.intent === 'factura') return 'Voy a crear una factura:';
  if (parsed.intent === 'offramp') return 'Voy a convertir cripto a fiat:';
  return 'Entendido:';
}

function buildAILines(parsed: ParsedRule): { label: string; value: string }[] {
  if (parsed.intent === 'pago') {
    const lines: { label: string; value: string }[] = [];
    if (parsed.monto_por_persona)
      lines.push({ label: 'Monto por persona', value: `${parsed.monto_por_persona} ${parsed.moneda || 'SOL'}` });
    if (parsed.frecuencia)
      lines.push({ label: 'Frecuencia', value: cap(parsed.frecuencia) });
    if (parsed.dia_de_pago)
      lines.push({ label: 'Día de pago', value: cap(parsed.dia_de_pago) });
    if (parsed.monto_por_persona && parsed.destinatarios?.length) {
      const total = parsed.monto_por_persona * parsed.destinatarios.length;
      const fmt = Number.isInteger(total) ? total.toString() : total.toFixed(4).replace(/\.?0+$/, '');
      lines.push({ label: 'Total', value: `${fmt} ${parsed.moneda || 'SOL'}` });
    }
    return lines;
  }
  if (parsed.intent === 'factura') {
    const lines: { label: string; value: string }[] = [];
    if (parsed.cliente) lines.push({ label: 'Cliente', value: parsed.cliente });
    if (parsed.monto_factura) lines.push({ label: 'Monto', value: `${parsed.monto_factura} ${parsed.moneda_factura || 'USD'}` });
    if (parsed.descripcion_factura) lines.push({ label: 'Descripción', value: parsed.descripcion_factura });
    return lines;
  }
  if (parsed.intent === 'offramp') {
    const lines: { label: string; value: string }[] = [];
    const monto = parsed.monto_offramp || parsed.monto_por_persona;
    if (monto) lines.push({ label: 'Monto', value: `${monto} ${parsed.moneda_origen || parsed.moneda || 'SOL'}` });
    return lines;
  }
  return [];
}

const Index = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [helpMessage, setHelpMessage] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<ParsedRule | null>(null);

  // Modal: crear empleados faltantes
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingForms, setMissingForms] = useState<MissingForm[]>([]);
  const [creatingUsers, setCreatingUsers] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);

  // Modal: datos incompletos en la instrucción
  const [showMissingDataModal, setShowMissingDataModal] = useState(false);
  const [missingDataFields, setMissingDataFields] = useState<MissingField[]>([]);
  const [pendingParsed, setPendingParsed] = useState<ParsedRule | null>(null);
  const [missingDataError, setMissingDataError] = useState<string | null>(null);

  // Modal: nombres ambiguos
  const [showAmbiguousModal, setShowAmbiguousModal] = useState(false);
  const [ambiguousSelections, setAmbiguousSelections] = useState<Record<string, string>>({});

  // Modal: monto faltante en factura
  const [showMontoModal, setShowMontoModal] = useState(false);
  const [montoInput, setMontoInput] = useState('');
  const [monedaInput, setMonedaInput] = useState('USD');
  const [montoError, setMontoError] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim() || loading) return;

    if (HELP_PATTERNS.test(text.trim())) {
      setHelpMessage(HELP_DEFAULT);
      return;
    }

    setLoading(true);
    setError(null);
    setAiResponse(null);

    try {
      const parsed = await parseRule(text.trim());

      if (parsed.intent === 'ayuda') {
        setHelpMessage(parsed.mensaje_ayuda || HELP_DEFAULT);
        return;
      }

      // Verificar si faltan datos críticos antes de mostrar la respuesta
      const missing = getMissingFields(parsed);
      if (missing.length > 0) {
        setPendingParsed(parsed);
        setMissingDataFields(missing);
        setShowMissingDataModal(true);
        return;
      }

      // Verificar nombres ambiguos
      if (parsed.ambiguousNames && parsed.ambiguousNames.length > 0) {
        setPendingParsed(parsed);
        setAmbiguousSelections({});
        setShowAmbiguousModal(true);
        return;
      }

      sessionStorage.setItem('parsedRule', JSON.stringify(parsed));
      setAiResponse(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al analizar la instrucción';
      const ambiguousNames = parseAmbiguousError(message);
      if (ambiguousNames) {
        setPendingParsed(buildParsedForAmbiguous(text.trim(), ambiguousNames));
        setAmbiguousSelections({});
        setShowAmbiguousModal(true);
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  async function handleMissingDataConfirm() {
    const empty = missingDataFields.find(f => !f.value.trim());
    if (empty) {
      setMissingDataError(`"${empty.label}" es obligatorio para continuar`);
      return;
    }
    for (const f of missingDataFields) {
      if (f.type === 'number') {
        const val = parseFloat(f.value);
        if (isNaN(val) || val <= 0) {
          setMissingDataError(`"${f.label}": ingresa un número válido mayor a cero`);
          return;
        }
      }
    }
    setMissingDataError(null);

    const needsReParse = missingDataFields.some(f => f.field === 'destinatarios');

    if (needsReParse) {
      const updatedInstruction = buildInstruction(pendingParsed!, missingDataFields);
      setShowMissingDataModal(false);
      setText(updatedInstruction);
      setLoading(true);
      try {
        const reparsed = await parseRule(updatedInstruction);
        if (reparsed.intent === 'ayuda') {
          setHelpMessage(reparsed.mensaje_ayuda || HELP_DEFAULT);
          return;
        }
        const stillMissing = getMissingFields(reparsed);
        if (stillMissing.length > 0) {
          setPendingParsed(reparsed);
          setMissingDataFields(stillMissing);
          setShowMissingDataModal(true);
          return;
        }
        sessionStorage.setItem('parsedRule', JSON.stringify(reparsed));
        setAiResponse(reparsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al analizar la instrucción');
      } finally {
        setLoading(false);
        setPendingParsed(null);
      }
    } else {
      const merged: ParsedRule = { ...pendingParsed! };
      for (const f of missingDataFields) {
        if (f.field === 'monto_por_persona') merged.monto_por_persona = parseFloat(f.value);
        if (f.field === 'dia_de_pago') merged.dia_de_pago = f.value;
        if (f.field === 'cliente') merged.cliente = f.value;
        if (f.field === 'monto_factura') merged.monto_factura = parseFloat(f.value);
        if (f.field === 'monto_offramp') merged.monto_offramp = parseFloat(f.value);
      }
      sessionStorage.setItem('parsedRule', JSON.stringify(merged));
      setAiResponse(merged);
      setShowMissingDataModal(false);
      setPendingParsed(null);
    }
  }

  function handleMontoConfirm() {
    const val = parseFloat(montoInput);
    if (!val || val <= 0) { setMontoError(true); return; }
    const updated = { ...aiResponse!, monto_factura: val, moneda_factura: monedaInput };
    sessionStorage.setItem('parsedRule', JSON.stringify(updated));
    setShowMontoModal(false);
    navigate('/invoice');
  }

  function handleConfirm() {
    if (!aiResponse) return;

    if (aiResponse.intent === 'factura') {
      if (!aiResponse.monto_factura || aiResponse.monto_factura <= 0) {
        setMontoInput('');
        setMonedaInput(aiResponse.moneda_factura || 'USD');
        setMontoError(false);
        setShowMontoModal(true);
        return;
      }
      navigate('/invoice');
      return;
    }
    if (aiResponse.intent === 'offramp') { navigate('/offramp'); return; }

    const missing = (aiResponse.destinatariosConWallet || []).filter(d => !d.wallet);
    if (missing.length > 0) {
      setMissingForms(missing.map(d => ({
        nombre: cap(d.nombre),
        email: '', wallet: '', clabe: '', password: '', created: false,
        exists: d.exists ?? false,
        employeeId: d.employeeId ?? null,
      })));
      setShowMissingModal(true);
    } else {
      navigate('/confirm');
    }
  }

  function handleAmbiguousConfirm() {
    if (!pendingParsed || !pendingParsed.ambiguousNames) return;

    // Guardar las selecciones antes de limpiar
    const selections = { ...ambiguousSelections };
    
    // Construir el texto actualizado
    let updatedText = text;
    const orderedNames = [...pendingParsed.ambiguousNames].sort((a, b) => b.nombre.length - a.nombre.length);
    
    for (const amb of orderedNames) {
      const replacement = selections[amb.nombre];
      if (replacement && replacement !== amb.nombre) {
        const pattern = new RegExp(`\\b${amb.nombre}\\b`, 'gi');
        updatedText = updatedText.replace(pattern, replacement);
      }
    }
    
    setText(updatedText);
    setShowAmbiguousModal(false);
    setPendingParsed(null);
    setAmbiguousSelections({});
    
    // Re-ejecutar análisis con el nuevo texto
    setLoading(true);
    setTimeout(async () => {
      try {
        const parsed = await parseRule(updatedText.trim());
        
        if (parsed.intent === 'ayuda') {
          setHelpMessage(parsed.mensaje_ayuda || HELP_DEFAULT);
          setLoading(false);
          return;
        }

        const missing = getMissingFields(parsed);
        if (missing.length > 0) {
          setPendingParsed(parsed);
          setMissingDataFields(missing);
          setShowMissingDataModal(true);
          setLoading(false);
          return;
        }

        sessionStorage.setItem('parsedRule', JSON.stringify(parsed));
        setAiResponse(parsed);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al analizar la instrucción');
        setLoading(false);
      }
    }, 100);
  }

  function updateForm(index: number, field: keyof MissingForm, value: string) {
    setMissingForms(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  }

  async function handleCreateAndContinue() {
    setFormErrors(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const form of missingForms) {
      if (!form.wallet || !BASE58.test(form.wallet.trim())) {
        setFormErrors(`Wallet requerida para ${form.nombre}: debe ser una dirección Solana válida (Base58)`);
        return;
      }
      if (!form.exists) {
        if (!form.email || !emailRegex.test(form.email)) {
          setFormErrors(`Correo inválido para ${form.nombre}`);
          return;
        }
        if (!form.password || form.password.length < 6) {
          setFormErrors(`La contraseña de ${form.nombre} debe tener al menos 6 caracteres`);
          return;
        }
      }
    }

    setCreatingUsers(true);
    for (const form of missingForms) {
      if (form.exists && form.employeeId) {
        await supabase.from('employees')
          .update({ wallet: form.wallet.trim() })
          .eq('id', form.employeeId);
      } else {
        const hashed = await hashPassword(form.password, form.email.toLowerCase().trim());
        await supabase.from('employees').insert({
          nombre: form.nombre.trim(),
          email: form.email.toLowerCase().trim(),
          wallet: form.wallet.trim() || null,
          password: hashed,
          role: 'employee',
        });
      }
    }

    setShowMissingModal(false);
    setCreatingUsers(false);

    setLoading(true);
    try {
      const parsed = await parseRule(text.trim());
      sessionStorage.setItem('parsedRule', JSON.stringify(parsed));
      navigate('/confirm');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error al analizar la instrucción');
    } finally {
      setLoading(false);
    }
  }

  const allWalletsFound = aiResponse?.intent === 'pago' &&
    (aiResponse.destinatariosConWallet || []).every(d => d.wallet);

  const someExistNoWallet = aiResponse?.intent === 'pago' && !allWalletsFound &&
    (aiResponse.destinatariosConWallet || []).some(d => d.exists && !d.wallet);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center space-y-5"
            >
              <div className="relative w-16 h-16 mx-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-foreground font-semibold text-lg">Analizando con IA</p>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: monto faltante en factura */}
      {showMontoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-sm p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Falta el monto</h2>
                  <p className="text-xs text-muted-foreground">No detecté una cantidad en tu instrucción</p>
                </div>
              </div>
              <button onClick={() => setShowMontoModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              ¿A qué monto quieres facturar a <span className="text-foreground font-semibold">{aiResponse?.cliente || 'este cliente'}</span>?
            </p>

            <div className="flex gap-2 mb-2">
              <input
                type="number"
                min="0"
                step="any"
                autoFocus
                value={montoInput}
                onChange={e => { setMontoInput(e.target.value); setMontoError(false); }}
                onKeyDown={e => e.key === 'Enter' && handleMontoConfirm()}
                placeholder="0.00"
                className={`fp-input flex-1 px-4 py-3 text-sm ${montoError ? 'border-destructive' : ''}`}
              />
              <select
                value={monedaInput}
                onChange={e => setMonedaInput(e.target.value)}
                className="fp-input px-3 py-3 text-sm font-medium cursor-pointer"
              >
                <option value="USD">USD</option>
                <option value="SOL">SOL</option>
                <option value="USDC">USDC</option>
              </select>
            </div>

            {montoError && (
              <p className="text-xs text-destructive mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Ingresa un monto válido mayor a 0
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowMontoModal(false)} className="fp-btn-secondary flex-1 py-3 text-sm">
                Cancelar
              </button>
              <button onClick={handleMontoConfirm} className="fp-btn-primary flex-[2] py-3 text-sm">
                Continuar con factura →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nombres ambiguos */}
      {showAmbiguousModal && pendingParsed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Nombre ambiguo</h2>
                  <p className="text-xs text-muted-foreground">
                    Hay varios colaboradores con nombres similares
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowAmbiguousModal(false); setPendingParsed(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              {pendingParsed.ambiguousNames?.map((amb, i) => (
                <div key={i}>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    ¿A cuál "{amb.nombre}" te refieres?
                  </label>
                  <select
                    value={ambiguousSelections[amb.nombre] || ''}
                    onChange={e => setAmbiguousSelections(prev => ({ ...prev, [amb.nombre]: e.target.value }))}
                    className="fp-input w-full px-3 py-2.5 text-sm bg-card"
                  >
                    <option value="">Selecciona el colaborador correcto…</option>
                    {amb.matches.map((match, j) => (
                      <option key={j} value={match}>{match}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowAmbiguousModal(false); setPendingParsed(null); }}
                className="fp-btn-secondary flex-1 py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleAmbiguousConfirm}
                disabled={pendingParsed.ambiguousNames?.some(a => !ambiguousSelections[a.nombre])}
                className="fp-btn-primary flex-[2] py-3 text-sm"
              >
                Continuar con selección →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ayuda */}
      {helpMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">FlowPay AI</h2>
              </div>
              <button onClick={() => setHelpMessage(null)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">{helpMessage}</p>
            <div className="space-y-2">
              {QUICK_CHIPS.map((chip, i) => (
                <button key={i} onClick={() => { setText(chip.text); setHelpMessage(null); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${chip.color}`}>
                  {chip.label} →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: datos incompletos en la instrucción */}
      {showMissingDataModal && pendingParsed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Faltan datos</h2>
                  <p className="text-xs text-muted-foreground">
                    La IA detectó la intención pero necesita más información
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowMissingDataModal(false); setPendingParsed(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              {missingDataFields.map((field, i) => (
                <div key={field.field}>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={field.value}
                      onChange={e => updateMissingDataField(i, e.target.value)}
                      className="fp-input w-full px-3 py-2.5 text-sm bg-card"
                    >
                      <option value="">Selecciona un día…</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{cap(opt)}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={e => updateMissingDataField(i, e.target.value)}
                      placeholder={field.placeholder}
                      className="fp-input w-full px-3 py-2.5 text-sm"
                      min={field.type === 'number' ? '0' : undefined}
                      step={field.type === 'number' ? 'any' : undefined}
                    />
                  )}
                </div>
              ))}
            </div>

            {missingDataError && (
              <p className="text-sm text-destructive mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {missingDataError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowMissingDataModal(false); setPendingParsed(null); }}
                className="fp-btn-secondary flex-1 py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleMissingDataConfirm}
                className="fp-btn-primary flex-[2] py-3 text-sm"
              >
                Continuar con estos datos →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: colaboradores no encontrados */}
      {showMissingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {missingForms.every(f => f.exists) ? 'Wallets faltantes' : 'Colaboradores sin wallet'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {missingForms.every(f => f.exists)
                      ? 'Estos colaboradores están registrados pero no tienen wallet'
                      : missingForms.length === 1
                      ? 'Esta persona no está registrada en tu sistema'
                      : 'Algunas personas no están registradas en tu sistema'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMissingModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              {missingForms.every(f => f.exists)
                ? 'Agrega la wallet de cada colaborador para poder enviar el pago.'
                : '¿Quieres registrarlos ahora y continuar con el pago?'}
            </p>

            <div className="space-y-5">
              {missingForms.map((form, i) => (
                <div key={i} className="border border-border/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'var(--gradient-blue)' }}>
                      {form.nombre.charAt(0)}
                    </div>
                    <p className="font-semibold text-foreground">{form.nombre}</p>
                    {form.exists && !form.created && (
                      <span className="ml-auto text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                        Ya registrado
                      </span>
                    )}
                    {form.created && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
                  </div>

                  {!form.exists && (
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => updateForm(i, 'email', e.target.value)}
                        placeholder="correo@empresa.com"
                        className="fp-input w-full pl-9 pr-3 py-2.5 text-sm"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={form.wallet}
                      onChange={e => updateForm(i, 'wallet', e.target.value)}
                      placeholder={form.exists ? 'Wallet de Solana (requerida para recibir el pago)' : 'Wallet de Solana (recomendado para recibir pagos)'}
                      className={`fp-input w-full pl-9 pr-3 py-2.5 text-sm font-mono ${
                        form.wallet && !BASE58.test(form.wallet.trim()) ? 'border-destructive/60' : ''
                      }`}
                    />
                    {form.wallet && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {BASE58.test(form.wallet.trim())
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          : <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                      </span>
                    )}
                  </div>
                  {form.wallet && !BASE58.test(form.wallet.trim()) && (
                    <p className="text-xs text-destructive -mt-2 pl-1">
                      Dirección inválida — debe ser una wallet Solana (Base58, 32-44 caracteres)
                    </p>
                  )}

                  {!form.exists && (
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => updateForm(i, 'password', e.target.value)}
                        placeholder="Contraseña de acceso (mín. 6 caracteres)"
                        className="fp-input w-full pl-9 pr-3 py-2.5 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {formErrors && (
              <p className="text-sm text-destructive mt-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formErrors}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowMissingModal(false)}
                className="fp-btn-secondary flex-1 py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAndContinue}
                disabled={creatingUsers}
                className="fp-btn-primary flex-[2] py-3 text-sm"
              >
                {creatingUsers ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="fp-spinner" /><span>Guardando y reintentando...</span>
                  </div>
                ) : missingForms.every(f => f.exists)
                  ? 'Guardar wallets y continuar →'
                  : `Crear ${missingForms.filter(f => !f.exists).length === 1 ? 'colaborador' : 'colaboradores'} y continuar →`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nombre ambiguo */}
      {modalError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-yellow-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Nombre ambiguo</h2>
              </div>
              <button onClick={() => setModalError(null)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">{modalError}</p>
            <button onClick={() => setModalError(null)} className="fp-btn-primary w-full py-3 text-sm">
              Entendido — voy a corregirlo
            </button>
          </div>
        </div>
      )}

      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }} />

      <main className="flex-1 flex items-center justify-center px-6 relative">
        <div className="w-full max-w-2xl animate-fade-in">

          <div className="flex justify-center mb-6">
            <div className="fp-badge gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Powered by Solana + Groq AI · Red Devnet</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground text-center mb-4 leading-tight tracking-tight">
            Automatiza tus pagos cripto{' '}
            <span className="text-primary">con una frase</span>
          </h1>
          <p className="text-muted-foreground text-center text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Escribe lo que quieres pagar. La IA lo interpreta y ejecuta en Solana en segundos.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {QUICK_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => setText(chip.text)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${chip.color}`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setAiResponse(null); }}
              placeholder='Ejemplo: "Paga 0.05 SOL a Ana, Luis y Carlos cada viernes"'
              className="fp-input w-full px-5 py-4 text-base resize-none placeholder:text-muted-foreground/60"
              style={{ minHeight: '120px' }}
              maxLength={300}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAnalyze();
                }
              }}
            />
          </div>

          <div className="flex justify-end mb-2">
            <span className={`text-xs ${text.length > 270 ? 'text-destructive' : 'text-muted-foreground/40'}`}>
              {text.length}/300
            </span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || loading}
            className="fp-btn-primary w-full py-3.5 px-6 text-base flex items-center justify-center gap-2"
          >
            <span>Analizar instrucción →</span>
          </button>

          {/* AI Response */}
          <AnimatePresence>
            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="mt-5 space-y-3"
              >
                {/* Burbuja del usuario */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="text-sm text-foreground/80 italic">"{aiResponse.textoOriginal || text}"</p>
                  </div>
                </div>

                {/* Burbuja de la IA */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 fp-card p-5">
                    <p className="text-sm font-semibold text-foreground mb-3">
                      Entendido. {buildAITitle(aiResponse)}
                    </p>

                    {/* Campos generales */}
                    {buildAILines(aiResponse).length > 0 && (
                      <div className="space-y-2 mb-4">
                        {buildAILines(aiResponse).map((line, i) => (
                          <div key={i} className="flex items-baseline gap-2 text-sm">
                            <span className="text-primary font-bold shrink-0">→</span>
                            <span className="text-muted-foreground shrink-0">{line.label}:</span>
                            <span className="text-foreground font-semibold">{line.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Verificación de destinatarios (solo para pago) */}
                    {aiResponse.intent === 'pago' && aiResponse.destinatariosConWallet?.length > 0 && (
                      <div className="mb-4 rounded-lg border border-border/50 overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2 bg-muted/20">
                          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Verificación de destinatarios
                          </span>
                        </div>
                        <div className="divide-y divide-border/30">
                          {aiResponse.destinatariosConWallet.map((d, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                              <span className="text-foreground font-medium capitalize">{d.nombre}</span>
                              {d.wallet ? (
                                <span className="flex items-center gap-1.5 text-green-400 text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="font-mono">
                                    {d.wallet.slice(0, 6)}…{d.wallet.slice(-4)}
                                  </span>
                                </span>
                              ) : d.exists ? (
                                <span className="flex items-center gap-1.5 text-blue-400 text-xs">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  Registrado — falta agregar wallet
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-yellow-400 text-xs">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  No registrado — se creará al continuar
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Resumen del estado */}
                        <div className={`px-3 py-2 text-xs flex items-center gap-1.5 ${
                          allWalletsFound
                            ? 'bg-green-500/5 text-green-400'
                            : someExistNoWallet
                            ? 'bg-blue-500/5 text-blue-400'
                            : 'bg-yellow-500/5 text-yellow-400'
                        }`}>
                          {allWalletsFound ? (
                            <><ShieldCheck className="w-3 h-3" /> Todos los destinatarios tienen wallet verificada</>
                          ) : someExistNoWallet ? (
                            <><AlertCircle className="w-3 h-3" /> Colaboradores registrados sin wallet — debes agregarla antes de ejecutar</>
                          ) : (
                            <><AlertCircle className="w-3 h-3" /> Algunos destinatarios no están registrados — se crearán antes de ejecutar</>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mb-4">¿Ejecuto?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAiResponse(null)}
                        className="fp-btn-secondary flex-1 py-2.5 text-sm"
                      >
                        ← Modificar
                      </button>
                      <button
                        onClick={handleConfirm}
                        className="fp-btn-primary flex-[2] py-2.5 text-sm"
                      >
                        Sí, ejecutar ✓
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-destructive text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 text-center">
            <button onClick={() => navigate('/history')}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              <Clock className="w-3.5 h-3.5" />
              Ver historial de pagos
            </button>
          </div>

          <div className="mt-8">
            <p className="text-xs text-muted-foreground/60 text-center mb-3 uppercase tracking-wider font-medium">
              Prueba un ejemplo · Try an example
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLES.map((example, i) => (
                <button key={i} onClick={() => setText(example.text)}
                  className="text-left text-sm text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-lg border border-transparent hover:border-border hover:bg-card/50 transition-all duration-200 flex items-start gap-2">
                  <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                    example.lang === 'EN' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {example.lang}
                  </span>
                  <span>"{example.text}"</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Index;
