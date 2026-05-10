import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Copy, ExternalLink, Loader2, QrCode, Zap, Send } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

const EMPRESA_WALLET = import.meta.env.VITE_EMPRESA_WALLET_ADDRESS ?? '';
const SOL_PRICE_FBK  = 148;
const POLL_MS        = 5000;
const TOLERANCE_SOL  = 0.01;

interface Invoice {
  id: string;
  invoice_id: string;
  cliente: string;
  monto: number;
  moneda_factura: string;
  descripcion: string;
  status: 'pendiente' | 'pagada' | 'cancelada';
  tx_hash: string | null;
  created_at: string;
}

export default function PayInvoice() {
  const { invoiceId } = useParams<{ invoiceId: string }>();

  const [invoice,  setInvoice]  = useState<Invoice | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [solPrice, setSolPrice] = useState(SOL_PRICE_FBK);
  const [copied,      setCopied]      = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [txHash,   setTxHash]   = useState<string | null>(null);
  const [paid,     setPaid]     = useState(false);
  const [polling,  setPolling]  = useState(false);

  /* Refs para evitar stale closures en el interval */
  const invoiceRef  = useRef<Invoice | null>(null);
  const solPriceRef = useRef(SOL_PRICE_FBK);
  const timer       = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { invoiceRef.current  = invoice;  }, [invoice]);
  useEffect(() => { solPriceRef.current = solPrice; }, [solPrice]);

  /* ── Cargar factura ── */
  useEffect(() => {
    if (!invoiceId) return;
    supabase
      .from('invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setInvoice(data as Invoice);
          if (data.status === 'pagada') { setPaid(true); setTxHash(data.tx_hash); }
        }
        setLoading(false);
      });
  }, [invoiceId]);

  /* ── Precio SOL ── */
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setSolPrice(d?.solana?.usd ?? SOL_PRICE_FBK))
      .catch(() => {});
  }, []);

  /* ── Iniciar polling cuando la factura está pendiente ── */
  useEffect(() => {
    if (!invoice || invoice.status !== 'pendiente' || paid || !EMPRESA_WALLET) return;
    startPolling();
    return stopPolling;
  }, [invoice, paid]);

  /* Calcula el monto en SOL usando los refs (sin stale closure) */
  function getSolAmount(): number {
    const inv = invoiceRef.current;
    if (!inv) return 0;
    return inv.moneda_factura === 'SOL'
      ? Number(inv.monto)
      : Number(inv.monto) / solPriceRef.current;
  }

  /*
   * Detección basada en balance: compara el saldo inicial con el actual.
   * Mucho más simple que parsear instrucciones y no depende del tipo de TX.
   */
  async function startPolling() {
    setPolling(true);
    try {
      const conn   = new Connection('https://api.devnet.solana.com', 'confirmed');
      const pubkey = new PublicKey(EMPRESA_WALLET);

      const initialBalance = await conn.getBalance(pubkey);

      timer.current = setInterval(async () => {
        try {
          const currentBalance = await conn.getBalance(pubkey);
          const increaseSol    = (currentBalance - initialBalance) / 1e9;
          const expectedSol    = getSolAmount();

          if (increaseSol > 0 && increaseSol >= expectedSol - TOLERANCE_SOL) {
            /* Pago detectado — tomar la última TX como prueba */
            const sigs = await conn.getSignaturesForAddress(pubkey, { limit: 1 });
            const hash = sigs[0]?.signature ?? 'devnet-payment-detected';
            await confirmPayment(hash);
          }
        } catch { /* reintenta en el siguiente ciclo */ }
      }, POLL_MS);
    } catch {
      setPolling(false);
    }
  }

  function stopPolling() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setPolling(false);
  }

  async function confirmPayment(hash: string) {
    stopPolling();
    await supabase
      .from('invoices')
      .update({ status: 'pagada', tx_hash: hash })
      .eq('invoice_id', invoiceId);
    setTxHash(hash);
    setPaid(true);
  }

  function copyWallet() {
    navigator.clipboard.writeText(EMPRESA_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyAmount() {
    navigator.clipboard.writeText(sol.toFixed(6));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  }

  const sol = invoice
    ? (invoice.moneda_factura === 'SOL' ? Number(invoice.monto) : Number(invoice.monto) / solPrice)
    : 0;

  /*
   * QR codifica la URL de esta página.
   * VITE_APP_URL permite fijar la IP de red para que el teléfono pueda acceder
   * (window.location.origin devuelve "localhost" cuando se accede desde la PC).
   */
  const appBase   = import.meta.env.VITE_APP_URL?.trim().replace(/\/$/, '') || window.location.origin;
  const pageUrl   = `${appBase}/pay/${invoiceId}`;
  const solanaUri = `solana:${EMPRESA_WALLET}?amount=${sol.toFixed(6)}`;
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pageUrl)}&size=200x200&bgcolor=0d1117&color=60a5fa&margin=12`;

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  /* ── Not found ── */
  if (notFound || !invoice) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-bold text-foreground mb-2">Factura no encontrada</h1>
        <p className="text-muted-foreground text-sm">El enlace puede ser incorrecto o la factura fue eliminada.</p>
      </div>
    </div>
  );

  /* ── Paid ── */
  if (paid) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Pago confirmado</h1>
        <p className="text-muted-foreground text-sm mb-6">{invoice.invoice_id} · {invoice.cliente}</p>

        <div className="fp-card p-5 text-left space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monto</span>
            <span className="text-foreground font-bold">
              {Number(invoice.monto).toLocaleString()} {invoice.moneda_factura}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Red</span>
            <span className="text-foreground">Solana Devnet</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estado</span>
            <span className="text-green-400 font-semibold">Pagado on-chain ✓</span>
          </div>
          {txHash && (
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-1.5">TX Hash — prueba inmutable de pago</p>
              <p className="font-mono text-[10px] text-primary break-all mb-2 leading-relaxed">{txHash}</p>
              <a
                href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Verificar en Solana Explorer
              </a>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground/50">
          Esta transacción es permanente e inmutable en la blockchain de Solana.
        </p>
      </div>
    </div>
  );

  /* ── Pending ── */
  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' }}>
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-foreground">FlowPay AI</span>
          <span className="ml-auto font-mono text-xs text-primary font-bold">{invoice.invoice_id}</span>
        </div>

        {/* Resumen factura */}
        <div className="fp-card p-6 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Facturado a</p>
          <p className="text-2xl font-bold text-foreground mb-0.5">{invoice.cliente}</p>
          {invoice.descripcion && (
            <p className="text-muted-foreground text-sm mb-3">{invoice.descripcion}</p>
          )}
          <p className="text-xs text-muted-foreground mb-4">
            {new Date(invoice.created_at).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <div className="border-t border-border/50 pt-4 flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">Total a pagar</span>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-foreground">
                {Number(invoice.monto).toLocaleString()}
                <span className="text-lg ml-1.5">{invoice.moneda_factura}</span>
              </p>
              {invoice.moneda_factura !== 'SOL' && (
                <p className="text-sm text-primary font-semibold">≈ {sol.toFixed(4)} SOL</p>
              )}
            </div>
          </div>
        </div>

        {/* Instrucciones de pago */}
        <div className="fp-card p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <QrCode className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Paga con tu wallet de Solana</p>
          </div>

          {EMPRESA_WALLET ? (
            <>
              {/* QR → URL de esta página */}
              <div className="flex justify-center mb-3">
                <div className="rounded-2xl overflow-hidden border border-border/30 bg-[#0d1117] p-3">
                  <img src={qrUrl} alt="QR página de pago" width={160} height={160} />
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground mb-5">
                Escanea para abrir esta página en tu teléfono
              </p>

              {/* Paso a paso */}
              <div className="space-y-2 mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" /> Cómo pagar desde Phantom
                </p>

                {/* Paso 1 */}
                <div className="bg-muted/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
                    <p className="text-xs font-medium text-foreground">Abre Phantom → toca "Enviar"</p>
                  </div>
                </div>

                {/* Paso 2 — dirección */}
                <div className="bg-muted/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <p className="text-xs font-medium text-foreground">Pega esta dirección</p>
                  </div>
                  <div className="flex items-center gap-2 bg-background/50 rounded-lg px-2 py-1.5">
                    <p className="font-mono text-[10px] text-primary flex-1 break-all leading-relaxed">
                      {EMPRESA_WALLET}
                    </p>
                    <button onClick={copyWallet} className="shrink-0 p-1 rounded hover:bg-muted/20 transition-colors">
                      {copied
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </button>
                  </div>
                </div>

                {/* Paso 3 — monto */}
                <div className="bg-muted/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
                    <p className="text-xs font-medium text-foreground">Escribe exactamente este monto</p>
                  </div>
                  <div className="flex items-center gap-2 bg-background/50 rounded-lg px-2 py-1.5">
                    <p className="font-mono text-sm text-primary font-bold flex-1">
                      {sol.toFixed(6)} SOL
                    </p>
                    <button onClick={copyAmount} className="shrink-0 p-1 rounded hover:bg-muted/20 transition-colors">
                      {copiedAmount
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </button>
                  </div>
                </div>

                {/* Paso 4 */}
                <div className="bg-muted/10 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">4</span>
                    <p className="text-xs font-medium text-foreground">Confirma la transacción en Phantom</p>
                  </div>
                </div>
              </div>

              {/* Estado polling */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {polling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Detectando pago on-chain...</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  </>
                ) : (
                  <span>Iniciando detector de pago...</span>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              Wallet destino no configurada.
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground/40 text-center leading-relaxed">
          El pago se confirma automáticamente al detectar el balance en Solana Devnet.
          No cierres esta ventana hasta que se confirme.
        </p>
      </div>
    </div>
  );
}
