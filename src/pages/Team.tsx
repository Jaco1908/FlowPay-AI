import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Wallet, Mail, User, Lock, X } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

interface Employee {
  id: string;
  nombre: string;
  email: string;
  wallet: string | null;
  role: string;
  created_at: string;
}

export default function Team() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: '', email: '', wallet: '', password: ''
  });

  async function fetchEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('role', 'employee')
      .order('created_at', { ascending: false });
    if (data) setEmployees(data);
    setLoading(false);
  }

  useEffect(() => { fetchEmployees(); }, []);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('employees').insert({
      nombre: form.nombre.trim(),
      email: form.email.toLowerCase().trim(),
      wallet: form.wallet.trim() || null,
      password: form.password,
      role: 'employee',
    });
    if (error) {
      setError(error.message.includes('unique') ? 'Ese correo ya existe' : error.message);
    } else {
      setForm({ nombre: '', email: '', wallet: '', password: '' });
      setShowForm(false);
      fetchEmployees();
    }
    setSaving(false);
  }

  async function deleteEmployee(id: string) {
    setDeleting(id);
    await supabase.from('employees').delete().eq('id', id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    setDeleting(null);
  }

  const truncateWallet = (w: string) => w.length > 12 ? `${w.slice(0, 6)}...${w.slice(-4)}` : w;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 md:py-10">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Equipo</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {employees.length} colaboradores registrados
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="fp-btn-primary flex items-center gap-2 py-2.5 px-4 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar empleado</span>
            </button>
          </div>

          {/* Modal crear empleado */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
              <div className="fp-card w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-foreground">Nuevo colaborador</h2>
                  <button onClick={() => { setShowForm(false); setError(null); }}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={createEmployee} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                      Nombre completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={form.nombre}
                        onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                        placeholder="Ana García"
                        className="fp-input w-full pl-10 pr-4 py-3 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="ana@correo.com"
                        className="fp-input w-full pl-10 pr-4 py-3 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                      Wallet de Solana
                    </label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={form.wallet}
                        onChange={e => setForm(f => ({ ...f, wallet: e.target.value }))}
                        placeholder="7xKp9mNqR7vBwJ2sLdYf..."
                        className="fp-input w-full pl-10 pr-4 py-3 text-sm font-mono"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Dirección pública de Solana del colaborador
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                      Contraseña de acceso
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="••••••••"
                        className="fp-input w-full pl-10 pr-4 py-3 text-sm"
                        required
                        minLength={4}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                      className="fp-btn-secondary flex-1 py-3 text-sm">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving}
                      className="fp-btn-primary flex-[2] py-3 text-sm">
                      {saving ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="fp-spinner" /><span>Guardando...</span>
                        </div>
                      ) : 'Crear colaborador'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista de empleados */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="fp-spinner mr-3" />
              <span className="text-muted-foreground">Cargando equipo...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="fp-card p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-foreground font-semibold mb-2">Sin colaboradores todavía</p>
              <p className="text-muted-foreground text-sm mb-6">
                Agrega a tu equipo para poder incluirlos en los pagos automáticos
              </p>
              <button onClick={() => setShowForm(true)} className="fp-btn-primary py-2.5 px-6 text-sm">
                + Agregar primer colaborador
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map(emp => (
                <div key={emp.id} className="fp-card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                    style={{ background: 'var(--gradient-blue)' }}>
                    {emp.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold">{emp.nombre}</p>
                    <p className="text-muted-foreground text-xs">{emp.email}</p>
                    {emp.wallet && (
                      <p className="text-muted-foreground text-xs font-mono mt-0.5">
                        {truncateWallet(emp.wallet)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {emp.wallet ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400 font-medium">
                        ✓ Wallet
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">
                        Sin wallet
                      </span>
                    )}
                    <button
                      onClick={() => deleteEmployee(emp.id)}
                      disabled={deleting === emp.id}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      {deleting === emp.id
                        ? <div className="fp-spinner w-4 h-4" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
