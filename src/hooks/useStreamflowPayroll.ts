import { useState, useCallback } from "react";
// import { StreamflowSolana, Types } from "@streamflow/stream";
import { useWallet } from "@solana/wallet-adapter-react";
// import { LAMPORTS_PER_SOL } from "@solana/web3.js";
// import BN from "bn.js";

// const DEVNET_RPC = "https://api.devnet.solana.com";
// const SOL_MINT   = "So11111111111111111111111111111111111111112";

// const DURATION_SECONDS: Record<string, number> = {
//   mensual:  30 * 24 * 60 * 60,
//   semanal:   7 * 24 * 60 * 60,
// };

export interface PayrollRecipient {
  nombre  : string;
  wallet  : string;
  totalSOL: number;
}

export interface StreamCreatedItem {
  nombre     : string;
  wallet     : string;
  monto      : number;
  txSignature: string;
  streamId   : string;
  status     : "success" | "error";
  error?     : string;
}

export function useStreamflowPayroll() {
  const wallet = useWallet();
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  /**
   * Creates one SOL-streaming payroll contract per recipient (sequential — one Phantom
   * signature per person so the user sees each transaction before it's sent).
   */
  const createPayrollStreams = useCallback(async (
    recipients : PayrollRecipient[],
    frecuencia : string,
    startDelay = 30,
  ): Promise<StreamCreatedItem[]> => {
    // TODO: StreamflowSolana module disabled — waiting for proper ESM export
    return recipients.map(r => ({
      nombre: r.nombre,
      wallet: r.wallet,
      monto: r.totalSOL,
      txSignature: "",
      streamId: "",
      status: "error" as const,
      error: "Streamflow está deshabilitado temporalmente",
    }));
  }, [wallet]);

  const cancelPayrollStream = useCallback(async (streamId: string): Promise<string | null> => {
    // TODO: StreamflowSolana module disabled
    setError("Cancelación de streams deshabilitada");
    return null;
  }, [wallet]);

  return {
    createPayrollStreams,
    cancelPayrollStream,
    loading,
    error,
    progress,
    walletConnected: !!wallet.connected,
    walletAddress  : wallet.publicKey?.toBase58() ?? null,
  };
}
