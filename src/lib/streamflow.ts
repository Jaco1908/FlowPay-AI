import { SolanaStreamClient } from "@streamflow/stream";
import type {
  ICreateStreamData,
  ICreateStreamExt,
  StreamClientOptions,
} from "@streamflow/stream";
import { getBN } from "@streamflow/common";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { SignerWalletAdapter } from "@solana/wallet-adapter-base";

// ── Constantes ────────────────────────────────────────────────────────────────

const DEVNET_RPC = "https://api.devnet.solana.com";

// Wrapped SOL mint — StreamFlow wrappea SOL→wSOL internamente cuando isNative=true
const WSOL_MINT = "So11111111111111111111111111111111111111112";

// 30 días en segundos
const ONE_MONTH_SECS = 30 * 24 * 60 * 60; // 2_592_000

// Delay de inicio: 60 segundos desde ahora para que el nodo confirme la creación
const START_DELAY_SECS = 60;

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface CreatePayrollStreamParams {
  wallet: WalletContextState;
  recipientAddress: string; // wallet del empleado (Base58)
  totalSol: number;          // SOL total a streamear en el mes
  streamName: string;        // ej. "Nómina Ana – Mayo 2026"
}

export interface PayrollStreamResult {
  txSignature: string;   // firma de la tx de creación
  contractId: string;    // pubkey del contrato en StreamFlow
  explorerUrl: string;   // Solana Explorer → tx de creación
  streamflowUrl: string; // Dashboard StreamFlow → stream live
}

// ── Función principal ──────────────────────────────────────────────────────────

/**
 * Crea un stream de nómina en Devnet usando StreamFlow Finance.
 *
 * El SOL se libera cada segundo durante 30 días.
 * Llama esto DESPUÉS de que el usuario confirma el pago en la UI.
 *
 * @example
 * const result = await createPayrollStream({
 *   wallet,
 *   recipientAddress: "7xKc...",
 *   totalSol: 0.05,
 *   streamName: "Nómina Ana – Mayo 2026",
 * });
 * window.open(result.explorerUrl);
 */
export async function createPayrollStream(
  params: CreatePayrollStreamParams
): Promise<PayrollStreamResult> {
  const { wallet, recipientAddress, totalSol, streamName } = params;

  // ── Validaciones previas ───────────────────────────────────────────────────
  if (!wallet.publicKey) {
    throw new Error("Wallet no conectada. Conecta Phantom antes de crear el stream.");
  }
  if (!wallet.signTransaction || !wallet.signAllTransactions) {
    throw new Error("Tu wallet no soporta firma de transacciones.");
  }
  if (totalSol <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }
  if (!recipientAddress || recipientAddress.length < 32) {
    throw new Error("Wallet del empleado inválida.");
  }
  if (wallet.publicKey.toBase58() === recipientAddress) {
    throw new Error("El sender y el recipient no pueden ser la misma wallet.");
  }

  // ── Cliente StreamFlow ─────────────────────────────────────────────────────
  const clientOptions: StreamClientOptions = {
    clusterUrl: DEVNET_RPC,
    cluster: "devnet",
  };
  const client = new SolanaStreamClient(clientOptions);

  // ── Cálculo de importes ────────────────────────────────────────────────────
  // getBN(amount, decimals) → BN con escala correcta
  // SOL tiene 9 decimales (lamports)
  const totalBN = getBN(totalSol, 9);

  // Lamports por segundo, con un mínimo de 1 para que el protocolo lo acepte
  const totalLamports = Math.floor(totalSol * 1_000_000_000);
  const lamportsPerSecond = Math.max(1, Math.floor(totalLamports / ONE_MONTH_SECS));
  const amountPerPeriodBN = getBN(lamportsPerSecond / 1_000_000_000, 9);

  const startTimestamp = Math.floor(Date.now() / 1000) + START_DELAY_SECS;

  // ── Parámetros del stream ──────────────────────────────────────────────────
  const streamData: ICreateStreamData = {
    // Identidad
    recipient: recipientAddress,
    tokenId: WSOL_MINT,
    name: streamName.slice(0, 64),

    // Timing
    start: startTimestamp,
    cliff: startTimestamp, // sin cliff — libera desde el primer segundo
    cliffAmount: getBN(0, 9),

    // Importes
    amount: totalBN,
    period: 1,              // libera cada 1 segundo
    amountPerPeriod: amountPerPeriodBN,

    // Control del stream
    cancelableBySender: true,        // empresa puede cancelar
    cancelableByRecipient: false,
    transferableBySender: false,
    transferableByRecipient: false,
    canTopup: false,

    // Sin retiro automático — el empleado retira cuando quiera
    automaticWithdrawal: false,
    withdrawalFrequency: 0,
  };

  // ── Parámetros Solana ──────────────────────────────────────────────────────
  // WalletContextState es compatible con SignerWalletAdapter:
  // ambos exponen publicKey, signTransaction y signAllTransactions
  const solanaExt: ICreateStreamExt = {
    sender: wallet as unknown as SignerWalletAdapter,
    isNative: true, // SOL nativo → SDK maneja el wrap a wSOL
  };

  // ── Crear el stream ────────────────────────────────────────────────────────
  const { txId, metadataId } = await client.create(streamData, solanaExt);

  return {
    txSignature: txId,
    contractId: metadataId,
    explorerUrl: `https://explorer.solana.com/tx/${txId}?cluster=devnet`,
    streamflowUrl: `https://app.streamflow.finance/streams/solana/devnet/${metadataId}`,
  };
}
