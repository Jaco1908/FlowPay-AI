import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Copy, Check, ShieldCheck, ArrowUpRight } from 'lucide-react';
import Header from '@/components/Header';
import type { ExecuteResult, ExecutionItem } from '@/types';

const CONFETTI_COLORS = ['#3B82F6', '#22C55E', '#7C3AED', '#F59E0B', '#EC4899'];

function launchConfetti() {
  const count = 80;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    el.style.width = `${6 + Math.random() * 8}px`;
    el.style.height = `${6 + Math.random() * 8}px`;
    el.style.animationDuration = `${2 + Math.random() * 2}s`;
    el.style.animationDelay = `${Math.random() * 0.8}s`;
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

const truncateHash = (hash: string) => {
  if (!hash || hash.length < 30) return hash;
  return `${hash.slice(0, 20)}...${hash.slice(-8)}`;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TxCard = ({ item, index }: { item: ExecutionItem; index: number }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!item.tx_hash) return;
    navigator.clipboard.writeText(item.tx_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = item.status === 'success';

  return (
    <div
      className="fp-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-foreground font-semibold text-lg">
            {capitalize(item.nombre)}
          </p>
          {isSuccess && (
            <p className="text-success font-bold text-xl mt-1">
              {item.monto} {item.moneda}
            </p>
          )}
        </div>
        {isSuccess ? (
          <span className="fp-badge-success text-xs px-3 py-1.5 rounded-full font-semibold">
            ✓ Confirmado
          </span>
        ) : (
          <span className="fp-badge-error text-xs px-3 py-1.5 rounded-full font-semibold">
            ✗ Error
          </span>
        )}
      </div>

      {isSuccess && item.tx_hash ? (
        <>
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1.5">Hash de transacción:</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover:bg-muted transition-colors w-full group"
            >
              <code className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors flex-1 text-left">
                {truncateHash(item.tx_hash)}
              </code>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {/* Transferencia SOL */}
            <a
              href={item.explorer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-accent-foreground transition-all duration-200 hover:opacity-90"
              style={{ background: 'var(--gradient-purple)' }}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Ver transferencia SOL
              <ExternalLink className="w-3.5 h-3.5 ml-auto" />
            </a>

            {/* Registro on-chain en contrato FlowPay */}
            {item.on_chain_record ? (
              <a
                href={item.on_chain_record}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 hover:bg-muted/50"
                style={{ borderColor: 'hsl(142 71% 45% / 0.4)', color: 'hsl(142 71% 45%)' }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Registro on-chain · Contrato FlowPay
                <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
              </a>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border border-dashed border-border text-muted-foreground/50">
                <ShieldCheck className="w-3.5 h-3.5" />
                Registro on-chain pendiente
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-destructive">
          {item.error || 'Error desconocido'}
        </p>
      )}
    </div>
  );
};

const Success = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const confettiFired = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('execResult');
    if (!stored) {
      navigate('/');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setResult(parsed);
      const hasSuccess = parsed.executions?.some((e: ExecutionItem) => e.status === 'success');
      if (hasSuccess && !confettiFired.current) {
        confettiFired.current = true;
        setTimeout(launchConfetti, 300);
      }
    } catch {
      navigate('/');
    }
  }, [navigate]);

  if (!result) return null;

  const successCount = result.executions.filter(e => e.status === 'success').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10 animate-fade-in">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 animate-check-pop animate-glow-pulse"
              style={{ background: 'hsl(142 71% 45% / 0.15)' }}
            >
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
              ¡Pagos ejecutados en Solana!
            </h1>
            <p className="text-muted-foreground">
              {successCount} de {result.executions.length} transacciones confirmadas en blockchain
            </p>
          </div>

          {/* Transaction cards */}
          <div className="space-y-4 mb-10">
            {result.executions.map((item, i) => (
              <TxCard key={i} item={item} index={i} />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 mb-8">
            <button
              onClick={() => {
                sessionStorage.removeItem('parsedRule');
                sessionStorage.removeItem('execResult');
                navigate('/');
              }}
              className="fp-btn-primary w-full py-3.5 px-6 text-sm"
            >
              + Crear otra regla
            </button>
            <button
              onClick={() => navigate('/history')}
              className="w-full py-3.5 px-6 text-sm font-medium rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
            >
              Ver historial de pagos
            </button>
          </div>

          {/* Footer */}
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground/50">
              Red: Solana Devnet &bull; Powered by Groq AI
            </p>
            <a
              href="https://explorer.solana.com/address/Dv3iyDKKqxxno1DvuJGHfp6MDHhQsVVejfztcmoqUnds?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
            >
              <ShieldCheck className="w-3 h-3" />
              Contrato FlowPay en Devnet
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Success;
