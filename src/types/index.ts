export interface DestinatarioConWallet {
  nombre: string;
  wallet: string | null;
}

export interface ParsedRule {
  intent: 'pago' | 'factura' | 'offramp' | 'ayuda';
  textoOriginal: string;

  // pago
  destinatarios: string[];
  destinatariosConWallet: DestinatarioConWallet[];
  monto_por_persona: number | null;
  moneda: string | null;
  frecuencia: string | null;
  dia_de_pago: string | null;

  // factura
  cliente: string | null;
  monto_factura: number | null;
  moneda_factura: string | null;
  descripcion_factura: string | null;

  // offramp
  monto_offramp: number | null;
  moneda_origen: string | null;
  destino_offramp: string | null;

  // ayuda
  mensaje_ayuda: string | null;
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
