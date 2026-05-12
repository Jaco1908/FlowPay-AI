import type { AmbiguousName } from '@/types';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
