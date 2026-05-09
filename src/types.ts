export type Intent = 'pago' | 'factura' | 'offramp' | 'ayuda';

export interface ParsedRule {
  intent: Intent;
  // Pago
  destinatarios: string[];
  destinatariosConWallet: { nombre: string; wallet: string | null }[];
  monto_por_persona: number;
  moneda: string;
  frecuencia: string | null;
  dia_de_pago: string | null;
  textoOriginal: string;
  // Factura
  cliente?: string;
  monto_factura?: number;
  moneda_factura?: string;
  descripcion_factura?: string;
  // Off-ramp
  monto_offramp?: number;
  moneda_origen?: string;
  destino_offramp?: string;
  // Ayuda
  mensaje_ayuda?: string;
}

export interface ExecuteResult {
  executions: {
    nombre: string;
    wallet: string;
    monto: number;
    moneda: string;
    tx_hash: string;
    explorer_url: string;
    status: 'success' | 'error';
    error?: string;
  }[];
  rule_id: string;
}
