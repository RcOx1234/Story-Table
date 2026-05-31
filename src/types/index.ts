export type WorldType = 'single' | 'saga' | 'trilogy' | 'shared';

/** Tag reutilizable por mundo (catálogo global del mundo). */
export interface WorldTag {
  id: string;
  worldId: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface World {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  tagIds?: string[];
  /** Secciones visibles en la barra del mundo. Vacío = todas (mundos antiguos). */
  enabledSections?: SectionType[];
  /** Orden de pestañas en la barra del mundo. */
  sectionOrder?: SectionType[];
  /** Línea temporal principal del mundo (referencia para edades y estado). */
  mainTimelineId?: string;
  protected: boolean;
  /** @deprecated Usar passwordHash; se mantiene por compatibilidad con datos demo. */
  password?: string;
  passwordHash?: string;
  worldType?: WorldType;
  isFavorite: boolean;
  isPinned: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
}

export type CharacterRole =
  | 'protagonist'
  | 'antagonist'
  | 'secondary'
  | 'supporting'
  | 'extra'
  | 'king'
  | 'queen'
  | 'assassin'
  | 'prince'
  | 'princess'
  | 'noble'
  | 'commoner'
  | 'guard'
  | 'villain'
  | 'creature'
  | 'other';

export type CharacterGender = 'male' | 'female' | 'unspecified';

export type DeathCauseType =
  | 'natural'
  | 'murder'
  | 'suicide'
  | 'accident'
  | 'execution'
  | 'unknown'
  | 'other';

export interface CharacterDeathInfo {
  timelineId: string;
  causeType: DeathCauseType;
  customCause?: string;
  dateLabel?: string;
  notes?: string;
}

export interface CharacterExtraField {
  id: string;
  label: string;
  value: string;
  section?: 'identity' | 'story' | 'extra';
}

export interface Character {
  id: string;
  worldId: string;
  name: string;
  alias: string;
  /** Hombre, mujer o sin definir (legacy). Obligatorio al crear personajes nuevos. */
  gender?: CharacterGender;
  role: CharacterRole;
  house: string;
  /** Casa vinculada del catálogo de casas del mundo. */
  houseId?: string;
  age: number;
  /** Año de nacimiento (opcional); sirve para calcular edad por línea temporal. */
  birthYear?: number;
  /** Fecha de nacimiento legible (opcional). */
  birthDateLabel?: string;
  ageByTimeline: Record<string, number>;
  /** Cómo y cuándo murió por línea temporal (si aplica). */
  deathByTimeline?: Record<string, CharacterDeathInfo>;
  /** Campos personalizados (traumas, notas, etc.). */
  extraFields?: CharacterExtraField[];
  /** Estado del personaje por línea temporal (solo si hay líneas definidas). */
  statusByTimeline?: Record<string, Character['status']>;
  /** Revivió o reapareció en esta línea; desde aquí en adelante vuelve a estar vivo hasta otro cambio. */
  statusRecoveryByTimeline?: Record<string, boolean>;
  appearance: string;
  personality: string;
  backstory: string;
  goals: string;
  fears: string;
  powers: string;
  traumas?: string;
  breakingPoint?: string;
  relationships: Relationship[];
  images: string[];
  quotes: string[];
  arc: string;
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  tagIds?: string[];
}

export interface Relationship {
  characterId: string;
  characterName: string;
  type: string;
  description: string;
}

export type SceneImportance = 'low' | 'medium' | 'high' | 'unforgettable';

export interface Scene {
  id: string;
  worldId: string;
  title: string;
  description: string;
  content: string;
  characters: string[];
  placeId: string;
  placeName: string;
  timelineId: string;
  timelineName: string;
  emotionalIntensity: number;
  /** Etiqueta de estado emocional (p. ej. épica, nostálgica). */
  mood?: string;
  importance?: SceneImportance;
  /** Borrador: aún sin ubicar en la historia. */
  draft?: boolean;
  /** Orden dentro de la línea temporal (menor = más arriba). */
  timelineSortOrder?: number;
  music: string;
  dialogues: Dialogue[];
  reveals: string[];
  images: string[];
  video: string;
  audio: string;
  status: 'pending' | 'confirmed' | 'revision' | 'discarded' | 'important' | 'secret' | 'canon' | 'noncanon';
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Dialogue {
  characterName: string;
  text: string;
}

export interface Place {
  id: string;
  worldId: string;
  name: string;
  type:
    | 'city'
    | 'town'
    | 'kingdom'
    | 'forest'
    | 'mountain'
    | 'lake'
    | 'dungeon'
    | 'castle'
    | 'temple'
    | 'other';
  description: string;
  mapUrl: string;
  customs: string;
  symbols: string;
  population?: string;
  /** Lugar padre (p. ej. reino que contiene esta ciudad). */
  parentPlaceId?: string;
  /** Colección / carpeta de lugares (p. ej. “Maravillas de Mike”). */
  collectionId?: string;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type PlaceCollectionType =
  | 'kingdom'
  | 'country'
  | 'city'
  | 'region'
  | 'faction'
  | 'empire'
  | 'continent'
  | 'district'
  | 'custom';

export interface PlaceCollection {
  id: string;
  worldId: string;
  name: string;
  description: string;
  imageUrl: string;
  placeIds: string[];
  collectionType?: PlaceCollectionType;
  customCollectionType?: string;
  color?: string;
  relatedCharacterIds?: string[];
  relatedHouseIds?: string[];
  relatedOrganizationIds?: string[];
  notes?: string;
  tagIds?: string[];
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapCollection {
  id: string;
  worldId: string;
  name: string;
  description: string;
  imageUrl: string;
  mapIds: string[];
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapData {
  id: string;
  worldId: string;
  name: string;
  description?: string;
  imageUrl: string;
  markers: MapMarker[];
  isFavorite?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MapMarkerEntityType = 'place' | 'scene' | 'component' | 'organization' | 'note';

export interface MapMarker {
  id: string;
  x: number;
  y: number;
  placeId: string;
  placeName: string;
  note: string;
  type?: MapMarkerEntityType;
  label?: string;
  description?: string;
  sceneId?: string;
  componentId?: string;
  organizationId?: string;
  color?: string;
  icon?: string;
}

export type PlotType = 'main' | 'secondary' | 'character_arc' | 'org_arc';

export interface Plot {
  id: string;
  worldId: string;
  title: string;
  synopsis: string;
  plotType?: PlotType;
  characters: string[];
  relatedPlots: string[];
  relatedScenes?: string[];
  twists: string[];
  images: string[];
  status?: string;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Component {
  id: string;
  worldId: string;
  name: string;
  description: string;
  history: string;
  target: string;
  effect?: string;
  imageUrl?: string;
  /** Campos específicos para tipo carta */
  letterFrom?: string;
  letterTo?: string;
  letterDate?: string;
  letterSalutation?: string;
  letterClosing?: string;
  scenes: string[];
  type: 'object' | 'letter' | 'relic' | 'weapon' | 'artifact' | 'other';
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Organization {
  id: string;
  worldId: string;
  name: string;
  members: string[];
  goals: string;
  symbols: string;
  hierarchy: string;
  history?: string;
  imageUrl?: string;
  type: 'guild' | 'house' | 'brotherhood' | 'company' | 'clan' | 'order' | 'other';
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type NobleRank =
  | 'emperor'
  | 'king'
  | 'duke'
  | 'marquis'
  | 'count'
  | 'baron'
  | 'knight'
  | 'commoner'
  | 'other';

export type HouseMemberRole =
  | 'head'
  | 'heir'
  | 'consort'
  | 'blood'
  | 'adopted'
  | 'bastard'
  | 'servant'
  | 'guard'
  | 'ally'
  | 'other';

/** Miembro oficial de la casa (político / legal / narrativo). */
export interface HouseMember {
  characterId: string;
  role: HouseMemberRole | string;
  title?: string;
  branch?: string;
  successionOrder?: number | null;
  isFounder?: boolean;
  joinedAtTimelineId?: string | null;

  /** @deprecated Migrado a familyRelations / familyUnits */
  fatherId?: string | null;
  motherId?: string | null;
  adoptedParentIds?: string[];
  spouseIds?: string[];
  relationNote?: string;
  parentCharacterId?: string;
}

export type HouseFamilyConnectionType =
  | 'blood'
  | 'marriage'
  | 'adoption'
  | 'external'
  | 'alternate_timeline'
  | 'unknown';

/** Persona en el árbol (puede no ser miembro oficial). */
export interface HouseFamilyPerson {
  characterId: string;
  isHouseMember: boolean;
  connectionType: HouseFamilyConnectionType;
  displayLabel?: string;
  branch?: string;
  notes?: string;
  externalHouseName?: string;
}

export type HouseFamilyRelationType =
  | 'parent_child'
  | 'spouse'
  | 'ex_spouse'
  | 'partner'
  | 'adoptive_parent_child';

export interface HouseFamilyRelation {
  id: string;
  type: HouseFamilyRelationType;
  fromCharacterId: string;
  toCharacterId: string;
  timelineId?: string | null;
  timelineIds?: string[];
  familyUnitId?: string;
  notes?: string;
}

export interface HouseFamilyUnit {
  id: string;
  parentIds: string[];
  childIds: string[];
  relationType: 'biological' | 'adoptive' | 'unknown' | 'alternate';
  timelineId?: string | null;
  timelineIds?: string[];
  label?: string;
}

/** Casa o familia noble del mundo. */
export interface House {
  id: string;
  worldId: string;
  name: string;
  motto: string;
  description: string;
  imageUrl: string;
  coatOfArms?: string;
  nobleRank: NobleRank;
  /** 1 = menor influencia, 10 = máxima. */
  influenceLevel: number;
  parentHouseId?: string;
  lineage: string;
  symbols: string;
  territory?: string;
  members: HouseMember[];
  /** Personas visibles en el árbol (incluye externos). */
  familyPeople?: HouseFamilyPerson[];
  familyRelations?: HouseFamilyRelation[];
  familyUnits?: HouseFamilyUnit[];
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type WorldFactType =
  | 'battle'
  | 'treaty'
  | 'birth'
  | 'death'
  | 'discovery'
  | 'coronation'
  | 'betrayal'
  | 'catastrophe'
  | 'other';

/** Suceso histórico del mundo (no es escena narrativa). */
export interface WorldFact {
  id: string;
  worldId: string;
  title: string;
  description: string;
  consequence: string;
  factType: WorldFactType;
  timelineId?: string;
  /** Orden dentro de la línea temporal (menor = más arriba). */
  timelineSortOrder?: number;
  relatedCharacterIds: string[];
  relatedPlaceIds: string[];
  images: string[];
  dateLabel?: string;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type WorldDatumType =
  | 'geography'
  | 'culture'
  | 'religion'
  | 'magic'
  | 'politics'
  | 'economy'
  | 'biology'
  | 'technology'
  | 'other';

/** Dato canónico del mundo (hecho establecido del lore). */
export interface WorldDatum {
  id: string;
  worldId: string;
  title: string;
  content: string;
  datumType: WorldDatumType;
  images: string[];
  relatedCharacterIds: string[];
  relatedPlaceIds: string[];
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type IdeaStatus = 'pending' | 'organized';

export interface Idea {
  id: string;
  worldId: string | null;
  /** Personaje vinculado (p. ej. quién protagoniza la idea). */
  linkedCharacterId?: string | null;
  relatedCharacterIds?: string[];
  relatedPlaceIds?: string[];
  relatedSceneIds?: string[];
  relatedHouseIds?: string[];
  relatedOrganizationIds?: string[];
  description: string;
  type: 'scene' | 'character' | 'plot' | 'world' | 'dialogue' | 'lore' | 'other';
  references: string[];
  imageUrl?: string;
  audioUrl?: string;
  status?: IdeaStatus;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Timeline {
  id: string;
  worldId: string;
  name: string;
  description: string;
  order: number;
  startDate: string;
  endDate: string;
  color: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type FantasticElementCategory = 'power' | 'ability' | 'spell' | 'technique' | 'animal';

export interface FantasticElement {
  id: string;
  worldId: string;
  name: string;
  category: FantasticElementCategory;
  description: string;
  /** Nivel de poder / rareza */
  potency?: string;
  /** Elemento (fuego, sombra, etc.) */
  elementAffinity?: string;
  /** Alcance, duración, coste… */
  range?: string;
  duration?: string;
  cost?: string;
  /** Hechizos / técnicas */
  incantation?: string;
  requirements?: string;
  /** Animales */
  species?: string;
  habitat?: string;
  temperament?: string;
  isFictional?: boolean;
  imageUrl?: string;
  linkedCharacterIds?: string[];
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

/** Ámbito de carpetas manuales (no confundir con colecciones de lugares/mapas). */
export type EntityFolderScope =
  | 'character'
  | 'scene'
  | 'component'
  | 'organization'
  | 'worldFact'
  | 'worldDatum'
  | 'fantasticElement';

/** Carpeta manual con soporte de anidación y varios tipos de entidad. */
export interface EntityFolder {
  id: string;
  worldId: string;
  scope: EntityFolderScope;
  name: string;
  /** null = raíz de la sección */
  parentFolderId: string | null;
  itemIds: string[];
  /** Color del icono de carpeta (hex) */
  color?: string;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Migrado a EntityFolder con scope character */
export interface CharacterFolder {
  id: string;
  worldId: string;
  name: string;
  characterIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type SectionType =
  | 'characters'
  | 'places'
  | 'scenes'
  | 'plots'
  | 'maps'
  | 'components'
  | 'organizations'
  | 'houses'
  | 'datos'
  | 'hechos'
  | 'ideas'
  | 'timelines'
  | 'fantastic';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAuthenticated: boolean;
}
