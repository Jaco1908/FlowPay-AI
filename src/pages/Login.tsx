import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (lockout > 0) {
      timerRef.current = setInterval(() => {
        setLockout(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setAttempts(0);
            setError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lockout]);

  if (user) {
    navigate(user.role === 'admin' ? '/' : '/employee', { replace: true });
    return null;
  }

  const isLocked = lockout > 0;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || isLocked) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      const stored = localStorage.getItem('flowpay_user');
      if (stored) {
        const u = JSON.parse(stored);
        navigate(u.role === 'admin' ? '/' : '/employee', { replace: true });
      }
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockout(LOCKOUT_SECONDS);
        setError(`Demasiados intentos. Espera ${LOCKOUT_SECONDS} segundos.`);
      } else {
        setError(`Credenciales incorrectas. Intentos restantes: ${MAX_ATTEMPTS - newAttempts}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }} />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'var(--gradient-blue)' }}>
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">FlowPay AI</h1>
          <p className="text-muted-foreground text-sm mt-1">Inicia sesión para continuar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="fp-card p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                className="fp-input w-full pl-10 pr-4 py-3 text-sm"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="fp-input w-full pl-10 pr-4 py-3 text-sm"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || isLocked}
            className="fp-btn-primary w-full py-3 text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="fp-spinner" />
                <span>Entrando...</span>
              </div>
            ) : isLocked ? (
              `Bloqueado — espera ${lockout}s`
            ) : 'Entrar →'}
          </button>
        </form>

        {/* Demo hint */}
        <div className="mt-4 fp-card p-4 space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
            Accesos de demo
          </p>
          <button
            onClick={() => { setEmail('admin@flowpay.com'); setPassword('admin123'); }}
            className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <span className="text-primary font-semibold">Admin:</span>
            <span className="text-muted-foreground ml-2">admin@flowpay.com / admin123</span>
          </button>
          <p className="text-xs text-muted-foreground/50 text-center pt-1">
            Los empleados usan el correo que el admin les asigna
          </p>
        </div>
      </div>
    </div>
  );
}
