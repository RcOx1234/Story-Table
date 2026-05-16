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
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
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
  type: 'guild' | 'house' | 'brotherhood' | 'company' | 'clan' | 'order' | 'other';
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
  | 'ideas'
  | 'timelines';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAuthenticated: boolean;
}
