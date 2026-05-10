import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  createPayrollStream,
  type CreatePayrollStreamParams,
  type PayrollStreamResult,
} from "@/lib/streamflow";

interface UsePayrollStreamState {
  loading: boolean;
  result: PayrollStreamResult | null;
  error: string | null;
}

interface UsePayrollStreamReturn extends UsePayrollStreamState {
  createStream: (
    params: Omit<CreatePayrollStreamParams, "wallet">
  ) => Promise<PayrollStreamResult | null>;
  reset: () => void;
}

export function usePayrollStream(): UsePayrollStreamReturn {
  const wallet = useWallet();
  const [state, setState] = useState<UsePayrollStreamState>({
    loading: false,
    result: null,
    error: null,
  });

  const createStream = useCallback(
    async (
      params: Omit<CreatePayrollStreamParams, "wallet">
    ): Promise<PayrollStreamResult | null> => {
      setState({ loading: true, result: null, error: null });
      try {
        const result = await createPayrollStream({ ...params, wallet });
        setState({ loading: false, result, error: null });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error creando stream";
        setState({ loading: false, result: null, error: msg });
        return null;
      }
    },
    [wallet]
  );

  const reset = useCallback(() => {
    setState({ loading: false, result: null, error: null });
  }, []);

  return { ...state, createStream, reset };
}
