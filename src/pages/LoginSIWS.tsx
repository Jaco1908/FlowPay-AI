import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, AlertCircle, Wallet } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSIWS } from '@/hooks/useSIWS';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginSIWS() {
  const navigate = useNavigate();
  const { user, loginWithSIWS } = useAuth();
  const { signIn, loading, error, connected } = useSIWS();

  if (user) {
    navigate(user.role === 'admin' ? '/' : '/employee', { replace: true });
    return null;
  }

  async function handleSignIn() {
    const session = await signIn();
    if (session) {
      await loginWithSIWS(session.userId);
      navigate(session.role === 'admin' ? '/' : '/employee', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'var(--gradient-blue)' }}
          >
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">FlowPay AI</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conecta tu wallet para continuar
          </p>
        </div>

        <div className="fp-card p-6 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Paso 1 — Conecta tu wallet
            </p>
            <WalletMultiButton className="!w-full !justify-center !rounded-xl !py-3 !text-sm !font-medium" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Paso 2 — Firma el mensaje
            </p>
            <button
              onClick={handleSignIn}
              disabled={!connected || loading}
              className="fp-btn-primary w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="fp-spinner" />
                  <span>Verificando firma...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Wallet className="w-4 h-4" />
                  <span>Sign In With Solana</span>
                </div>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground/60 text-center leading-relaxed">
            Solo firmas un mensaje fuera de la blockchain.
            No se autoriza ninguna transacción ni se cobran fees.
          </p>
        </div>
      </div>
    </div>
  );
}
