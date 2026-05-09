import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Users, Coins, Clock, CalendarDays,
  Zap, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import Header from '@/components/Header';
import { executeRule } from '@/api/rules/execute';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { ParsedRule } from '@/types';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const EMPRESA_WALLET = '6iLi5YmwUbtejobpafvYM9NzMiFFbPLDnKgjoF6Rhr9e';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function buildAIMessage(rule: ParsedRule): string {
  const count = rule.destinatarios?.length || 0;
  const total = (rule.monto_por_persona || 0) * count;
  const moneda = rule.moneda || 'SOL';

  const names = (rule.destinatarios || [])
    .map(capitalize)
    .reduce((acc: string, name: string, i: number, arr: string[]) => {
      if (i === 0) return name;
      if (i === arr.length - 1) return `${acc} y ${name}`;
      return `${acc}, ${name}`;
    }, '');

  let msg = 'Instrucción recibida.';
  if (names) msg += ` He identificado ${count} ${count === 1 ? 'destinatario' : 'destinatarios'}: ${names}.`;
  if (rule.monto_por_persona) {
    msg += ` El pago es de ${rule.monto_por_persona} ${moneda} por persona`;
    if (count > 1) msg += `, totalizando ${total.toFixed(4)} ${moneda}`;
    msg += '.';
  }
  if (rule.frecuencia) {
    msg += ` Frecuencia: ${rule.frecuencia}`;
    if (rule.dia_de_pago) msg += ` (los ${rule.dia_de_pago})`;
    msg += '.';
  }
  msg += ' ¿Confirmas que proceda con la firma en Solana Devnet?';
  return msg;
}

function useTypewriter(text: string, speed = 16) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return { displayed, done };
}

