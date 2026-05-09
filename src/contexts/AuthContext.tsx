import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';

interface Employee {
  id: string;
  nombre: string;
  email: string;
  wallet: string | null;
  role: 'admin' | 'employee';
}

interface AuthContextType {
  user: Employee | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const stored = localStorage.getItem('flowpay_user');
      if (stored) {
        try {
          const cached = JSON.parse(stored);
          const { data } = await supabase
            .from('employees')
            .select('id, nombre, email, wallet, role')
            .eq('id', cached.id)
            .single();
          if (data) {
            setUser(data as Employee);
            localStorage.setItem('flowpay_user', JSON.stringify(data));
          } else {
            localStorage.removeItem('flowpay_user');
          }
        } catch {
          localStorage.removeItem('flowpay_user');
        }
      }
      setLoading(false);
    }
    verifySession();
  }, []);

  async function login(email: string, password: string) {
    const hashed = await hashPassword(password, email.toLowerCase().trim());

    const { data, error } = await supabase
      .from('employees')
      .select('id, nombre, email, wallet, role')
      .eq('email', email.toLowerCase().trim())
      .eq('password', hashed)
      .single();

    if (error || !data) throw new Error('Correo o contraseña incorrectos');

    const employee = data as Employee;
    setUser(employee);
    localStorage.setItem('flowpay_user', JSON.stringify(employee));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('flowpay_user');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
