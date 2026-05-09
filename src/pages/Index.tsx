import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, AlertCircle, Clock } from 'lucide-react';
import Header from '@/components/Header';
import { parseRule } from '@/api/rules/parse';

const EXAMPLES = [
  { text: 'Paga 50 USDC a Ana, Luis y Carlos cada viernes', lang: 'ES' },
  { text: 'Envía 100 USDC a luis los lunes', lang: 'ES' },
  { text: 'Paga 25 USDC a carlos hoy', lang: 'ES' },
  { text: 'Pay 50 USDC to Ana, Luis and Carlos every Friday', lang: 'EN' },
  { text: 'Send 100 USDC to luis every monday', lang: 'EN' },
  { text: 'Pay 25 USDC to carlos today', lang: 'EN' },
];

const Index = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const parsed = await parseRule(text.trim());
      sessionStorage.setItem('parsedRule', JSON.stringify(parsed));
      navigate('/confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar la instrucción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }} />

      <main className="flex-1 flex items-center justify-center px-6 relative">
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="fp-badge gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>Powered by Solana + Groq AI</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground text-center mb-4 leading-tight tracking-tight">
            Automatiza tus pagos cripto{' '}
            <span className="text-primary">con una frase</span>
          </h1>
          <p className="text-muted-foreground text-center text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Escribe lo que quieres pagar. La IA lo interpreta y ejecuta en Solana en segundos.
          </p>

          {/* Textarea */}
          <div className="mb-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='Ejemplo: "Paga 50 USDC a Ana, Luis y Carlos cada viernes"'
              className="fp-input w-full px-5 py-4 text-base resize-none placeholder:text-muted-foreground/60"
              style={{ minHeight: '120px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAnalyze();
                }
              }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || loading}
            className="fp-btn-primary w-full py-3.5 px-6 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="fp-spinner" />
                <span>Analizando con IA...</span>
              </>
            ) : (
              <span>Analizar instrucción →</span>
            )}
          </button>

          {/* Error message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-destructive text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* History link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/history')}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Ver historial de pagos
            </button>
          </div>

          {/* Examples */}
          <div className="mt-8">
            <p className="text-xs text-muted-foreground/60 text-center mb-3 uppercase tracking-wider font-medium">
              Prueba un ejemplo · Try an example
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setText(example.text)}
                  className="text-left text-sm text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-lg border border-transparent hover:border-border hover:bg-card/50 transition-all duration-200 flex items-start gap-2"
                >
                  <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                    example.lang === 'EN'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {example.lang}
                  </span>
                  <span>"{example.text}"</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
