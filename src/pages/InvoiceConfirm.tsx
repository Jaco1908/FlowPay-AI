import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, Building2, Coins, AlignLeft, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import type { ParsedRule } from '@/types';

export default function InvoiceConfirm() {
  const navigate = useNavigate();
  const [rule, setRule] = useState<ParsedRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('parsedRule');
    if (!stored) { navigate('/'); return; }
    try { setRule(JSON.parse(stored)); } catch { navigate('/'); }
  }, [navigate]);

  if (!rule) return null;

  const monedaPago = rule.moneda_factura === 'USD' ? 'SOL' : (rule.moneda_factura || 'SOL');

  async function handleCreate() {
    if (!rule) return;
    setSaving(true);
    const id = `INV-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from('invoices').insert({
      invoice_id: id,
      cliente: rule.cliente,
      monto: rule.monto_factura,
      moneda_factura: rule.moneda_factura,
      moneda_pago: monedaPago,
      descripcion: rule.descripcion_factura,
      status: 'pendiente',
      raw_text: rule.textoOriginal,
    });
    setInvoiceId(id);
    setDone(true);
    setSaving(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Factura creada</h1>
            <p className="text-muted-foreground mb-2">
              La factura <span className="text-primary font-mono font-bold">{invoiceId}</span> fue registrada correctamente.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Estado: <span className="text-yellow-400 font-medium">Pendiente de pago</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => navigate('/invoices')} className="fp-btn-secondary flex-1 py-3 text-sm">
                Ver facturas
              </button>
              <button onClick={() => navigate('/')} className="fp-btn-primary flex-1 py-3 text-sm">
                Nuevo →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const previewDate = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-5xl animate-fade-in">

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">Inicio</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">Nueva Factura</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Confirmar factura</h1>
              <p className="text-muted-foreground text-sm">Revisa los datos antes de registrar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left — form */}
            <div>
              <div className="fp-card p-1 mb-4">
                {[
                  { icon: <Building2 className="w-4 h-4" />, label: 'Cliente', value: rule.cliente },
                  { icon: <Coins className="w-4 h-4" />, label: 'Monto', value: rule.monto_factura ? `${rule.monto_factura} ${rule.moneda_factura || 'USD'}` : null, highlight: true },
                  { icon: <Coins className="w-4 h-4" />, label: 'Se cobra en', value: monedaPago },
                  { icon: <AlignLeft className="w-4 h-4" />, label: 'Descripción', value: rule.descripcion_factura || 'No especificada' },
                ].map((row, i, arr) => (
                  <div key={i} className={`flex items-center justify-between px-5 py-4 ${i !== arr.length - 1 ? 'border-b border-border/50' : ''}`}>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {row.icon}
                      <span className="text-sm font-medium">{row.label}</span>
                    </div>
                    <span className={`text-sm font-semibold ${row.highlight ? 'text-green-400' : 'text-foreground'}`}>
                      {row.value || <span className="text-destructive text-xs">No detectado</span>}
                    </span>
                  </div>
                ))}
              </div>

              <div className="fp-card p-4 mb-4 border border-primary/20 bg-primary/5">
                <p className="text-xs text-primary font-medium mb-1">¿Cómo funciona?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  La factura se guarda como <span className="text-yellow-400">pendiente</span>. Cuando el cliente pague en {monedaPago}, el estado cambia a <span className="text-green-400">pagada</span> automáticamente.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => navigate('/')} className="fp-btn-secondary flex-1 py-3 text-sm">← Modificar</button>
                <button onClick={handleCreate} disabled={saving || !rule.cliente || !rule.monto_factura}
                  className="fp-btn-emerald flex-[2] py-3 text-sm">
                  {saving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="fp-spinner" /><span>Creando factura...</span>
                    </div>
                  ) : 'Crear factura ✓'}
                </button>
              </div>
            </div>

            {/* Right — receipt preview */}
            <div className="hidden md:block">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Vista previa del recibo</p>
              <div className="bg-white rounded-2xl p-7 shadow-2xl text-gray-800 relative overflow-hidden">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.04]">
                  <p className="text-8xl font-black text-gray-900 rotate-[-30deg] tracking-widest">PREVIEW</p>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-6 pb-5 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)' }}>
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">FlowPay AI</span>
                    </div>
                    <p className="text-xs text-gray-400">flowpay.ai · Solana Devnet</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900 tracking-tight">FACTURA</p>
                    <p className="text-xs text-gray-400 mt-0.5">#{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Fecha</p>
                    <p className="text-xs font-semibold text-gray-800">{previewDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Estado</p>
                    <span className="text-[10px] font-bold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
                      PENDIENTE
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cliente</p>
                    <p className="text-sm font-bold text-gray-900">{rule.cliente || '—'}</p>
                  </div>
                </div>

                {/* Description row */}
                <div className="bg-gray-50 rounded-lg p-3 mb-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                      <p className="text-xs font-semibold text-gray-700">Descripción</p>
                      <p className="text-xs text-gray-500 mt-0.5">{rule.descripcion_factura || 'Servicios profesionales'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">Subtotal</p>
                      <p className="text-sm font-bold text-gray-800">
                        {rule.monto_factura ? `${rule.monto_factura} ${rule.moneda_factura || 'USD'}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t-2 border-gray-900 pt-3 flex justify-between items-center mb-5">
                  <p className="text-sm font-black text-gray-900 uppercase tracking-wider">Total</p>
                  <p className="text-2xl font-black text-gray-900">
                    {rule.monto_factura ? `${rule.monto_factura} ${rule.moneda_factura || 'USD'}` : '—'}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 -mt-3 mb-5">Se cobra en <span className="font-semibold">{monedaPago}</span></p>

                {/* Footer */}
                <div className="border-t border-gray-100 pt-4 text-center">
                  <p className="text-[10px] text-gray-400">Generado con FlowPay AI · Powered by Solana</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
