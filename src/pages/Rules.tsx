import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Users, Coins, Calendar, Clock, Plus, RefreshCw, Trash2, List } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

const WEEK_DAYS = [
  { key: 'lunes',      label: 'Lun', full: 'Lunes' },
  { key: 'martes',     label: 'Mar', full: 'Martes' },
  { key: 'miércoles',  label: 'Mié', full: 'Miércoles' },
  { key: 'jueves',     label: 'Jue', full: 'Jueves' },
  { key: 'viernes',    label: 'Vie', full: 'Viernes' },
  { key: 'sábado',     label: 'Sáb', full: 'Sábado' },
  { key: 'domingo',    label: 'Dom', full: 'Domingo' },
];

const DAY_NORMALIZE: Record<string, string> = {
  monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles',
  thursday: 'jueves', friday: 'viernes', saturday: 'sábado', sunday: 'domingo',
};

const TODAY_KEY = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][new Date().getDay()];

interface Rule {
  id: string;
  raw_text: string;
  destinatarios: { nombre: string; wallet: string | null }[];
  monto_por_persona: number;
  moneda: string;
  frecuencia: string | null;
  dia_de_pago: string | null;
  status: 'active' | 'paused';
  created_at: string;
  execution_count?: number;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const FREQ_LABELS: Record<string, string> = {
  'semanal':    'Semanal',
  'mensual':    'Mensual',
  'única vez':  'Única vez',
  'weekly':     'Semanal',
  'monthly':    'Mensual',
};

const DAY_LABELS: Record<string, string> = {
  'lunes': 'Lunes', 'martes': 'Martes', 'miércoles': 'Miércoles',
  'jueves': 'Jueves', 'viernes': 'Viernes', 'sábado': 'Sábado', 'domingo': 'Domingo',
  'monday': 'Lunes', 'tuesday': 'Martes', 'wednesday': 'Miércoles',
  'thursday': 'Jueves', 'friday': 'Viernes',
};

const Rules = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Rule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('calendar');

