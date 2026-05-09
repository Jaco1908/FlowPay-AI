import React, { useEffect, useState } from 'react';
import { ExternalLink, Wallet, CheckCircle2, Clock, LogOut, KeyRound, X, Eye, EyeOff } from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hashPassword } from '@/lib/crypto';

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

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

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
    ]);

    if (exResult.data) setExecutions(exResult.data as unknown as Execution[]);

    if (ruleResult.data) {
      const filtered = ruleResult.data.filter((r: any) =>
        Array.isArray(r.destinatarios) &&
        r.destinatarios.some((d: any) => d.nombre?.toLowerCase() === nombre)
      );
      setRules(filtered as Rule[]);
    }

    setLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (pwForm.next.length < 6) {
      setPwError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Las contraseñas no coinciden.');
      return;
    }
    setPwLoading(true);
    const hashedCurrent = await hashPassword(pwForm.current, user!.email.toLowerCase());
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('id', user!.id)
      .eq('password', hashedCurrent)
      .single();
    if (!data) {
      setPwError('La contraseña actual es incorrecta.');
      setPwLoading(false);
      return;
    }
    const hashedNew = await hashPassword(pwForm.next, user!.email.toLowerCase());
    await supabase.from('employees').update({ password: hashedNew }).eq('id', user!.id);
    setPwSuccess(true);
    setPwLoading(false);
    setPwForm({ current: '', next: '', confirm: '' });
    setTimeout(() => { setShowChangePassword(false); setPwSuccess(false); }, 2000);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowChangePassword(true); setPwError(null); setPwSuccess(false); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/40"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline">Cambiar contraseña</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/40"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Modal cambiar contraseña */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Cambiar contraseña</h2>
              </div>
              <button onClick={() => setShowChangePassword(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-foreground font-semibold">Contraseña actualizada</p>
                <p className="text-muted-foreground text-sm mt-1">Usa tu nueva contraseña la próxima vez</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                    Contraseña actual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={pwForm.current}
                      onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                      placeholder="••••••••"
                      className="fp-input w-full pl-4 pr-10 py-3 text-sm"
                      required
                    />
                    <button type="button" onClick={() => setShowCurrent(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNext ? 'text' : 'password'}
                      value={pwForm.next}
                      onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="fp-input w-full pl-4 pr-10 py-3 text-sm"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowNext(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repite la nueva contraseña"
                    className={`fp-input w-full px-4 py-3 text-sm ${
                      pwForm.confirm && pwForm.confirm !== pwForm.next ? 'border-destructive' : ''
                    }`}
                    required
                  />
                  {pwForm.confirm && pwForm.confirm !== pwForm.next && (
                    <p className="text-xs text-destructive mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                {pwError && <p className="text-sm text-destructive">{pwError}</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowChangePassword(false)}
                    className="fp-btn-secondary flex-1 py-3 text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={pwLoading}
                    className="fp-btn-primary flex-[2] py-3 text-sm">
                    {pwLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="fp-spinner" /><span>Guardando...</span>
                      </div>
                    ) : 'Actualizar contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
                {totalRecibido.toFixed(4)} <span className="text-sm">SOL</span>
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
                        {rule.monto_por_persona} {rule.moneda || 'SOL'}
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
                        +{Number(ex.monto).toFixed(4)} {ex.rules?.moneda || 'SOL'}
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
