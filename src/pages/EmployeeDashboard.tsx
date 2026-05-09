import React, { useEffect, useState } from 'react';
import { ExternalLink, Wallet, CheckCircle2, Clock, LogOut } from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

interface Execution {
  id: string;
  monto: number;
  tx_hash: string;
  status: string;
  executed_at: string;
  rules: { moneda: string; frecuencia: string; raw_text: string } | null;
}

interface Rule {
  id: string;
  raw_text: string;
  monto_por_persona: number;
  moneda: string;
  frecuencia: string;
  dia_de_pago: string;
  status: string;
}

const truncateHash = (h: string) => h ? `${h.slice(0, 14)}...${h.slice(-6)}` : '';

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
    if (user.wallet) fetchBalance(user.wallet);
  }, [user]);

  async function fetchBalance(wallet: string) {
    try {
      const lamports = await connection.getBalance(new PublicKey(wallet));
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch { setBalance(null); }
  }

  async function fetchData() {
    if (!user) return;
    const nombre = user.nombre.toLowerCase();

    const [exResult, ruleResult] = await Promise.all([
      supabase
        .from('executions')
        .select('id, monto, tx_hash, status, executed_at, rules(moneda, frecuencia, raw_text)')
        .eq('destinatario_nombre', nombre)
        .order('executed_at', { ascending: false })
        .limit(20),
      supabase
        .from('rules')
        .select('id, raw_text, monto_por_persona, moneda, frecuencia, dia_de_pago, status, destinatarios')
        .contains('destinatarios', JSON.stringify([{ nombre }]))
    ]);

    if (exResult.data) setExecutions(exResult.data as unknown as Execution[]);

    if (ruleResult.data) setRules(ruleResult.data as Rule[]);

    setLoading(false);
  }

  const totalRecibido = executions
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + Number(e.monto), 0);

  const DAY_LABELS: Record<string, string> = {
    'viernes': 'Viernes', 'lunes': 'Lunes', 'martes': 'Martes',
    'miércoles': 'Miércoles', 'jueves': 'Jueves',
    'friday': 'Viernes', 'monday': 'Lunes',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header del empleado */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--gradient-blue)' }}>
            <span className="text-white text-xs font-bold">
              {user?.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Hola, {user?.nombre} 👋</p>
            <p className="text-xs text-muted-foreground">FlowPay AI · Empleado</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/40"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      <main className="flex-1 px-4 md:px-6 py-6">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="fp-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Mi saldo</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {balance !== null ? `${balance.toFixed(4)} SOL` : '—'}
              </p>
              {user?.wallet && (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                </p>
              )}
            </div>

            <div className="fp-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-muted-foreground">Total recibido</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {totalRecibido} <span className="text-sm">USDC</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {executions.filter(e => e.status === 'completed').length} pagos
              </p>
            </div>
          </div>

          {/* Reglas activas */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Mis pagos programados
            </h2>
            {loading ? (
              <div className="fp-card p-6 flex items-center gap-3">
                <div className="fp-spinner" />
                <span className="text-muted-foreground text-sm">Cargando...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="fp-card p-6 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Sin pagos programados todavía</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="fp-card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-foreground font-semibold">
                        {rule.monto_por_persona} {rule.moneda || 'USDC'}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {rule.frecuencia} · {DAY_LABELS[rule.dia_de_pago] || rule.dia_de_pago || 'fecha variable'}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      rule.status === 'active'
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {rule.status === 'active' ? '● Activa' : '○ Pausada'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de pagos recibidos */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Últimos pagos recibidos
            </h2>
            {executions.length === 0 && !loading ? (
              <div className="fp-card p-6 text-center">
                <p className="text-muted-foreground text-sm">Sin pagos recibidos todavía</p>
              </div>
            ) : (
              <div className="space-y-2">
                {executions.map(ex => (
                  <div key={ex.id} className="fp-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-400 font-bold">
                        +{ex.monto} {ex.rules?.moneda || 'USDC'}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        ex.status === 'completed'
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-destructive/15 text-destructive'
                      }`}>
                        {ex.status === 'completed' ? '✓ Recibido' : '✗ Error'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(ex.executed_at).toLocaleDateString('es', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      {ex.tx_hash && (
                        <a
                          href={`https://explorer.solana.com/tx/${ex.tx_hash}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {truncateHash(ex.tx_hash)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground/40 pb-4">
            Red: Solana Devnet · FlowPay AI
          </p>
        </div>
      </main>
    </div>
  );
}
