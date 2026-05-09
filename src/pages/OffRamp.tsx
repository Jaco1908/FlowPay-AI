import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ChevronRight, Banknote, RefreshCw, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import type { ParsedRule } from '@/types';

const SOL_PRICE_FALLBACK = 148;

export default function OffRamp() {
  const navigate = useNavigate();
  const [rule, setRule] = useState<ParsedRule | null>(null);
  const [step, setStep] = useState<'confirm' | 'processing' | 'done'>('confirm');
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('parsedRule');
    if (!stored) { navigate('/'); return; }
    try { setRule(JSON.parse(stored)); } catch { navigate('/'); }
  }, [navigate]);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
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
  const monto = rule.monto_offramp || 0;
  const moneda = rule.moneda_origen || 'SOL';
  const usd = moneda === 'SOL' ? (monto * price).toFixed(2) : monto.toFixed(2);

  async function handleProcess() {
    setStep('processing');
    await new Promise(r => setTimeout(r, 3000));
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Retiro procesado</h1>
            <p className="text-muted-foreground mb-1">
              <span className="text-foreground font-bold">{monto} {moneda}</span> convertidos a
            </p>
            <p className="text-3xl font-extrabold text-green-400 mb-2">${usd} USD</p>
            <p className="text-sm text-muted-foreground mb-2">Destino: <span className="text-foreground">{rule.destino_offramp || 'cuenta bancaria local'}</span></p>
            <p className="text-xs text-muted-foreground/50 mb-8">
              Tiempo estimado de acreditación: 1-2 días hábiles (simulado)
            </p>
            <button onClick={() => navigate('/')} className="fp-btn-primary w-full py-3 text-sm">
              Volver al inicio
            </button>
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
          <div className="text-center animate-fade-in">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <RefreshCw className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-foreground font-bold text-lg mb-2">Procesando conversión...</p>
            <p className="text-muted-foreground text-sm">Convirtiendo {monto} {moneda} → ${usd} USD</p>
            <p className="text-muted-foreground text-xs mt-1">Conectando con proveedor de liquidez</p>
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">Inicio</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">Off-Ramp</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Convertir a fiat</h1>
              <p className="text-muted-foreground text-sm">Cripto → dinero en tu banco</p>
            </div>
          </div>

          {/* Conversion card */}
          <div className="fp-card p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground mb-1">Envías</p>
                <p className="text-3xl font-extrabold text-foreground">{monto}</p>
                <p className="text-sm text-primary font-semibold">{moneda}</p>
              </div>
              <div className="flex flex-col items-center gap-1 px-4">
                <ArrowDownToLine className="w-6 h-6 text-muted-foreground" />
                {priceLoading ? (
                  <span className="text-xs text-muted-foreground animate-pulse">cargando...</span>
                ) : (
                  <span className="text-xs text-muted-foreground">1 SOL = ${price.toLocaleString()}</span>
                )}
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground mb-1">Recibes</p>
                <p className="text-3xl font-extrabold text-green-400">${usd}</p>
                <p className="text-sm text-green-400 font-semibold">USD</p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Destino</span>
                <span className="text-foreground font-medium">{rule.destino_offramp || 'Cuenta bancaria local'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Comisión estimada</span>
                <span className="text-foreground">1.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recibirás neto</span>
                <span className="text-green-400 font-bold">${(Number(usd) * 0.985).toFixed(2)} USD</span>
              </div>
            </div>
          </div>

          <div className="fp-card p-4 mb-6 border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-xs text-yellow-400 font-medium mb-1">⚠ Simulación de demo</p>
            <p className="text-xs text-muted-foreground">
              Esta función simula una conversión cripto→fiat. En producción se integraría con un proveedor de liquidez regulado (Bitso, Banxa, etc.).
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/')} className="fp-btn-secondary flex-1 py-3 text-sm">← Cancelar</button>
            <button onClick={handleProcess} className="fp-btn-primary flex-[2] py-3 text-sm">
              <Banknote className="w-4 h-4 mr-2 inline" />
              Confirmar retiro →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
