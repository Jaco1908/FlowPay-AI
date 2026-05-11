import type { ParsedRule, AmbiguousName, DestinatarioConWallet } from '@/types';

/**
 * Servicio para resolver nombres ambiguos en las reglas parseadas
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resuelve los nombres ambiguos en la regla parseada actualizando los destinatarios
 */
export function resolveAmbiguousNames(
  parsed: ParsedRule,
  selections: Record<string, string>
): ParsedRule {
  if (!parsed.ambiguousNames || parsed.ambiguousNames.length === 0) {
    return parsed;
  }

  // Mapear el nombre ambiguo original al nombre resuelto
  const nameMap: Record<string, string> = {};
  for (const amb of parsed.ambiguousNames) {
    nameMap[amb.nombre] = selections[amb.nombre] || amb.nombre;
  }

  // Actualizar destinatarios
  const updatedDestinatarios = parsed.destinatarios.map(nombre => nameMap[nombre] || nombre);

  // Actualizar destinatariosConWallet manteniendo la estructura
  const updatedDestinatariosConWallet: DestinatarioConWallet[] = updatedDestinatarios.map(nombre => ({
    nombre,
    wallet: null,
    exists: false,
    employeeId: null,
  }));

  return {
    ...parsed,
    destinatarios: updatedDestinatarios,
    destinatariosConWallet: updatedDestinatariosConWallet,
    ambiguousNames: [], // Marcar como resuelto
  };
}

/**
 * Actualiza el texto de la instrucción reemplazando nombres ambiguos con sus selecciones
 */
export function updateTextWithResolvedNames(
  text: string,
  ambiguousNames: AmbiguousName[],
  selections: Record<string, string>
): string {
  if (ambiguousNames.length === 0) return text;

  // Ordenar por longitud descendente para evitar sobreescrituras
  const orderedNames = [...ambiguousNames].sort((a, b) => b.nombre.length - a.nombre.length);

  let result = text;
  for (const amb of orderedNames) {
    const replacement = selections[amb.nombre];
    if (replacement && replacement !== amb.nombre) {
      const pattern = new RegExp(escapeRegExp(amb.nombre), 'gi');
      result = result.replace(pattern, replacement);
    }
  }

  return result;
}

/**
 * Verifica si la respuesta de error contiene ambigüedad no resuelta
 */
export function isAmbiguousError(error: string): boolean {
  return error.includes('Nombre ambiguo') || error.includes('ambiguo');
}
