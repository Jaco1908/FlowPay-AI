import React from 'react';
import { Zap, Clock, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border/60">
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--gradient-blue)' }}>
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground tracking-tight text-lg">
          FlowPay AI
        </span>
      </button>

      {/* Nav */}
      <nav className="flex items-center gap-1">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Home className="w-4 h-4" />
          Inicio
        </button>
        <button
          onClick={() => navigate('/history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/history'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Clock className="w-4 h-4" />
          Historial
        </button>
      </nav>

      {/* Badge */}
      <div className="fp-badge">
        <span className="text-muted-foreground text-xs">Solana Devnet</span>
      </div>
    </header>
  );
};

export default Header;
