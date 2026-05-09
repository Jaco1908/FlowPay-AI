import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Copy, Check, Clock, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

interface HistoryRow {
  id: string;
  destinatario_nombre: string;
  destinatario_wallet: string;
  monto: number;
  tx_hash: string;
  status: string;
  executed_at: string;
  rules: {
    raw_text: string;
    moneda: string;
    frecuencia: string;
  };
}

const truncateHash = (hash: string) => {
  if (!hash || hash.length < 20) return hash;
  return `${hash.slice(0, 16)}...${hash.slice(-8)}`;
};

const truncateWallet = (wallet: string) => {
  if (!wallet || wallet.length < 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

const History = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data, error } = await supabase
        .from('executions')
        .select(`
          id,
          destinatario_nombre,
          destinatario_wallet,
          monto,
          tx_hash,
          status,
          executed_at,
          rules ( raw_text, moneda, frecuencia )
        `)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (!error && data) setRows(data as unknown as HistoryRow[]);
      setLoading(false);
    }
    fetchHistory();
  }, []);

  const totalUsdc = rows
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + Number(r.monto), 0);

  const successCount = rows.filter(r => r.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 px-4 md:px-6 py-6 md:py-10">
        <div className="max-w-5xl mx-auto">

          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">Historial de pagos</h1>
            <p className="text-muted-foreground">Todas las transacciones ejecutadas en Solana Devnet</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
            <div className="fp-card p-5 text-center">
              <p className="text-3xl font-bold text-foreground">{rows.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Transacciones totales</p>
            </div>
            <div className="fp-card p-5 text-center">
              <p className="text-3xl font-bold text-green-400">{successCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Confirmadas</p>
            </div>
            <div className="fp-card p-5 text-center">
              <p className="text-3xl font-bold text-primary">{totalUsdc.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground mt-1">USDC enviados</p>
            </div>
          </div>

          {/* Table */}
          <div className="fp-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="fp-spinner mr-3" />
                <span className="text-muted-foreground">Cargando historial...</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No hay transacciones todavía</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 text-primary text-sm hover:underline"
                >
                  Crear el primer pago
                </button>
              </div>
            ) : (
              <>
                {/* Tabla — solo en desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destinatario</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monto</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hash</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-foreground font-medium capitalize">{row.destinatario_nombre}</p>
                              {row.destinatario_wallet && (
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                  {truncateWallet(row.destinatario_wallet)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-green-400 font-semibold">
                              {row.monto} {row.rules?.moneda || 'USDC'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {row.status === 'completed' ? (
                              <span className="fp-badge-success text-xs px-2.5 py-1 rounded-full font-medium">✓ Confirmado</span>
                            ) : (
                              <span className="fp-badge-error text-xs px-2.5 py-1 rounded-full font-medium">✗ Error</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {row.tx_hash ? (
                              <div className="flex items-center">
                                <code className="text-xs font-mono text-muted-foreground">{truncateHash(row.tx_hash)}</code>
                                <CopyButton text={row.tx_hash} />
                              </div>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs text-muted-foreground">
                              {new Date(row.executed_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {row.tx_hash ? (
                              <a href={`https://explorer.solana.com/tx/${row.tx_hash}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                Ver <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards — solo en móvil */}
                <div className="md:hidden divide-y divide-border">
                  {rows.map((row) => (
                    <div key={row.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-semibold capitalize">{row.destinatario_nombre}</p>
                          <p className="text-green-400 font-bold">{row.monto} {row.rules?.moneda || 'USDC'}</p>
                        </div>
                        {row.status === 'completed' ? (
                          <span className="fp-badge-success text-xs px-2.5 py-1 rounded-full font-medium">✓ Confirmado</span>
                        ) : (
                          <span className="fp-badge-error text-xs px-2.5 py-1 rounded-full font-medium">✗ Error</span>
                        )}
                      </div>
                      {row.tx_hash && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono text-muted-foreground">{truncateHash(row.tx_hash)}</code>
                            <CopyButton text={row.tx_hash} />
                          </div>
                          <a href={`https://explorer.solana.com/tx/${row.tx_hash}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            Explorer <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(row.executed_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground/40 mt-6">
            Red: Solana Devnet · Datos en tiempo real desde Supabase
          </p>
        </div>
      </main>
    </div>
  );
};

export default History;
