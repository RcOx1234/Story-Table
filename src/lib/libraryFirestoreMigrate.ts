import type { LibraryEntityCollection } from '@/lib/libraryFirestoreSchema';
import { LEGACY_ARRAY_KEYS, LIBRARY_SCHEMA_VERSION } from '@/lib/libraryFirestoreSchema';

export type LegacyStoryBundle = Record<string, unknown>;

/** Documento monolítico antiguo: arrays embebidos en el doc raíz. */
export function isLegacyMonolithicLibrary(data: Record<string, unknown> | null): boolean {
  if (!data) return false;
  if (data.schemaVersion === LIBRARY_SCHEMA_VERSION) return false;
  return LEGACY_ARRAY_KEYS.some((key) => Array.isArray(data[key]));
}

export function extractLegacyEntities(
  data: Record<string, unknown>
): Partial<Record<LibraryEntityCollection, unknown[]>> {
  const out: Partial<Record<LibraryEntityCollection, unknown[]>> = {};
  for (const key of LEGACY_ARRAY_KEYS) {
    const arr = data[key];
    if (Array.isArray(arr)) out[key] = arr;
  }
  return out;
}

export function extractLegacySettings(data: Record<string, unknown>): {
  characterOrderByWorld: Record<string, string[]>;
  dashboardWorldIds: string[];
} {
  const order = data.characterOrderByWorld;
  const dash = data.dashboardWorldIds;
  return {
    characterOrderByWorld:
      order && typeof order === 'object' && !Array.isArray(order)
        ? (order as Record<string, string[]>)
        : {},
    dashboardWorldIds: Array.isArray(dash) ? (dash as string[]) : [],
  };
}
