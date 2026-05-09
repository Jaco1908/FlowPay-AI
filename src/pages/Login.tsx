import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle, ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

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

  const [view, setView] = useState<'login' | 'reset' | 'done'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

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

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setResetError('Ingresa un correo electrónico válido.');
      return;
    }
    setResetLoading(true);
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('email', resetEmail.toLowerCase().trim())
      .single();

    if (!data) {
      setResetError('No encontramos una cuenta con ese correo.');
      setResetLoading(false);
      return;
    }

    const temp = generateTempPassword();
    const hashed = await hashPassword(temp, resetEmail.toLowerCase().trim());
    await supabase.from('employees').update({ password: hashed }).eq('id', data.id);
    setTempPassword(temp);
    setView('done');
    setResetLoading(false);
  }

  function copyTemp() {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <p className="text-muted-foreground text-sm mt-1">
            {view === 'login' ? 'Inicia sesión para continuar' : 'Restablecer contraseña'}
          </p>
        </div>

        {/* LOGIN */}
        {view === 'login' && (
          <>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-muted-foreground">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView('reset'); setResetEmail(email); setResetError(null); }}
                    className="text-xs text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
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
          </>
        )}

        {/* RESET FORM */}
        {view === 'reset' && (
          <div className="fp-card p-6 space-y-4">
            <button
              onClick={() => setView('login')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
            </button>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Ingresa tu correo y te generaremos una contraseña temporal para que puedas entrar.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                    className="fp-input w-full pl-10 pr-4 py-3 text-sm"
                    autoFocus
                  />
                </div>
              </div>

              {resetError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading || !resetEmail}
                className="fp-btn-primary w-full py-3 text-sm"
              >
                {resetLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="fp-spinner" /><span>Generando...</span>
                  </div>
                ) : 'Generar contraseña temporal'}
              </button>
            </form>
          </div>
        )}

        {/* DONE */}
        {view === 'done' && (
          <div className="fp-card p-6 space-y-5">
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-foreground font-bold text-lg">Contraseña generada</p>
              <p className="text-muted-foreground text-sm mt-1">
                Usa esta contraseña temporal para entrar. Cámbiala desde tu perfil después.
              </p>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 flex items-center justify-between gap-3">
              <span className="font-mono text-lg font-bold text-foreground tracking-widest">
                {tempPassword}
              </span>
              <button
                onClick={copyTemp}
                className="shrink-0 p-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => { setView('login'); setPassword(''); setError(null); setAttempts(0); }}
              className="fp-btn-primary w-full py-3 text-sm"
            >
              Ir al login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
