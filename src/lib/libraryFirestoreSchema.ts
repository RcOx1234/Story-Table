/** Versión del esquema Firestore (subcolecciones por entidad). */
export const LIBRARY_SCHEMA_VERSION = 2 as const;

export const LIBRARY_DOC_ID = 'biblioteca' as const;
export const LEGACY_LIBRARY_DOC_ID = 'library' as const;

/** Subcolecciones bajo `users/{uid}/storyTable/{libraryId}/`. */
export const LIBRARY_ENTITY_COLLECTIONS = [
  'worlds',
  'characters',
  'scenes',
  'places',
  'maps',
  'plots',
  'components',
  'organizations',
  'ideas',
  'timelines',
  'houses',
  'worldFacts',
  'worldData',
  'placeCollections',
  'mapCollections',
  'worldTags',
] as const;

export type LibraryEntityCollection = (typeof LIBRARY_ENTITY_COLLECTIONS)[number];

export type LibraryMetadata = {
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  schemaVersion: typeof LIBRARY_SCHEMA_VERSION;
  settings: {
    characterOrderByWorld: Record<string, string[]>;
    dashboardWorldIds: string[];
  };
  migratedAt?: string;
};

export const LEGACY_ARRAY_KEYS = [
  ...LIBRARY_ENTITY_COLLECTIONS,
] as const;
