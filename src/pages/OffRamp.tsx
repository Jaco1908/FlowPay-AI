import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ChevronRight, Banknote, RefreshCw, CheckCircle2, User, Building2, CreditCard, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import type { ParsedRule } from '@/types';

const SOL_PRICE_FALLBACK = 148;

const BANKS = [
  'Banco Pichincha', 'Banco de Guayaquil', 'Banco del Pacífico', 'Produbanco',
  'Banco Internacional', 'Banco Bolivariano', 'Banco del Austro',
  'Banco Solidario', 'Banco General Rumiñahui', 'BanEcuador', 'Cooperativa JEP',
  'Mutualista Pichincha', 'Otro',
];

type Step = 'confirm' | 'bank' | 'processing' | 'done';

interface BankForm {
  titular: string;
  banco: string;
  clabe: string;
  clabeConfirm: string;
}

export default function OffRamp() {
  const navigate = useNavigate();
  const [rule, setRule] = useState<ParsedRule | null>(null);
  const [step, setStep] = useState<Step>('confirm');
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [bank, setBank] = useState<BankForm>({ titular: '', banco: '', clabe: '', clabeConfirm: '' });
  const [bankError, setBankError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('parsedRule');
    if (!stored) { navigate('/'); return; }
    try { setRule(JSON.parse(stored)); } catch { navigate('/'); }
  }, [navigate]);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
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

  if (!rule) return null;

  const price = solPrice ?? SOL_PRICE_FALLBACK;
  const monto = rule.monto_offramp || rule.monto_por_persona || 0;
  const moneda = rule.moneda_origen || rule.moneda || 'SOL';
  const usdBruto = moneda === 'SOL' ? monto * price : monto;
  const usdNeto = usdBruto * 0.985;
  const clabeDisplay = bank.clabe ? `****${bank.clabe.slice(-4)}` : '—';

  function handleBankContinue() {
    setBankError(null);
    if (!bank.titular.trim()) { setBankError('Ingresa el nombre del titular'); return; }
    if (!bank.banco) { setBankError('Selecciona un banco'); return; }
    if (!/^\d{18}$/.test(bank.clabe.trim())) {
      setBankError('La Número de cuenta debe tener exactamente 18 dígitos'); return;
    }
    if (bank.clabe !== bank.clabeConfirm) {
      setBankError('Las CLABEs no coinciden, verifica que sean iguales'); return;
    }
    handleProcess();
  }

  async function handleProcess() {
    setStep('processing');
    await new Promise(r => setTimeout(r, 3500));
    setStep('done');
  }

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
                <span className="text-muted-foreground">Titular</span>
                <span className="text-foreground font-medium">{bank.titular || rule.destino_offramp || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Banco</span>
                <span className="text-foreground font-medium">{bank.banco || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CLABE</span>
                <span className="text-foreground font-mono font-medium">{clabeDisplay}</span>
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

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center animate-fade-in space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-400"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div>
              <p className="text-foreground font-bold text-lg">Procesando conversión</p>
              <p className="text-muted-foreground text-sm mt-1">
                {monto} {moneda} → ${usdNeto.toFixed(2)} USD
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Enviando a {bank.banco} {clabeDisplay}
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-purple-400 rounded-full"
                />
              ))}
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
            <span className={step === 'confirm' ? 'text-foreground' : 'hover:text-foreground cursor-pointer'}
              onClick={() => step === 'bank' && setStep('confirm')}>
              Conversión
            </span>
            {step === 'bank' && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground">Datos bancarios</span>
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
                {step === 'confirm' ? 'Convertir a fiat' : 'Datos bancarios'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {step === 'confirm' ? 'Cripto → dinero en tu banco' : '¿A qué cuenta enviamos?'}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP: confirm ── */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                {/* Conversion card */}
                <div className="fp-card p-6 mb-6">
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

                <div className="fp-card p-4 mb-6 border border-yellow-500/20 bg-yellow-500/5">
                  <p className="text-xs text-yellow-400 font-medium mb-1">Simulación de demo</p>
                  <p className="text-xs text-muted-foreground">
                    En producción se integraría con Bitso o Transak para transferencias SPEI reales.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => navigate('/')} className="fp-btn-secondary flex-1 py-3 text-sm">← Cancelar</button>
                  <button onClick={() => setStep('bank')} className="fp-btn-primary flex-[2] py-3 text-sm">
                    Continuar → Datos bancarios
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP: bank ── */}
            {step === 'bank' && (
              <motion.div key="bank" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="fp-card p-1 mb-5">
                  {/* Titular */}
                  <div className="px-5 py-4 border-b border-border/50">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-2">
                      <User className="w-3.5 h-3.5" /> Nombre del titular
                    </label>
                    <input
                      value={bank.titular}
                      onChange={e => setBank(b => ({ ...b, titular: e.target.value }))}
                      placeholder="Ej. Juan Pérez García"
                      className="fp-input w-full px-3 py-2.5 text-sm"
                    />
                  </div>

                  {/* Banco */}
                  <div className="px-5 py-4 border-b border-border/50">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-2">
                      <Building2 className="w-3.5 h-3.5" /> Banco
                    </label>
                    <select
                      value={bank.banco}
                      onChange={e => setBank(b => ({ ...b, banco: e.target.value }))}
                      className="fp-input w-full px-3 py-2.5 text-sm bg-card"
                    >
                      <option value="">Selecciona tu banco…</option>
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  {/* CLABE */}
                  <div className="px-5 py-4 border-b border-border/50">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-2">
                      <CreditCard className="w-3.5 h-3.5" /> Número de cuenta
                    </label>
                    <input
                      value={bank.clabe}
                      onChange={e => setBank(b => ({ ...b, clabe: e.target.value.replace(/\D/g, '').slice(0, 18) }))}
                      placeholder="18 dígitos"
                      inputMode="numeric"
                      className="fp-input w-full px-3 py-2.5 text-sm font-mono tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground/60 mt-1.5">{bank.clabe.length}/18 dígitos</p>
                  </div>

                  {/* Confirmar CLABE */}
                  <div className="px-5 py-4">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-2">
                      <CreditCard className="w-3.5 h-3.5" /> Confirmar CLABE
                    </label>
                    <input
                      value={bank.clabeConfirm}
                      onChange={e => setBank(b => ({ ...b, clabeConfirm: e.target.value.replace(/\D/g, '').slice(0, 18) }))}
                      placeholder="Escribe la CLABE de nuevo"
                      inputMode="numeric"
                      className={`fp-input w-full px-3 py-2.5 text-sm font-mono tracking-widest ${
                        bank.clabeConfirm.length === 18
                          ? bank.clabeConfirm === bank.clabe
                            ? 'border-green-500/50 focus:border-green-500'
                            : 'border-destructive/50 focus:border-destructive'
                          : ''
                      }`}
                    />
                    {bank.clabeConfirm.length === 18 && (
                      <p className={`text-xs mt-1.5 flex items-center gap-1 ${bank.clabeConfirm === bank.clabe ? 'text-green-400' : 'text-destructive'}`}>
                        {bank.clabeConfirm === bank.clabe
                          ? <><CheckCircle2 className="w-3 h-3" /> Las CLABEs coinciden</>
                          : <><AlertCircle className="w-3 h-3" /> No coinciden</>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumen */}
                <div className="fp-card p-4 mb-5 border border-purple-500/20 bg-purple-500/5">
                  <p className="text-xs text-purple-400 font-medium mb-1">Resumen del retiro</p>
                  <p className="text-xs text-muted-foreground">
                    {monto} {moneda} → <span className="text-green-400 font-semibold">${usdNeto.toFixed(2)} USD</span> a tu cuenta bancaria
                  </p>
                </div>

                {bankError && (
                  <div className="flex items-center gap-2 text-destructive text-sm mb-4 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bankError}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep('confirm')} className="fp-btn-secondary flex-1 py-3 text-sm">← Volver</button>
                  <button onClick={handleBankContinue} className="fp-btn-primary flex-[2] py-3 text-sm flex items-center justify-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Confirmar retiro →
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
