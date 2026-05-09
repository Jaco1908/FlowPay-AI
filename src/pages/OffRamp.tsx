import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ChevronRight, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import type { ParsedRule } from '@/types';

const SOL_PRICE_FALLBACK = 148;
const TRANSAK_API_KEY   = import.meta.env.VITE_TRANSAK_API_KEY ?? '';
const IS_DEMO           = !TRANSAK_API_KEY || TRANSAK_API_KEY === 'demo_transak_placeholder';
const TRANSAK_BASE      = 'https://staging-global.transak.com';

type Step = 'confirm' | 'transak' | 'done';

export default function OffRamp() {
  const navigate = useNavigate();
  const [rule, setRule]               = useState<ParsedRule | null>(null);
  const [step, setStep]               = useState<Step>('confirm');
  const [solPrice, setSolPrice]       = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

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

  /* Listen for Transak widget events */
  useEffect(() => {
    if (step !== 'transak') return;
    function handleMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (
          data?.event_id === 'TRANSAK_ORDER_SUCCESSFUL' ||
          data?.event_id === 'TRANSAK_ORDER_CREATED'
        ) {
          setStep('done');
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [step]);

  if (!rule) return null;

  const price    = solPrice ?? SOL_PRICE_FALLBACK;
  const monto    = rule.monto_offramp ?? rule.monto_por_persona ?? 0;
  const moneda   = rule.moneda_origen ?? rule.moneda ?? 'SOL';
  const usdBruto = moneda === 'SOL' ? monto * price : monto;
  const usdNeto  = usdBruto * 0.985;

  const transakUrl = new URL(TRANSAK_BASE);
  transakUrl.searchParams.set('apiKey',              TRANSAK_API_KEY);
  transakUrl.searchParams.set('productsAvailed',     'SELL');
  transakUrl.searchParams.set('cryptoCurrencyCode',  'SOL');
  transakUrl.searchParams.set('fiatCurrency',        'USD');
  transakUrl.searchParams.set('defaultCryptoAmount', String(monto));
  transakUrl.searchParams.set('disableWalletAddressForm', 'true');
  transakUrl.searchParams.set('themeColor',          '3B82F6');
  transakUrl.searchParams.set('hideMenu',            'true');

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
                <span className="text-muted-foreground">Procesado por</span>
                <span className="text-foreground font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> Transak
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Red</span>
                <span className="text-foreground font-medium">Solana Devnet</span>
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
            <span
              className={step === 'confirm' ? 'text-foreground' : 'hover:text-foreground cursor-pointer'}
              onClick={() => step === 'transak' && setStep('confirm')}
            >
              Conversión
            </span>
            {step === 'transak' && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground">Transak</span>
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
                {step === 'confirm' ? 'Convertir a fiat' : 'Conversión vía Transak'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {step === 'confirm' ? 'Cripto → dinero en tu banco' : 'Completa la conversión de SOL a USD'}
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

                {/* Transak branding */}
                <div className="fp-card p-4 mb-5 border border-blue-500/20 bg-blue-500/5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Powered by Transak</p>
                    <p className="text-xs text-muted-foreground">Licenciado en 160+ países · KYC incluido</p>
                  </div>
                  <a
                    href="https://transak.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:underline shrink-0"
                  >
                    transak.com <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => navigate('/')} className="fp-btn-secondary flex-1 py-3 text-sm">← Cancelar</button>
                  <button onClick={() => setStep('transak')} className="fp-btn-primary flex-[2] py-3 text-sm">
                    Continuar con Transak →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP: transak ── */}
            {step === 'transak' && (
              <motion.div key="transak" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>

                {IS_DEMO && (
                  <div className="mb-4 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-400 mb-0.5">Modo staging — integración lista</p>
                      <p className="text-xs text-muted-foreground">
                        Regístrate en{' '}
                        <a
                          href="https://partners.transak.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-yellow-400"
                        >
                          partners.transak.com
                        </a>
                        {' '}para obtener tu API key y actualizar{' '}
                        <code className="font-mono text-yellow-400">VITE_TRANSAK_API_KEY</code>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Widget */}
                <div className="rounded-2xl overflow-hidden mb-4 border border-border/40" style={{ height: '620px' }}>
                  {IS_DEMO ? (
                    <div className="h-full flex flex-col items-center justify-center gap-5 p-8 bg-gradient-to-b from-blue-500/5 to-transparent">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-blue-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-foreground font-bold text-lg mb-1">Widget de Transak</p>
                        <p className="text-muted-foreground text-sm mb-1">
                          Aquí aparece el formulario de conversión SOL → USD
                        </p>
                        <p className="text-muted-foreground/60 text-xs mb-4">
                          {monto} SOL → ~${usdNeto.toFixed(2)} USD · Comisión 1.5%
                        </p>
                        <div className="fp-card p-3 text-left text-[10px] font-mono text-muted-foreground/60 break-all mb-5">
                          {TRANSAK_BASE}?apiKey=&lt;api_key&gt;&amp;productsAvailed=SELL<br />
                          &amp;cryptoCurrencyCode=SOL&amp;fiatCurrency=USD<br />
                          &amp;defaultCryptoAmount={monto}
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                          <p className="text-xs text-muted-foreground/50 mb-1">Para el demo del hackathon:</p>
                          <button
                            onClick={() => setStep('done')}
                            className="fp-btn-green px-8 py-3 text-sm w-full max-w-xs"
                          >
                            Simular conversión exitosa ✓
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={transakUrl.toString()}
                      title="Transak Off-Ramp"
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                      allow="payment *; camera *; microphone *"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                    />
                  )}
                </div>

                {/* Powered by */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-xs text-muted-foreground/50">Conversión procesada por</span>
                  <span className="text-xs font-bold text-blue-400">Transak</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-muted-foreground/50">Licenciado · KYC incluido</span>
                </div>

                <button onClick={() => setStep('confirm')} className="fp-btn-secondary w-full py-3 text-sm">
                  ← Volver
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