  async function fetchRules() {
    setLoading(true);
    const { data, error } = await supabase
      .from('rules')
      .select('*, executions(count)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped = data.map((r: any) => ({
        ...r,
        execution_count: r.executions?.[0]?.count ?? 0,
      }));
      setRules(mapped);
    }
    setLoading(false);
  }

  useEffect(() => { fetchRules(); }, []);

  async function toggleStatus(rule: Rule) {
    setToggling(rule.id);
    const newStatus = rule.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase
      .from('rules')
      .update({ status: newStatus })
      .eq('id', rule.id);

    if (!error) {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: newStatus } : r));
    }
    setToggling(null);
  }

  async function deleteRule(rule: Rule) {
    setDeleting(true);
    const { error } = await supabase.from('rules').delete().eq('id', rule.id);
    if (error) {
      alert('Error al eliminar: ' + error.message);
      setDeleting(false);
      return;
    }
    setRules(prev => prev.filter(r => r.id !== rule.id));
    setConfirmDelete(null);
    setDeleting(false);
  }

  const activeCount = rules.filter(r => r.status === 'active').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="fp-card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Eliminar regla</h2>
                <p className="text-xs text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              ¿Eliminar la regla <span className="text-foreground font-medium">"{confirmDelete.raw_text}"</span>? El historial de pagos ejecutados se conservará.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="fp-btn-secondary flex-1 py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteRule(confirmDelete)}
                disabled={deleting}
                className="fp-btn-primary flex-[2] py-3 text-sm bg-destructive hover:bg-destructive/90 border-destructive"
              >
                {deleting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="fp-spinner" /><span>Eliminando...</span>
                  </div>
                ) : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 md:px-6 py-6 md:py-10">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Reglas activas
              </h1>
              <p className="text-muted-foreground text-sm">
                {activeCount} activas · {rules.length} en total
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchRules}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {/* Toggle vista */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setView('calendar')}
                  className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${
                    view === 'calendar' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Calendario</span>
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${
                    view === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
              </div>
              <button
                onClick={() => navigate('/')}
                className="fp-btn-primary flex items-center gap-2 py-2 px-4 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva regla</span>
              </button>
            </div>
          </div>

          {/* Calendar view */}
          {!loading && view === 'calendar' && (
            <div className="mb-6">
              {rules.length === 0 ? (
                <div className="fp-card p-12 text-center">
                  <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-foreground font-semibold mb-2">Sin reglas todavía</p>
                  <p className="text-muted-foreground text-sm mb-6">Crea tu primera regla de pago automático</p>
                  <button onClick={() => navigate('/')} className="fp-btn-primary py-2.5 px-6 text-sm">+ Crear primera regla</button>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {WEEK_DAYS.map(day => {
                    const normalized = DAY_NORMALIZE[day.key] || day.key;
                    const dayRules = rules.filter(r => {
                      const d = (r.dia_de_pago || '').toLowerCase();
                      return d === day.key || d === normalized;
                    });
                    const isToday = day.key === TODAY_KEY;

                    return (
                      <div key={day.key} className={`rounded-xl border flex flex-col min-h-[160px] ${
                        isToday ? 'border-primary bg-primary/5' : 'border-border bg-card/40'
                      }`}>
                        {/* Day header */}
                        <div className={`px-2 py-2 text-center border-b ${
                          isToday ? 'border-primary/30' : 'border-border/50'
                        }`}>
                          <p className={`text-xs font-bold uppercase tracking-wider ${
                            isToday ? 'text-primary' : 'text-muted-foreground'
                          }`}>{day.label}</p>
                          {isToday && (
                            <span className="text-[10px] text-primary font-medium">Hoy</span>
                          )}
                        </div>

                        {/* Rules for this day */}
                        <div className="flex-1 p-1.5 space-y-1.5">
                          {dayRules.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/40 text-center mt-4">—</p>
                          ) : (
                            dayRules.map(rule => (
                              <div key={rule.id} className={`rounded-lg p-1.5 ${
                                rule.status === 'active'
                                  ? 'bg-green-500/10 border border-green-500/20'
                                  : 'bg-muted/30 border border-border/30 opacity-50'
                              }`}>
                                <p className={`text-[10px] font-bold mb-0.5 ${
                                  rule.status === 'active' ? 'text-green-400' : 'text-muted-foreground'
                                }`}>
                                  {rule.monto_por_persona} {rule.moneda || 'SOL'}
                                </p>
                                {rule.destinatarios?.slice(0, 3).map((d, i) => (
                                  <p key={i} className="text-[10px] text-muted-foreground truncate capitalize">
                                    {d.nombre}
                                  </p>
                                ))}
                                {(rule.destinatarios?.length || 0) > 3 && (
                                  <p className="text-[10px] text-muted-foreground/60">
                                    +{rule.destinatarios.length - 3} más
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reglas sin día asignado */}
              {rules.filter(r => {
                const d = (r.dia_de_pago || '').toLowerCase();
                return !WEEK_DAYS.some(w => w.key === d || DAY_NORMALIZE[w.key] === d);
              }).length > 0 && (
                <div className="mt-4 fp-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Sin día fijo (única vez / mensual)
                  </p>
                  <div className="space-y-2">
                    {rules.filter(r => {
                      const d = (r.dia_de_pago || '').toLowerCase();
                      return !WEEK_DAYS.some(w => w.key === d || DAY_NORMALIZE[w.key] === d);
                    }).map(rule => (
                      <div key={rule.id} className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1">"{rule.raw_text}"</p>
                        <span className="text-xs text-primary ml-3 shrink-0">
                          {rule.monto_por_persona} {rule.moneda || 'SOL'} · {FREQ_LABELS[rule.frecuencia || ''] || rule.frecuencia}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="fp-spinner mr-3" />
              <span className="text-muted-foreground">Cargando reglas...</span>
            </div>
          ) : view === 'list' && rules.length === 0 ? (
            <div className="fp-card p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-foreground font-semibold mb-2">No hay reglas todavía</p>
              <p className="text-muted-foreground text-sm mb-6">
                Crea tu primera regla de pago automático
              </p>
              <button
                onClick={() => navigate('/')}
                className="fp-btn-primary py-2.5 px-6 text-sm"
              >
                + Crear primera regla
              </button>
            </div>
          ) : view === 'list' ? (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`fp-card p-5 transition-all ${
                    rule.status === 'paused' ? 'opacity-60' : ''
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium text-sm leading-relaxed line-clamp-2">
                        "{rule.raw_text}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status badge */}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        rule.status === 'active'
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {rule.status === 'active' ? '● Activa' : '○ Pausada'}
                      </span>
                      {/* Toggle button */}
                      <button
                        onClick={() => toggleStatus(rule)}
                        disabled={toggling === rule.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          rule.status === 'active'
                            ? 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                            : 'bg-green-500/15 hover:bg-green-500/25 text-green-400'
                        }`}
                      >
                        {toggling === rule.id ? (
                          <div className="fp-spinner w-3 h-3" />
                        ) : rule.status === 'active' ? (
                          <><Pause className="w-3 h-3" /> Pausar</>
                        ) : (
                          <><Play className="w-3 h-3" /> Activar</>
                        )}
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={() => setConfirmDelete(rule)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-muted/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Destinatarios</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {rule.destinatarios?.map(d => capitalize(d.nombre)).join(', ') || '—'}
                      </p>
                    </div>

                    <div className="bg-muted/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Coins className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Monto</span>
                      </div>
                      <p className="text-sm font-semibold text-green-400">
                        {rule.monto_por_persona} {rule.moneda || 'SOL'}
                      </p>
                    </div>

                    <div className="bg-muted/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Frecuencia</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {FREQ_LABELS[rule.frecuencia || ''] || rule.frecuencia || '—'}
                      </p>
                    </div>

                    <div className="bg-muted/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Día de pago</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {DAY_LABELS[rule.dia_de_pago || ''] || rule.dia_de_pago || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      {rule.last_executed_at
                        ? `Último pago: ${new Date(rule.last_executed_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                        : 'Sin ejecuciones aún'}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {rule.execution_count} ejecuciones
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default Rules;