const Confirm = () => {
  const navigate = useNavigate();
  const [rule, setRule] = useState<ParsedRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [showCard, setShowCard] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const { displayed, done } = useTypewriter(aiMessage, 16);

  useEffect(() => {
    const stored = sessionStorage.getItem('parsedRule');
    if (!stored) { navigate('/'); return; }
    try {
      const parsed = JSON.parse(stored) as ParsedRule;
      setRule(parsed);
      setTimeout(() => setAiMessage(buildAIMessage(parsed)), 550);
    } catch {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (!done) return;
    const t1 = setTimeout(() => setShowCard(true), 280);
    const t2 = setTimeout(() => setShowButtons(true), 680);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [done]);

  if (!rule) return null;

  const nullFields: string[] = [];
  if (!rule.monto_por_persona) nullFields.push('Monto por persona');
  if (!rule.frecuencia) nullFields.push('Frecuencia');
  if (!rule.destinatarios || rule.destinatarios.length === 0) nullFields.push('Destinatarios');

  const montoInvalido = !!rule.monto_por_persona && rule.monto_por_persona <= 0;
  const hasBlockingNulls = nullFields.length > 0 || montoInvalido;
  const count = rule.destinatarios?.length || 0;
  const totalSOL = (rule.monto_por_persona || 0) * count;

  const handleExecute = async () => {
    if (loading || hasBlockingNulls) return;
    setLoading(true);
    setError(null);
    try {
      const lamports = await connection.getBalance(new PublicKey(EMPRESA_WALLET));
      const balanceSOL = lamports / LAMPORTS_PER_SOL;
      if (balanceSOL < totalSOL) {
        setError(`Saldo insuficiente. La empresa tiene ${balanceSOL.toFixed(4)} SOL pero se necesitan ${totalSOL.toFixed(4)} SOL.`);
        setLoading(false);
        return;
      }
      const result = await executeRule(rule);
      sessionStorage.setItem('execResult', JSON.stringify(result));
      navigate('/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar los pagos');
      setLoading(false);
    }
  };

  const summaryRows = [
    {
      icon: <Users className="w-4 h-4" />,
      label: 'Destinatarios',
      value: count ? rule.destinatarios.map(capitalize).join(', ') : null,
    },
    {
      icon: <Coins className="w-4 h-4" />,
      label: 'Monto por persona',
      value: rule.monto_por_persona
        ? `${rule.monto_por_persona} SOL`
        : null,
      highlight: true,
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Frecuencia',
      value: rule.frecuencia,
    },
    {
      icon: <CalendarDays className="w-4 h-4" />,
      label: 'Día de pago',
      value: rule.dia_de_pago || 'No especificado',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Header />

      {/* Ambient background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(199 89% 48% / 0.07) 0%, transparent 70%)' }}
      />

      {/* Execution loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
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
                <p className="text-foreground font-semibold text-lg">Firmando en Solana Devnet</p>
                <p className="text-muted-foreground text-sm mt-1">Esperando confirmación de la red...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-xl">

          {/* ── AI message bubble ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-3 mb-7"
          >
            {/* Avatar */}
            <div className="relative shrink-0 mt-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: 'var(--gradient-blue)' }}
              >
                <Zap className="w-[1.05rem] h-[1.05rem] text-white" />
              </div>
              {/* Pulse ring while AI is "speaking" */}
              {!done && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full border border-primary/50"
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">FlowPay AI</span>
                <span className="text-muted-foreground/30 text-xs">·</span>
                <span className="text-xs text-muted-foreground/50">Agente de pagos</span>
              </div>

              {/* Bubble */}
              <div
                className="rounded-2xl rounded-tl-sm px-5 py-4"
                style={{
                  background: 'hsl(222 47% 10%)',
                  border: '1px solid hsl(222 20% 17%)',
                  boxShadow: '0 4px 20px hsl(0 0% 0% / 0.3)',
                }}
              >
                {aiMessage === '' ? (
                  /* Thinking dots before typing starts */
                  <div className="flex items-center gap-1.5 py-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                        className="w-1.5 h-1.5 rounded-full bg-primary/60"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground/90 text-sm leading-relaxed">
                    {displayed}
                    {/* Blinking cursor */}
                    {!done && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.55, repeat: Infinity }}
                        className="inline-block w-[2px] h-[1.1em] bg-primary ml-[2px] align-middle rounded-full"
                      />
                    )}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── Summary card — cascade fade-in ── */}
          <AnimatePresence>
            {showCard && (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="mb-5"
              >
                {/* Section label */}
                <div className="flex items-center gap-2 px-1 mb-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Orden detectada
                  </span>
                </div>
                <div className="fp-card p-1">
                  {summaryRows.map((row, i) => (
                    <div key={i} className={`flex items-center justify-between px-5 py-4 ${i !== summaryRows.length - 1 ? 'border-b border-border/50' : ''}`}>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        {row.icon}
                        <span className="text-sm font-medium">{row.label}</span>
                      </div>
                      <div className="text-right">
                        {row.value ? (
                          <span className={`text-sm font-semibold ${row.highlight ? 'text-success' : 'text-foreground'}`}>
                            {row.value}
                          </span>
                        ) : (
                          <span className="text-sm text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            No detectado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Network status */}
                <div className="flex items-center justify-end gap-2 mt-2 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="text-[11px] text-muted-foreground/50">
                    Solana Devnet · Transacción verificable on-chain
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Validation warning ── */}
          <AnimatePresence>
            {showCard && hasBlockingNulls && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-5 p-4 rounded-xl border border-destructive/30 bg-destructive/5"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive mb-0.5">
                      {montoInvalido ? 'Monto inválido' : 'Información incompleta'}
                    </p>
                    <p className="text-sm text-destructive/80">
                      {montoInvalido
                        ? 'El monto debe ser mayor a 0. Ej: "Paga 0.05 SOL a Ana".'
                        : `Campos no detectados: ${nullFields.join(', ')}.`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Runtime error ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-4 rounded-xl border border-destructive/30 bg-destructive/5"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Action buttons — last to appear ── */}
          <AnimatePresence>
            {showButtons && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex gap-3"
              >
                <button
                  onClick={() => navigate('/')}
                  className="fp-btn-secondary flex items-center justify-center gap-2 flex-1 py-3 px-4 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Modificar
                </button>

                <button
                  onClick={handleExecute}
                  disabled={hasBlockingNulls || loading}
                  className="relative fp-btn-green flex-[2] py-3 px-5 text-sm flex items-center justify-center gap-2 overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {/* Shimmer sweep on hover */}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                  <Zap className="w-4 h-4 relative z-10 shrink-0" />
                  <span className="relative z-10">Aprobar y ejecutar en Solana</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
};

export default Confirm;
