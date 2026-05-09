import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ExternalLink, Copy, Check } from 'lucide-react';
import Header from '@/components/Header';
import type { ExecuteResult, ExecutionItem } from '@/types';

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

          <a
            href={item.explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-accent-foreground transition-all duration-200 hover:opacity-90"
            style={{ background: 'var(--gradient-purple)' }}
          >
            Ver en Solana Explorer
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
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

  useEffect(() => {
    const stored = sessionStorage.getItem('execResult');
    if (!stored) {
      navigate('/');
      return;
    }
    try {
      setResult(JSON.parse(stored));
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
              style={{ background: 'hsl(142 71% 45% / 0.12)' }}>
              <CheckCircle2 className="w-8 h-8 text-success" />
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
          <p className="text-center text-xs text-muted-foreground/50">
            Red: Solana Devnet &bull; Powered by Claude AI
          </p>
        </div>
      </main>
    </div>
  );
};

export default Success;
