import React, { useEffect, useState } from 'react';
import { ExternalLink, Wallet, CheckCircle2, Clock, LogOut, KeyRound, X, Eye, EyeOff, CreditCard, AlertCircle, Building2 } from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hashPassword } from '@/lib/crypto';

const BANKS = [
  'Banco Pichincha', 'Banco de Guayaquil', 'Banco del Pacífico', 'Produbanco',
  'Banco Internacional', 'Banco Bolivariano', 'Banco del Austro',
  'Banco Solidario', 'Banco General Rumiñahui', 'BanEcuador', 'Cooperativa JEP',
  'Mutualista Pichincha', 'Otro',
];

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

  const [showClabeModal, setShowClabeModal] = useState(false);
  const [clabeForm, setClabeForm] = useState({ banco: '', clabe: '', clabeConfirm: '' });
  const [clabeError, setClabeError] = useState<string | null>(null);
  const [clabeSuccess, setClabeSuccess] = useState(false);
  const [clabeLoading, setClabeLoading] = useState(false);
  const [currentClabe, setCurrentClabe] = useState<string | null>(user?.clabe ?? null);

  const [showRetiroModal, setShowRetiroModal] = useState(false);
  const [retiroStep, setRetiroStep] = useState<'amount' | 'confirm' | 'processing' | 'done'>('amount');
  const [retiroAmount, setRetiroAmount] = useState('');
  const [retiroError, setRetiroError] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState(148);

  useEffect(() => {
    if (!user) return;
    fetchData();
    if (user.wallet) fetchBalance(user.wallet);
    fetchSolPrice();
  }, [user]);

  async function fetchSolPrice() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await res.json();
      if (data?.solana?.usd) setSolPrice(data.solana.usd);
    } catch { /* usa fallback 148 */ }
  }

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

  async function handleSaveClabe(e: React.FormEvent) {
    e.preventDefault();
    setClabeError(null);
    if (!clabeForm.banco) { setClabeError('Selecciona tu banco'); return; }
    if (!/^\d{10}$/.test(clabeForm.clabe)) { setClabeError('El número de cuenta debe tener exactamente 10 dígitos'); return; }
    if (clabeForm.clabe !== clabeForm.clabeConfirm) { setClabeError('Los números de cuenta no coinciden'); return; }
    setClabeLoading(true);
    await supabase.from('employees').update({ clabe: clabeForm.clabe }).eq('id', user!.id);
    setCurrentClabe(clabeForm.clabe);
    setClabeSuccess(true);
    setClabeLoading(false);
    setTimeout(() => { setShowClabeModal(false); setClabeSuccess(false); setClabeForm({ banco: '', clabe: '', clabeConfirm: '' }); }, 1800);
  }

  async function handleRetiroConfirm() {
    setRetiroStep('processing');
    await new Promise(r => setTimeout(r, 3000));
    setRetiroStep('done');
  }

  function openRetiro() {
    setRetiroStep('amount');
    setRetiroAmount('');
    setRetiroError(null);
    setShowRetiroModal(true);
  }

  const retiroUSD = retiroAmount ? (parseFloat(retiroAmount) * solPrice * 0.985).toFixed(2) : '0.00';

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

      {/* Modal cuenta bancaria */}
      {showClabeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {currentClabe ? 'Editar cuenta bancaria' : 'Agregar cuenta bancaria'}
                </h2>
              </div>
              <button onClick={() => setShowClabeModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {clabeSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-foreground font-semibold">Cuenta guardada</p>
                <p className="text-muted-foreground text-sm mt-1">Ya puedes recibir pagos en tu banco</p>
              </div>
            ) : (
              <form onSubmit={handleSaveClabe} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Banco</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={clabeForm.banco}
                      onChange={e => setClabeForm(f => ({ ...f, banco: e.target.value }))}
                      className="fp-input w-full pl-10 pr-4 py-3 text-sm bg-card"
                    >
                      <option value="">Selecciona tu banco…</option>
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Número de cuenta</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={clabeForm.clabe}
                      onChange={e => setClabeForm(f => ({ ...f, clabe: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="Número de cuenta (10 dígitos)"
                      inputMode="numeric"
                      className="fp-input w-full pl-10 pr-4 py-3 text-sm font-mono tracking-widest"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-1">{clabeForm.clabe.length}/10</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Confirmar número de cuenta</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={clabeForm.clabeConfirm}
                      onChange={e => setClabeForm(f => ({ ...f, clabeConfirm: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="Repite el número de cuenta"
                      inputMode="numeric"
                      className={`fp-input w-full pl-10 pr-10 py-3 text-sm font-mono tracking-widest ${
                        clabeForm.clabeConfirm.length === 10
                          ? clabeForm.clabeConfirm === clabeForm.clabe ? 'border-green-500/50' : 'border-destructive/50'
                          : ''
                      }`}
                    />
                    {clabeForm.clabeConfirm.length === 10 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {clabeForm.clabeConfirm === clabeForm.clabe
                          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                          : <AlertCircle className="w-4 h-4 text-destructive" />}
                      </span>
                    )}
                  </div>
                  {clabeForm.clabeConfirm.length === 10 && clabeForm.clabeConfirm === clabeForm.clabe && (
                    <p className="text-xs text-green-400 mt-1">✓ Los números de cuenta coinciden</p>
                  )}
                </div>

                {clabeError && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />{clabeError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowClabeModal(false)} className="fp-btn-secondary flex-1 py-3 text-sm">Cancelar</button>
                  <button type="submit" disabled={clabeLoading} className="fp-btn-primary flex-[2] py-3 text-sm">
                    {clabeLoading
                      ? <div className="flex items-center justify-center gap-2"><div className="fp-spinner" /><span>Guardando...</span></div>
                      : 'Guardar cuenta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal retiro */}
      {showRetiroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-md p-6">

            {retiroStep === 'done' ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-foreground mb-1">¡Retiro en camino!</h2>
                <p className="text-muted-foreground text-sm mb-1">
                  <span className="text-foreground font-semibold">{retiroAmount} SOL</span> → <span className="text-green-400 font-bold">${retiroUSD} USD</span>
                </p>
                <p className="text-xs text-muted-foreground mb-6">A tu cuenta en 1–2 días hábiles</p>
                <button onClick={() => setShowRetiroModal(false)} className="fp-btn-primary w-full py-3 text-sm">Cerrar</button>
              </div>

            ) : retiroStep === 'processing' ? (
              <div className="text-center py-8 space-y-4">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <p className="text-foreground font-semibold">Procesando retiro...</p>
                <p className="text-muted-foreground text-sm">{retiroAmount} SOL → ${retiroUSD} USD</p>
              </div>

            ) : retiroStep === 'confirm' ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-foreground">Confirmar retiro</h2>
                  <button onClick={() => setShowRetiroModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                </div>
                <div className="fp-card p-4 space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envías</span>
                    <span className="text-foreground font-bold">{retiroAmount} SOL</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor bruto</span>
                    <span className="text-foreground">${(parseFloat(retiroAmount) * solPrice).toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Comisión (1.5%)</span>
                    <span className="text-foreground">−${(parseFloat(retiroAmount) * solPrice * 0.015).toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
                    <span className="text-foreground">Recibirás</span>
                    <span className="text-green-400 text-base">${retiroUSD} USD</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                    <span className="text-muted-foreground">Destino</span>
                    <span className="text-foreground font-mono">****{currentClabe?.slice(-4)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setRetiroStep('amount')} className="fp-btn-secondary flex-1 py-3 text-sm">← Atrás</button>
                  <button onClick={handleRetiroConfirm} className="fp-btn-primary flex-[2] py-3 text-sm">Confirmar retiro ✓</button>
                </div>
              </>

            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Retirar a mi cuenta</h2>
                  </div>
                  <button onClick={() => setShowRetiroModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                </div>

                {!currentClabe ? (
                  <div className="text-center py-6">
                    <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-foreground font-semibold mb-1">Sin cuenta bancaria registrada</p>
                    <p className="text-muted-foreground text-sm mb-5">Primero agrega tu número de cuenta para poder retirar</p>
                    <button onClick={() => { setShowRetiroModal(false); setShowClabeModal(true); }}
                      className="fp-btn-primary w-full py-3 text-sm">
                      Agregar cuenta bancaria →
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="fp-card p-3 mb-5 flex items-center gap-3 border border-purple-500/20 bg-purple-500/5">
                      <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Cuenta destino</p>
                        <p className="text-sm font-mono font-semibold text-foreground">****{currentClabe.slice(-4)}</p>
                      </div>
                    </div>

                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                      ¿Cuánto SOL quieres retirar?
                    </label>
                    <div className="relative mb-1">
                      <input
                        type="number"
                        value={retiroAmount}
                        onChange={e => { setRetiroAmount(e.target.value); setRetiroError(null); }}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        className="fp-input w-full px-4 py-3 text-2xl font-bold text-center"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">SOL</span>
                    </div>
                    {retiroAmount && parseFloat(retiroAmount) > 0 && (
                      <p className="text-center text-sm text-green-400 font-semibold mb-4">
                        ≈ ${retiroUSD} USD neto
                      </p>
                    )}
                    <div className={`text-xs text-center mb-4 px-3 py-2 rounded-lg ${
                      retiroAmount && parseFloat(retiroAmount) > (balance ?? 0)
                        ? 'bg-destructive/10 text-destructive font-semibold'
                        : 'text-muted-foreground'
                    }`}>
                      Saldo disponible:{' '}
                      <span className="font-mono font-semibold">
                        {balance !== null ? `${balance.toFixed(4)} SOL` : 'cargando...'}
                      </span>
                    </div>

                    {retiroError && <p className="text-sm text-destructive mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{retiroError}</p>}

                    <div className="flex gap-3">
                      <button onClick={() => setShowRetiroModal(false)} className="fp-btn-secondary flex-1 py-3 text-sm">Cancelar</button>
                      <button
                        onClick={() => {
                          const amt = parseFloat(retiroAmount);
                          if (!retiroAmount || isNaN(amt) || amt <= 0) { setRetiroError('Ingresa un monto válido'); return; }
                          if (balance === null) { setRetiroError('No se pudo leer tu saldo. Recarga la página e intenta de nuevo.'); return; }
                          if (amt > balance) {
                            setRetiroError(`Saldo insuficiente. Solo tienes ${balance.toFixed(4)} SOL disponibles.`);
                            return;
                          }
                          setRetiroStep('confirm');
                        }}
                        className="fp-btn-primary flex-[2] py-3 text-sm"
                      >
                        Continuar →
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 px-4 md:px-6 py-6">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="fp-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Mi saldo</span>
                </div>
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
                <span className="text-xs text-muted-foreground">Recibido vía FlowPay</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {totalRecibido.toFixed(4)} <span className="text-sm">SOL</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {executions.filter(e => e.status === 'completed').length} pagos
              </p>
            </div>
          </div>

          {/* Cuenta bancaria */}
          <div className="fp-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Cuenta bancaria</p>
                  {currentClabe ? (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">****{currentClabe.slice(-4)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Sin cuenta registrada</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setShowClabeModal(true); setClabeError(null); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-all font-medium"
              >
                {currentClabe ? 'Editar' : '+ Agregar'}
              </button>
            </div>
            {currentClabe ? (
              <button
                onClick={openRetiro}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: 'var(--gradient-blue)', color: 'white' }}
              >
                <CreditCard className="w-4 h-4" />
                Retirar a mi cuenta bancaria
              </button>
            ) : (
              <button
                onClick={() => { setShowClabeModal(true); setClabeError(null); }}
                className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/30 text-sm text-purple-400 hover:bg-purple-500/5 transition-all"
              >
                + Registrar cuenta para poder retirar
              </button>
            )}
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
