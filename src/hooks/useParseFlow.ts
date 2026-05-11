import { useState, useCallback } from 'react';
import { parseRule } from '@/api/rules/parse';
import type { ParsedRule, AmbiguousName } from '@/types';

export type ParseFlowState = 'idle' | 'loading' | 'ambiguous' | 'incomplete' | 'ready' | 'error';

interface ParseFlowResult {
  state: ParseFlowState;
  parsed: ParsedRule | null;
  error: string | null;
  ambiguousNames: AmbiguousName[] | null;
}

export function useParseFlow() {
  const [result, setResult] = useState<ParseFlowResult>({
    state: 'idle',
    parsed: null,
    error: null,
    ambiguousNames: null,
  });

  const parse = useCallback(async (text: string): Promise<ParseFlowResult> => {
    setResult({ state: 'loading', parsed: null, error: null, ambiguousNames: null });

    try {
      const parsed = await parseRule(text.trim());

      // Si ya vino con ambiguousNames resueltas, continuar
      if (parsed.ambiguousNames && parsed.ambiguousNames.length > 0) {
        const result: ParseFlowResult = {
          state: 'ambiguous',
          parsed,
          error: null,
          ambiguousNames: parsed.ambiguousNames,
        };
        setResult(result);
        return result;
      }

      // Verificar datos incompletos
      const missingCount = getMissingFieldsCount(parsed);
      if (missingCount > 0) {
        const result: ParseFlowResult = {
          state: 'incomplete',
          parsed,
          error: null,
          ambiguousNames: null,
        };
        setResult(result);
        return result;
      }

      const result: ParseFlowResult = {
        state: 'ready',
        parsed,
        error: null,
        ambiguousNames: null,
      };
      setResult(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al analizar la instrucción';
      const result: ParseFlowResult = {
        state: 'error',
        parsed: null,
        error: errorMsg,
        ambiguousNames: null,
      };
      setResult(result);
      return result;
    }
  }, []);

  const reset = useCallback(() => {
    setResult({ state: 'idle', parsed: null, error: null, ambiguousNames: null });
  }, []);

  return { ...result, parse, reset };
}

function getMissingFieldsCount(parsed: ParsedRule): number {
  if (parsed.intent === 'pago') {
    let missing = 0;
    if (!parsed.destinatarios?.length) missing++;
    if (!parsed.monto_por_persona) missing++;
    if (parsed.frecuencia === 'semanal' && !parsed.dia_de_pago) missing++;
    return missing;
  }
  if (parsed.intent === 'factura') {
    let missing = 0;
    if (!parsed.cliente) missing++;
    if (!parsed.monto_factura) missing++;
    return missing;
  }
  if (parsed.intent === 'offramp') {
    if (!parsed.monto_offramp) return 1;
  }
  return 0;
}
