import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, AlertCircle, Clock, X, Users, UserPlus, Mail, Wallet, Lock, CheckCircle2, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import { parseRule } from '@/api/rules/parse';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';
import type { ParsedRule } from '@/types';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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

interface MissingForm {
  nombre: string;
  email: string;
  wallet: string;
  clabe: string;
  password: string;
  created: boolean;
}

const Index = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingForms, setMissingForms] = useState<MissingForm[]>([]);
  const [creatingUsers, setCreatingUsers] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [helpMessage, setHelpMessage] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<ParsedRule | null>(null);

  const HELP_PATTERNS = /^(hola|hello|hi|hey|buenos\s+días?|buenas|buen\s+día|qué\s+puedes|que\s+puedes|what\s+can|ayuda|help|cómo\s+funciona|como\s+funciona|qué\s+eres|que\s+eres|qué\s+haces|que\s+haces|para\s+qué|para\s+que|info|información)[\s.,!?]*/i;

  function buildAITitle(parsed: ParsedRule): string {
    if (parsed.intent === 'pago') return parsed.frecuencia ? 'Detecté un pago recurrente:' : 'Detecté un pago puntual:';
    if (parsed.intent === 'factura') return 'Voy a crear una factura:';
    if (parsed.intent === 'offramp') return 'Voy a convertir cripto a fiat:';
    return 'Entendido:';
  }

  function buildAILines(parsed: ParsedRule): { label: string; value: string }[] {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    if (parsed.intent === 'pago') {
      const lines: { label: string; value: string }[] = [];
      if (parsed.destinatarios?.length)
        lines.push({ label: 'Destinatarios', value: parsed.destinatarios.map(cap).join(', ') });
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
      if (parsed.monto_por_persona) lines.push({ label: 'Monto', value: `${parsed.monto_por_persona} ${parsed.moneda || 'SOL'}` });
      return lines;
    }
    return [];
  }

  const HELP_DEFAULT = 'Puedo hacer 3 cosas por ti: 1) Pagar nómina — transfiero SOL a tu equipo con una frase. 2) Generar facturas — creo y rastreo cobros a tus clientes. 3) Convertir cripto a fiat — convierto tu SOL a dinero en tu cuenta bancaria. ¿Por dónde quieres empezar?';

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
      sessionStorage.setItem('parsedRule', JSON.stringify(parsed));

      if (parsed.intent === 'ayuda') {
        setHelpMessage(parsed.mensaje_ayuda || HELP_DEFAULT);
        return;
      }

      setAiResponse(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar la instrucción');
    } finally {
      setLoading(false);
    }
  };

  function handleConfirm() {
    if (!aiResponse) return;

    if (aiResponse.intent === 'factura') { navigate('/invoice'); return; }
    if (aiResponse.intent === 'offramp') { navigate('/offramp'); return; }

    const missing = (aiResponse.destinatariosConWallet || []).filter((d: any) => !d.wallet);
    if (missing.length > 0) {
      setMissingForms(missing.map((d: any) => ({
        nombre: d.nombre.charAt(0).toUpperCase() + d.nombre.slice(1),
        email: '', wallet: '', clabe: '', password: '', created: false,
      })));
      setShowMissingModal(true);
    } else {
      navigate('/confirm');
    }
  }

  function updateForm(index: number, field: keyof MissingForm, value: string) {
    setMissingForms(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  }

  async function handleCreateAndContinue() {
    setFormErrors(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const form of missingForms) {
      if (!form.email || !emailRegex.test(form.email)) {
        setFormErrors(`Correo inválido para ${form.nombre}`);
        return;
      }
      if (!form.password || form.password.length < 6) {
        setFormErrors(`La contraseña de ${form.nombre} debe tener al menos 6 caracteres`);
        return;
      }
      if (form.wallet && !BASE58.test(form.wallet.trim())) {
        setFormErrors(`Wallet inválida para ${form.nombre}`);
        return;
      }
    }

    setCreatingUsers(true);
    for (const form of missingForms) {
      const hashed = await hashPassword(form.password, form.email.toLowerCase().trim());
      await supabase.from('employees').insert({
        nombre: form.nombre.trim(),
        email: form.email.toLowerCase().trim(),
        wallet: form.wallet.trim() || null,
        clabe: form.clabe.trim() || null,
        password: hashed,
        role: 'employee',
      });
    }

    setShowMissingModal(false);
    setCreatingUsers(false);

    // Re-analizar con los nuevos empleados ya creados
    setLoading(true);
    try {
      const parsed = await parseRule(text.trim());
      sessionStorage.setItem('parsedRule', JSON.stringify(parsed));
      navigate('/confirm');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al analizar la instrucción';
      setModalError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Framer Motion loading overlay */}
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
                  <h2 className="text-lg font-bold text-foreground">Colaboradores no encontrados</h2>
                  <p className="text-xs text-muted-foreground">
                    {missingForms.length === 1
                      ? 'Esta persona no está registrada'
                      : 'Estas personas no están registradas'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMissingModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              ¿Quieres registrarlos ahora y continuar con el pago?
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
                    {form.created && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
                  </div>

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

                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={form.wallet}
                      onChange={e => updateForm(i, 'wallet', e.target.value)}
                      placeholder="Wallet de Solana (opcional)"
                      className="fp-input w-full pl-9 pr-3 py-2.5 text-sm font-mono"
                    />
                  </div>

                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={form.clabe}
                      onChange={e => updateForm(i, 'clabe', e.target.value.replace(/\D/g, '').slice(0, 18))}
                      placeholder="CLABE bancaria (opcional, 18 dígitos)"
                      inputMode="numeric"
                      className="fp-input w-full pl-9 pr-3 py-2.5 text-sm font-mono"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => updateForm(i, 'password', e.target.value)}
                      placeholder="Contraseña (mín. 6 caracteres)"
                      className="fp-input w-full pl-9 pr-3 py-2.5 text-sm"
                    />
                  </div>
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
                    <div className="fp-spinner" /><span>Creando y reintentando...</span>
                  </div>
                ) : `Crear ${missingForms.length === 1 ? 'colaborador' : 'colaboradores'} y continuar →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal error nombre ambiguo */}
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

      {/* Glow effect */}
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

          {/* Quick action chips */}
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
              onChange={(e) => { setText(e.target.value); setAiResponse(null); }}
              placeholder='Ejemplo: "Paga 0.05 SOL a Ana, Luis y Carlos cada viernes"'
              className="fp-input w-full px-5 py-4 text-base resize-none placeholder:text-muted-foreground/60"
              style={{ minHeight: '120px' }}
              maxLength={300}
              onKeyDown={(e) => {
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
            onClick={() => handleAnalyze()}
            disabled={!text.trim() || loading}
            className="fp-btn-primary w-full py-3.5 px-6 text-base flex items-center justify-center gap-2"
          >
            <span>Analizar instrucción →</span>
          </button>

          {/* AI Response Card */}
          <AnimatePresence>
            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="mt-5 space-y-3"
              >
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="text-sm text-foreground/80 italic">"{aiResponse.textoOriginal || text}"</p>
                  </div>
                </div>

                {/* AI bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 fp-card p-5">
                    <p className="text-sm font-semibold text-foreground mb-3">
                      Entendido. {buildAITitle(aiResponse)}
                    </p>
                    <div className="space-y-2 mb-4">
                      {buildAILines(aiResponse).map((line, i) => (
                        <div key={i} className="flex items-baseline gap-2 text-sm">
                          <span className="text-primary font-bold shrink-0">→</span>
                          <span className="text-muted-foreground shrink-0">{line.label}:</span>
                          <span className="text-foreground font-semibold">{line.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">¿Ejecuto?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setAiResponse(null); }}
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
