export type WorldType = 'single' | 'saga' | 'trilogy' | 'shared';

export interface World {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
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
  | 'other';

export interface Character {
  id: string;
  worldId: string;
  name: string;
  alias: string;
  role: CharacterRole;
  house: string;
  /** Casa vinculada del catálogo de casas del mundo. */
  houseId?: string;
  age: number;
  ageByTimeline: Record<string, number>;
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

export interface PlaceCollection {
  id: string;
  worldId: string;
  name: string;
  description: string;
  imageUrl: string;
  placeIds: string[];
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

/** Miembro de una casa con rol y vínculo jerárquico (árbol familiar). */
export interface HouseMember {
  characterId: string;
  role: string;
  /** characterId del padre/madre en el árbol (opcional). */
  parentCharacterId?: string;
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
  | 'timelines';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAuthenticated: boolean;
}
