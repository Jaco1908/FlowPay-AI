import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ChevronRight, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import type { ParsedRule } from '@/types';

const SOL_PRICE_FALLBACK = 148;

type Step = 'confirm' | 'processing' | 'done';

const PROCESSING_STEPS = [
  { label: 'Verificando saldo en wallet',        ms: 900  },
  { label: 'Iniciando transferencia on-chain',   ms: 1400 },
  { label: 'Confirmando transacción en Solana',  ms: 1800 },
  { label: 'Convirtiendo SOL → USD',             ms: 1200 },
  { label: 'Acreditando en cuenta bancaria',     ms: 1000 },
];

export default function OffRamp() {
  const navigate = useNavigate();
  const [rule, setRule]             = useState<ParsedRule | null>(null);
  const [step, setStep]             = useState<Step>('confirm');
  const [solPrice, setSolPrice]     = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [currentStep, setCurrentStep]  = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem('parsedRule');
    if (!stored) { navigate('/'); return; }
    try { setRule(JSON.parse(stored)); } catch { navigate('/'); }
  }, [navigate]);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await res.json();
        setSolPrice(data?.solana?.usd ?? SOL_PRICE_FALLBACK);
      } catch {
        setSolPrice(SOL_PRICE_FALLBACK);
      } finally {
        setPriceLoading(false);
      }
    }
    fetchPrice();
  }, []);

  /* Animate processing steps when entering that stage */
  useEffect(() => {
    if (step !== 'processing') return;
    setCurrentStep(0);
    let idx = 0;
    function next() {
      idx++;
      if (idx < PROCESSING_STEPS.length) {
        setCurrentStep(idx);
        setTimeout(next, PROCESSING_STEPS[idx].ms);
      } else {
        setTimeout(() => setStep('done'), 600);
      }
    }
    setTimeout(next, PROCESSING_STEPS[0].ms);
  }, [step]);

  if (!rule) return null;

  const price    = solPrice ?? SOL_PRICE_FALLBACK;
  const monto    = rule.monto_offramp ?? rule.monto_por_persona ?? 0;
  const moneda   = rule.moneda_origen ?? rule.moneda ?? 'SOL';
  const usdBruto = moneda === 'SOL' ? monto * price : monto;
  const usdNeto  = usdBruto * 0.985;

  /* ── Done ── */
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Retiro en camino</h1>
            <p className="text-muted-foreground mb-1">
              <span className="text-foreground font-bold">{monto} {moneda}</span> convertidos a
            </p>
            <p className="text-4xl font-extrabold text-green-400 mb-1">${usdNeto.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mb-5">USD neto (después de comisión 1.5%)</p>

            <div className="fp-card p-4 text-left space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Red</span>
                <span className="text-foreground font-medium">Solana Devnet</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Precio SOL usado</span>
                <span className="text-foreground font-medium">${price.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border/50 pt-3">
                <span className="text-muted-foreground">Acreditación estimada</span>
                <span className="text-foreground font-medium">1–2 días hábiles</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/dashboard')} className="fp-btn-secondary flex-1 py-3 text-sm">
                Ver dashboard
              </button>
              <button onClick={() => navigate('/')} className="fp-btn-primary flex-1 py-3 text-sm">
                Inicio →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-xl animate-fade-in">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">Inicio</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className={step === 'confirm' ? 'text-foreground' : ''}>Conversión</span>
            {step === 'processing' && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground">Procesando</span>
              </>
            )}
          </div>

          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {step === 'confirm' ? 'Convertir a fiat' : 'Procesando conversión'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {step === 'confirm' ? 'Cripto → dinero en tu banco' : 'Ejecutando transferencia on-chain'}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP: confirm ── */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>

                <div className="fp-card p-6 mb-5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Envías</p>
                      <p className="text-3xl font-extrabold text-foreground">{monto}</p>
                      <p className="text-sm text-primary font-semibold">{moneda}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 px-4">
                      <ArrowDownToLine className="w-5 h-5 text-muted-foreground" />
                      {priceLoading ? (
                        <span className="text-xs text-muted-foreground animate-pulse">cargando...</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">1 SOL = ${price.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Recibes</p>
                      <p className="text-3xl font-extrabold text-green-400">${usdNeto.toFixed(2)}</p>
                      <p className="text-sm text-green-400 font-semibold">USD</p>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor bruto</span>
                      <span className="text-foreground">${usdBruto.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Comisión (1.5%)</span>
                      <span className="text-foreground">−${(usdBruto * 0.015).toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-border/30 pt-2 mt-1">
                      <span className="text-foreground">Total a recibir</span>
                      <span className="text-green-400">${usdNeto.toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>

                <div className="fp-card p-4 mb-5 border border-purple-500/20 bg-purple-500/5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Conversión segura</p>
                    <p className="text-xs text-muted-foreground">Precio en tiempo real · Comisión fija 1.5%</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => navigate('/')} className="fp-btn-secondary flex-1 py-3 text-sm">← Cancelar</button>
                  <button onClick={() => setStep('processing')} className="fp-btn-primary flex-[2] py-3 text-sm">
                    Confirmar conversión →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP: processing ── */}
            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="fp-card p-8">
                  <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center mb-4">
                      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                    <p className="text-lg font-bold text-foreground mb-1">Procesando tu retiro</p>
                    <p className="text-sm text-muted-foreground">{monto} {moneda} → ${usdNeto.toFixed(2)} USD</p>
                  </div>

                  <div className="space-y-3">
                    {PROCESSING_STEPS.map((s, i) => {
                      const done    = i < currentStep;
                      const active  = i === currentStep;
                      return (
                        <div key={i} className={`flex items-center gap-3 transition-opacity duration-300 ${i > currentStep ? 'opacity-30' : 'opacity-100'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                            ${done   ? 'bg-green-500/20'  : ''}
                            ${active ? 'bg-purple-500/20' : ''}
                            ${!done && !active ? 'bg-muted/20' : ''}
                          `}>
                            {done
                              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                              : active
                                ? <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                                : <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                            }
                          </div>
                          <span className={`text-sm ${done ? 'text-green-400' : active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
