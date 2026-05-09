import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Users, Coins, Clock, CalendarDays, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import { executeRule } from '@/api/rules/execute';
import type { ParsedRule } from '@/types';

const Confirm = () => {
  const navigate = useNavigate();
  const [rule, setRule] = useState<ParsedRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('parsedRule');
    if (!stored) {
      navigate('/');
      return;
    }
    try {
      setRule(JSON.parse(stored));
    } catch {
      navigate('/');
    }
  }, [navigate]);

  if (!rule) return null;

  const nullFields: string[] = [];
  if (!rule.monto_por_persona) nullFields.push('Monto por persona');
  if (!rule.frecuencia) nullFields.push('Frecuencia');
  if (!rule.destinatarios || rule.destinatarios.length === 0) nullFields.push('Destinatarios');

  const montoInvalido = !!rule.monto_por_persona && rule.monto_por_persona <= 0;
  const hasBlockingNulls = nullFields.length > 0 || montoInvalido;
  const totalSOL = (rule.monto_por_persona || 0) * (rule.destinatarios?.length || 0);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const handleExecute = async () => {
    if (loading || hasBlockingNulls) return;
    setLoading(true);
    setError(null);

    try {
      const result = await executeRule(rule);
      sessionStorage.setItem('execResult', JSON.stringify(result));
      navigate('/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar los pagos');
      setLoading(false);
    }
  };

  const rows = [
    {
      icon: <Users className="w-4 h-4" />,
      label: 'Destinatarios',
      value: rule.destinatarios?.length
        ? rule.destinatarios.map(capitalize).join(', ')
        : null,
    },
    {
      icon: <Coins className="w-4 h-4" />,
      label: 'Monto por persona',
      value: rule.monto_por_persona
        ? `${rule.monto_por_persona} ${rule.moneda || 'USDC'}`
        : null,
      highlight: true,
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Frecuencia',
      value: rule.frecuencia,
    },
    {
      icon: <CalendarDays className="w-4 h-4" />,
      label: 'Día de pago',
      value: rule.dia_de_pago || 'No especificado',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Header />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center animate-scale-in">
            <div className="fp-spinner-blue w-12 h-12 border-[3px] mx-auto mb-4"
              style={{ width: '3rem', height: '3rem' }} />
            <p className="text-foreground font-semibold text-lg">Ejecutando en Solana devnet...</p>
            <p className="text-muted-foreground text-sm mt-1">Esto puede tardar unos segundos</p>
          </div>
        </div>
      )}

      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-xl animate-fade-in">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">
              Inicio
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">Confirmar</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
            ¿Es esto lo que quieres hacer?
          </h1>
          <p className="text-muted-foreground mb-8">
            Revisa los detalles antes de ejecutar en Solana
          </p>

          {/* Details card */}
          <div className="fp-card p-1 mb-6">
            {rows.map((row, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== rows.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <div className="flex items-center gap-3 text-muted-foreground">
                  {row.icon}
                  <span className="text-sm font-medium">{row.label}</span>
                </div>
                <div className="text-right">
                  {row.value ? (
                    <span className={`text-sm font-semibold ${
                      row.highlight ? 'text-success' : 'text-foreground'
                    }`}>
                      {row.value}
                    </span>
                  ) : (
                    <span className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      No detectado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Alert if missing fields */}
          {hasBlockingNulls && (
            <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive mb-1">
                    {montoInvalido ? 'Monto inválido' : 'Necesito más información'}
                  </p>
                  <p className="text-sm text-destructive/80">
                    {montoInvalido
                      ? `El monto debe ser mayor a 0. Escribe algo como "Paga 0.05 SOL a Ana".`
                      : `Campos faltantes: ${nullFields.join(', ')}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5 animate-fade-in">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="fp-btn-secondary flex-1 py-3 px-5 text-sm"
            >
              ← Modificar
            </button>
            <button
              onClick={handleExecute}
              disabled={hasBlockingNulls || loading}
              className="fp-btn-green flex-[2] py-3 px-5 text-sm"
            >
              Confirmar y ejecutar en Solana ✓
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Confirm;
