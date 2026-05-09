import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/** Solana devnet connection */
export const CONNECTION = new Connection('https://api.devnet.solana.com', 'confirmed');

/**
 * Reads EMPRESA_WALLET_PRIVATE_KEY from environment and returns a Keypair.
 * Only use in secure server contexts (Edge Functions).
 * Never call this from browser code.
 */
export function getEmpresaKeypair(): Keypair {
  const privateKey = process.env.EMPRESA_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('EMPRESA_WALLET_PRIVATE_KEY is not set in environment variables');
  }
  const decoded = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}
