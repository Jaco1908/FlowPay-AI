import React, { useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Index from './pages/Index';
import Confirm from './pages/Confirm';
import Success from './pages/Success';
import History from './pages/History';
import Rules from './pages/Rules';
import Team from './pages/Team';
import EmployeeDashboard from './pages/EmployeeDashboard';
import NotFound from './pages/NotFound';

import '@solana/wallet-adapter-react-ui/styles.css';

const App = () => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <AuthProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Rutas del admin */}
              <Route path="/" element={<ProtectedRoute role="admin"><Index /></ProtectedRoute>} />
              <Route path="/confirm" element={<ProtectedRoute role="admin"><Confirm /></ProtectedRoute>} />
              <Route path="/success" element={<ProtectedRoute role="admin"><Success /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute role="admin"><History /></ProtectedRoute>} />
              <Route path="/rules" element={<ProtectedRoute role="admin"><Rules /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute role="admin"><Team /></ProtectedRoute>} />

              {/* Ruta del empleado */}
              <Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeDashboard /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </AuthProvider>
  );
};

export default App;
