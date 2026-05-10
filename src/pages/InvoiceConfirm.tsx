import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import type { ParsedRule } from '@/types';

const MONEDAS = ['USD', 'SOL'] as const;

export default function InvoiceConfirm() {
  const navigate  = useNavigate();
  const [rule, setRule]       = useState<ParsedRule | null>(null);
  const [saving, setSaving]   = useState(false);
  const [savedId, setSavedId] = useState('');

  const [cliente,       setCliente]       = useState('');
  const [monto,         setMonto]         = useState('');
  const [descripcion,   setDescripcion]   = useState('');
  const [monedaFactura, setMonedaFactura] = useState('USD');

  const [missingMonto, setMissingMonto] = useState(false);

  const [invoiceId] = useState(() => `INV-${Date.now().toString(36).toUpperCase()}`);
  const previewDate  = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

  useEffect(() => {
    const stored = sessionStorage.getItem('parsedRule');
    if (!stored) { navigate('/'); return; }
    try {
      const parsed = JSON.parse(stored) as ParsedRule;
      setRule(parsed);
      setCliente(parsed.cliente || '');
      const m = parsed.monto_factura ?? null;
      if (m && m > 0) {
        setMonto(String(m));
      } else {
        setMonto('');
        setMissingMonto(true);
      }
      setDescripcion(parsed.descripcion_factura || '');
      setMonedaFactura(parsed.moneda_factura || 'USD');
    } catch { navigate('/'); }
  }, [navigate]);

  if (!rule) return null;

  const montoNum   = parseFloat(monto) || 0;
  const monedaPago = monedaFactura === 'USD' ? 'SOL' : monedaFactura;
  const canSave    = cliente.trim().length > 0 && montoNum > 0;

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    await supabase.from('invoices').insert({
      invoice_id:     invoiceId,
      cliente:        cliente.trim(),
      monto:          montoNum,
      moneda_factura: monedaFactura,
      moneda_pago:    monedaPago,
      descripcion:    descripcion.trim() || 'Servicios profesionales',
      status:         'pendiente',
      raw_text:       rule.textoOriginal,
    });
    setSavedId(invoiceId);
    setSaving(false);
  }

  /* ── Success ── */
  if (savedId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center animate-fade-in space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Factura registrada</h1>
              <p className="text-muted-foreground text-sm mt-1">
                <span className="text-primary font-mono">{invoiceId}</span> · pendiente de pago
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/invoices')} className="fp-btn-secondary flex-1 py-2.5 text-sm">
                Ver facturas
              </button>
              <button onClick={() => navigate('/')} className="fp-btn-primary flex-1 py-2.5 text-sm">
                Nuevo →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── Main ── */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-4xl animate-fade-in">

          <h1 className="text-2xl font-bold text-foreground mb-1">Nueva factura</h1>
          <p className="text-muted-foreground text-sm mb-10">Revisa o corrige los datos antes de guardar.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

            {/* ── Form ── */}
            <div className="space-y-6">

              {missingMonto && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
                  <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-400">
                    No detecté el monto en tu instrucción. Ingresa el monto manualmente antes de guardar.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Cliente <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={e => setCliente(e.target.value)}
                  placeholder="Nombre de la empresa o persona"
                  className="fp-input w-full px-4 py-3 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Monto <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={monto}
                    onChange={e => { setMonto(e.target.value); setMissingMonto(false); }}
                    placeholder="0.00"
                    className={`fp-input flex-1 px-4 py-3 text-sm ${missingMonto ? 'border-yellow-500/60 focus:border-yellow-400' : ''}`}
                  />
                  <select
                    value={monedaFactura}
                    onChange={e => setMonedaFactura(e.target.value)}
                    className="fp-input px-3 py-3 text-sm font-medium cursor-pointer"
                  >
                    {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1.5">
                  El cliente pagará en <span className="text-foreground/70">{monedaPago}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Descripción <span className="text-muted-foreground/40 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Ej. Servicios de desarrollo web — Mayo 2026"
                  className="fp-input w-full px-4 py-3 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => navigate('/')}
                  className="fp-btn-secondary flex-1 py-3 text-sm"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !canSave}
                  className="fp-btn-green flex-[2] py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving
                    ? <span className="flex items-center justify-center gap-2"><span className="fp-spinner" />Guardando...</span>
                    : 'Crear factura ✓'
                  }
                </button>
              </div>

            </div>

            {/* ── Receipt preview ── */}
            <div className="hidden md:block">
              <p className="text-xs text-muted-foreground/50 mb-4 uppercase tracking-widest">Vista previa</p>
              <div className="bg-white rounded-2xl p-8 text-gray-800 shadow-xl">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' }}>
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">FlowPay AI</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Factura</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">#{invoiceId}</p>
                  </div>
                </div>

                {/* Client + date */}
                <div className="mb-7">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Para</p>
                  <p className={`text-lg font-bold ${cliente ? 'text-gray-900' : 'text-gray-300'}`}>
                    {cliente || 'Sin especificar'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{previewDate}</p>
                </div>

                {/* Service row */}
                <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-6">
                  <div className="flex justify-between items-center gap-4">
                    <p className={`text-sm flex-1 min-w-0 truncate ${descripcion ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                      {descripcion || 'Servicios profesionales'}
                    </p>
                    <p className={`text-sm font-bold shrink-0 ${montoNum > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                      {montoNum > 0 ? `${monto} ${monedaFactura}` : '—'}
                    </p>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-baseline border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total</p>
                  <p className={`text-2xl font-black ${montoNum > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    {montoNum > 0 ? `${monto} ${monedaFactura}` : '—'}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                  Pago en {monedaPago}
                </p>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
