import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    watch: { usePolling: true }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'solana-vendor':  ['@solana/web3.js', '@solana/wallet-adapter-react', '@solana/wallet-adapter-base'],
          'ui-vendor':      ['framer-motion', 'recharts', 'lucide-react'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
}) 