/** Escapa caracteres especiales para usar en RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Genera el siguiente nombre libre al duplicar: "Nombre", "Nombre 2", "Nombre 3", …
 */
export function nextDuplicateName(baseName: string, existingNames: string[]): string {
  const trimmed = baseName.trim() || 'Sin nombre';
  const numbered = trimmed.match(/^(.+?)\s+(\d+)$/);
  const root = numbered ? numbered[1].trim() : trimmed;
  const pattern = new RegExp(`^${escapeRegExp(root)}(?:\\s+(\\d+))?$`, 'i');

  let maxNum = 1;
  for (const name of existingNames) {
    const m = name.trim().match(pattern);
    if (!m) continue;
    const n = m[1] ? parseInt(m[1], 10) : 1;
    if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
  }

  return `${root} ${maxNum + 1}`;
}
