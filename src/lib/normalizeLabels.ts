/** Clave estable sin tildes ni espacios extra. */
export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

const ROLE_ALIASES: Record<string, string> = {
  conyuge: 'consort',
  consorte: 'consort',
  esposo: 'consort',
  esposa: 'consort',
  pareja: 'partner',
  partner: 'partner',
  spouse: 'consort',
  external_spouse: 'external',
  cabeza: 'head',
  heredero: 'heir',
  heredera: 'heir',
  patriarca: 'head',
  matriarca: 'head',
  padre: 'blood',
  madre: 'blood',
  hijo: 'blood',
  hija: 'blood',
  bastardo: 'bastard',
  sirviente: 'servant',
};

export function normalizeRoleKey(value: string): string {
  const key = normalizeKey(value);
  return ROLE_ALIASES[key] ?? key;
}

const CONNECTION_ALIASES: Record<string, string> = {
  conyuge: 'marriage',
  consorte_externo: 'external',
  consorte_externa: 'external',
  esposo_externo: 'external',
  esposa_externa: 'external',
  hijo_externo: 'external',
  hija_externa: 'external',
  linea_alternativa: 'alternate_timeline',
  alterna: 'alternate_timeline',
};

export function normalizeConnectionType(value: string): string {
  const key = normalizeKey(value);
  return CONNECTION_ALIASES[key] ?? key;
}
