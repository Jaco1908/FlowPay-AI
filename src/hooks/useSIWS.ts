import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const SIWS_VERIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/siws-verify`;
const SIWS_NONCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/siws-nonce`;

export interface SIWSSession {
  userId: string;
  publicKey: string;
  role: 'admin' | 'employee';
  nombre: string;
  token: string;
}

function buildSIWSMessage(publicKey: string, nonce: string): string {
  return [
    'FlowPay-AI quiere que inicies sesión con tu cuenta de Solana:',
    publicKey,
    '',
    'Al firmar, aceptas autenticarte en FlowPay-AI.',
    'Esta firma no genera ninguna transacción.',
    '',
    `Nonce: ${nonce}`,
    `Emitido en: ${new Date().toISOString()}`,
    `Dominio: ${window.location.host}`,
  ].join('\n');
}

export function useSIWS() {
  const { publicKey, signMessage, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (): Promise<SIWSSession | null> => {
    if (!connected || !publicKey || !signMessage) {
      setError('Conecta tu wallet Phantom primero.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const nonceRes = await fetch(SIWS_NONCE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: publicKey.toBase58() }),
      });

      if (!nonceRes.ok) throw new Error('No se pudo obtener el nonce del servidor.');
      const { nonce } = await nonceRes.json();

      const message = buildSIWSMessage(publicKey.toBase58(), nonce);
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);

      const signatureB64 = btoa(String.fromCharCode(...signatureBytes));

      const verifyRes = await fetch(SIWS_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: publicKey.toBase58(),
          signature: signatureB64,
          message,
        }),
      });

      if (!verifyRes.ok) {
        const { error: errMsg } = await verifyRes.json();
        throw new Error(errMsg ?? 'Verificación fallida.');
      }

      const session: SIWSSession = await verifyRes.json();

      // Remover el guardado en localStorage aquí, se hará en AuthContext
      // localStorage.setItem('flowpay_user', JSON.stringify({
      //   id: session.userId,
      //   nombre: session.nombre,
      //   wallet: session.publicKey,
      //   role: session.role,
      //   token: session.token,
      // }));

      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al firmar con la wallet.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, signMessage]);

  const clearError = useCallback(() => setError(null), []);

  return { signIn, loading, error, clearError, connected, publicKey };
}
