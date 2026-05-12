import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, CheckCircle2, Clock, XCircle, ExternalLink, Link2 } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

interface Invoice {
  id: string;
  invoice_id: string;
  cliente: string;
  monto: number;
  moneda_factura: string;
  moneda_pago: string;
  descripcion: string;
  status: 'pendiente' | 'pagada' | 'cancelada';
  tx_hash: string | null;
  created_at: string;
}

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-500/15 text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  pagada:    { label: 'Pagada',    color: 'bg-green-500/15 text-green-400',  icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelada: { label: 'Cancelada', color: 'bg-destructive/15 text-destructive', icon: <XCircle className="w-3 h-3" /> },
};

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [copied,   setCopied]   = useState<string | null>(null);

  function copyPayLink(invoiceId: string) {
    const url = `${window.location.origin}/pay/${invoiceId}`;
    navigator.clipboard.writeText(url);
    setCopied(invoiceId);
    setTimeout(() => setCopied(null), 2000);
  }

  useEffect(() => { fetchInvoices(); }, []);

  async function fetchInvoices() {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as Invoice[]);
    setLoading(false);
  }

  async function markAsPaid(id: string) {
    setUpdating(id);
    await supabase.from('invoices').update({ status: 'pagada' }).eq('id', id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'pagada' } : inv));
    setUpdating(null);
  }

  async function markAsCancelled(id: string) {
    setUpdating(id);
    await supabase.from('invoices').update({ status: 'cancelada' }).eq('id', id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'cancelada' } : inv));
    setUpdating(null);
  }

  const [solPrice, setSolPrice] = useState(148);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setSolPrice(d?.solana?.usd ?? 148))
      .catch(() => {});
  }, []);

  const toUSD = (monto: number, moneda: string) =>
    moneda === 'SOL' ? monto * solPrice : monto;

  const totalPendiente = invoices
    .filter(i => i.status === 'pendiente')
    .reduce((s, i) => s + toUSD(Number(i.monto), i.moneda_factura), 0);
  const totalPagado = invoices
    .filter(i => i.status === 'pagada')
    .reduce((s, i) => s + toUSD(Number(i.monto), i.moneda_factura), 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 md:py-10">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Facturas</h1>
              <p className="text-muted-foreground text-sm mt-1">{invoices.length} facturas registradas</p>
            </div>
            <button onClick={() => navigate('/')}
              className="fp-btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva factura</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="fp-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Total facturas</p>
              <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
            </div>
            <div className="fp-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-400">{invoices.filter(i => i.status === 'pendiente').length}</p>
            </div>
            <div className="fp-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Por cobrar</p>
              <p className="text-2xl font-bold text-yellow-400">{totalPendiente.toLocaleString()} <span className="text-sm">USD</span></p>
            </div>
            <div className="fp-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Cobrado</p>
              <p className="text-2xl font-bold text-green-400">{totalPagado.toLocaleString()} <span className="text-sm">USD</span></p>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="fp-spinner mr-3" />
              <span className="text-muted-foreground">Cargando facturas...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="fp-card p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-foreground font-semibold mb-2">Sin facturas todavía</p>
              <p className="text-muted-foreground text-sm mb-6">
                Escribe algo como "Genera factura de $1000 a cliente XYZ"
              </p>
              <button onClick={() => navigate('/')} className="fp-btn-primary py-2.5 px-6 text-sm">
                Crear primera factura
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(inv => {
                const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pendiente;
                return (
                  <div key={inv.id} className="fp-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-primary font-bold">{inv.invoice_id}</span>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </div>
                        <p className="text-foreground font-semibold text-lg">{inv.cliente}</p>
                        {inv.descripcion && (
                          <p className="text-muted-foreground text-sm mt-0.5 truncate">{inv.descripcion}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(inv.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-foreground">
                          {Number(inv.monto).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">{inv.moneda_factura}</p>
                        <p className="text-xs text-muted-foreground">cobra en {inv.moneda_pago}</p>
                      </div>
                    </div>

                    {/* TX hash para facturas pagadas */}
                    {inv.status === 'pagada' && inv.tx_hash && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">Prueba de pago on-chain</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-[10px] text-primary truncate flex-1">{inv.tx_hash}</p>
                          <a
                            href={`https://explorer.solana.com/tx/${inv.tx_hash}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-primary hover:text-primary/70 transition-colors"
                            title="Ver en Solana Explorer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {inv.status === 'pendiente' && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                        <button
                          onClick={() => copyPayLink(inv.invoice_id)}
                          className="fp-btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                        >
                          {copied === inv.invoice_id
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Link copiado!</>
                            : <><Link2 className="w-3.5 h-3.5" /> Copiar link de pago</>}
                        </button>
                        <button
                          onClick={() => markAsCancelled(inv.id)}
                          disabled={updating === inv.id}
                          className="fp-btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
