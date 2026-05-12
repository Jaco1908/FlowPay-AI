import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from 'recharts';
import { TrendingUp, Send, Users, Repeat2, FileText, CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      label: DAY_LABELS[d.getDay()],
    };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-foreground font-bold">{Number(payload[0].value).toFixed(4)} SOL</p>
    </div>
  );
};

const CustomTooltipH = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1 capitalize">{label}</p>
      <p className="text-foreground font-bold">{Number(payload[0].value).toFixed(4)} SOL</p>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [totalSol, setTotalSol] = useState(0);
  const [totalTx, setTotalTx] = useState(0);
  const [activeRules, setActiveRules] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const [dailyData, setDailyData] = useState<{ label: string; sol: number }[]>([]);
  const [recipientData, setRecipientData] = useState<{ nombre: string; sol: number }[]>([]);

  const [invoicePendiente, setInvoicePendiente] = useState(0);
  const [invoicePagada, setInvoicePagada] = useState(0);
  const [invoiceCancelada, setInvoiceCancelada] = useState(0);
  const [rawInvoices, setRawInvoices] = useState<{ status: string; monto: number; moneda_factura: string }[]>([]);
  const [solPrice, setSolPrice] = useState(148);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setSolPrice(d?.solana?.usd ?? 148))
      .catch(() => {});
  }, []);

  const toUSD = (m: number, moneda: string) => moneda === 'SOL' ? m * solPrice : m;
  const montoPendiente = rawInvoices.filter(i => i.status === 'pendiente').reduce((s, i) => s + toUSD(Number(i.monto), i.moneda_factura), 0);
  const montoPagado    = rawInvoices.filter(i => i.status === 'pagada').reduce((s, i) => s + toUSD(Number(i.monto), i.moneda_factura), 0);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [exRes, rulesRes, empRes, invRes] = await Promise.all([
      supabase
        .from('executions')
        .select('monto, executed_at, destinatario_nombre, status')
        .eq('status', 'completed'),
      supabase.from('rules').select('status'),
      supabase.from('employees').select('id').eq('role', 'employee'),
      supabase.from('invoices').select('status, monto, moneda_factura'),
    ]);

    const executions = (exRes.data || []) as { monto: number; executed_at: string; destinatario_nombre: string; status: string }[];
    const rules = (rulesRes.data || []) as { status: string }[];
    const employees = empRes.data || [];
    const invoices = (invRes.data || []) as { status: string; monto: number; moneda_factura: string }[];

    // Stats
    const sol = executions.reduce((s, e) => s + Number(e.monto), 0);
    setTotalSol(sol);
    setTotalTx(executions.length);
    setActiveRules(rules.filter(r => r.status === 'active').length);
    setTotalEmployees(employees.length);

    // SOL por día (últimos 7 días)
    const days = getLast7Days();
    const daily = days.map(({ date, label }) => {
      const sol = executions
        .filter(e => e.executed_at.slice(0, 10) === date)
        .reduce((s, e) => s + Number(e.monto), 0);
      return { label, sol };
    });
    setDailyData(daily);

    // Top destinatarios
    const byPerson: Record<string, number> = {};
    executions.forEach(e => {
      const n = e.destinatario_nombre || 'Desconocido';
      byPerson[n] = (byPerson[n] || 0) + Number(e.monto);
    });
    const sorted = Object.entries(byPerson)
      .map(([nombre, sol]) => ({ nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1), sol }))
      .sort((a, b) => b.sol - a.sol)
      .slice(0, 6);
    setRecipientData(sorted);

    // Facturas
    setInvoicePendiente(invoices.filter(i => i.status === 'pendiente').length);
    setInvoicePagada(invoices.filter(i => i.status === 'pagada').length);
    setInvoiceCancelada(invoices.filter(i => i.status === 'cancelada').length);
    setRawInvoices(invoices);

    setLoading(false);
  }

  const stats = [
    { label: 'SOL enviado', value: totalSol.toFixed(4), unit: 'SOL', icon: <Send className="w-4 h-4" />, color: 'text-primary' },
    { label: 'Transacciones', value: totalTx, unit: 'txs', icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-400' },
    { label: 'Reglas activas', value: activeRules, unit: 'reglas', icon: <Repeat2 className="w-4 h-4" />, color: 'text-yellow-400' },
    { label: 'Colaboradores', value: totalEmployees, unit: 'personas', icon: <Users className="w-4 h-4" />, color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 md:py-10">
        <div className="max-w-5xl mx-auto">

          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Resumen de actividad de FlowPay AI</p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {stats.map((s, i) => (
              <div key={i} className="fp-card p-4">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  {s.icon}
                  <span className="text-xs">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="fp-spinner mr-3" />
              <span className="text-muted-foreground">Cargando datos...</span>
            </div>
          ) : (
            <>
              {/* Charts row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* SOL por día */}
                <div className="fp-card p-5">
                  <p className="text-sm font-semibold text-foreground mb-1">SOL enviado por día</p>
                  <p className="text-xs text-muted-foreground mb-4">Últimos 7 días</p>
                  {dailyData.every(d => d.sol === 0) ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground/40 text-sm">
                      Sin pagos en los últimos 7 días
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={dailyData} barSize={24}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => v.toFixed(2)} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                        <Bar dataKey="sol" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Top destinatarios */}
                <div className="fp-card p-5">
                  <p className="text-sm font-semibold text-foreground mb-1">Top destinatarios</p>
                  <p className="text-xs text-muted-foreground mb-4">SOL total recibido</p>
                  {recipientData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground/40 text-sm">
                      Sin transacciones todavía
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={recipientData} layout="vertical" barSize={16}>
                        <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(2)} />
                        <YAxis type="category" dataKey="nombre" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip content={<CustomTooltipH />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                        <Bar dataKey="sol" fill="#22C55E" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Facturas summary */}
              <div className="fp-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">Estado de facturas</p>
                  </div>
                  <button onClick={() => navigate('/invoices')}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    Ver todas <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-yellow-400">{invoicePendiente}</p>
                    <p className="text-xs text-muted-foreground mt-1">Pendientes</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-400">{invoicePagada}</p>
                    <p className="text-xs text-muted-foreground mt-1">Pagadas</p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
                    <XCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
                    <p className="text-2xl font-bold text-destructive">{invoiceCancelada}</p>
                    <p className="text-xs text-muted-foreground mt-1">Canceladas</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Por cobrar</p>
                    <p className="text-lg font-bold text-yellow-400">
                      ${montoPendiente.toLocaleString()} <span className="text-xs font-normal">USD</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Ya cobrado</p>
                    <p className="text-lg font-bold text-green-400">
                      ${montoPagado.toLocaleString()} <span className="text-xs font-normal">USD</span>
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
