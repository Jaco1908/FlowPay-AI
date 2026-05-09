export interface DestinatarioConWallet {
  nombre: string;
  wallet: string | null;
}

export interface ParsedRule {
  destinatarios: string[];
  destinatariosConWallet: DestinatarioConWallet[];
  monto_por_persona: number;
  moneda: string;
  frecuencia: string | null;
  dia_de_pago: string | null;
  textoOriginal: string;
}

export interface ExecutionItem {
  nombre: string;
  wallet: string;
  monto: number;
  moneda: string;
  tx_hash: string;
  explorer_url: string;
  status: 'success' | 'error';
  error?: string;
}

export interface ExecuteResult {
  executions: ExecutionItem[];
  rule_id: string;
}
