import React from 'react';
import { Zap, Clock, Home, Wallet, Repeat2, Users, LogOut, FileText, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWalletBalance } from '@/hooks/use-wallet-balance';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { balance, loading } = useWalletBalance();
  const { logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border/60">
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
      >
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--gradient-blue)' }}>
          <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground tracking-tight text-base md:text-lg">
          FlowPay AI
        </span>
      </button>

      {/* Nav */}
      <nav className="flex items-center gap-1">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-1.5 px-2.5 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Inicio</span>
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex items-center gap-1.5 px-2.5 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/dashboard'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <button
          onClick={() => navigate('/rules')}
          className={`flex items-center gap-1.5 px-2.5 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/rules'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Repeat2 className="w-4 h-4" />
          <span className="hidden sm:inline">Reglas</span>
        </button>
        <button
          onClick={() => navigate('/team')}
          className={`flex items-center gap-1.5 px-2.5 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/team'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Equipo</span>
        </button>
        <button
          onClick={() => navigate('/history')}
          className={`flex items-center gap-1.5 px-2.5 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/history'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">Historial</span>
        </button>
        <button
          onClick={() => navigate('/invoices')}
          className={`flex items-center gap-1.5 px-2.5 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            location.pathname === '/invoices'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Facturas</span>
        </button>
      </nav>

      {/* Wallet balance */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="fp-badge gap-1.5">
          <Wallet className="w-3 h-3 text-primary shrink-0" />
          <span className="hidden md:inline text-xs text-muted-foreground">Empresa:</span>
          {loading ? (
            <span className="text-xs text-muted-foreground animate-pulse">...</span>
          ) : balance !== null ? (
            <span className="text-xs font-semibold text-foreground">
              {balance.toFixed(4)} SOL
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="fp-badge hidden sm:flex">
          <span className="text-muted-foreground text-xs">Devnet</span>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
