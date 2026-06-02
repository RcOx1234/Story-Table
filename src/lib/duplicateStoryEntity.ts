import type { AppState } from '@/store';
import type { StoryEntityType } from '@/lib/storyEntityContext';
import { nextDuplicateName } from '@/lib/duplicateEntityName';

export type DuplicateResult = { ok: true; newId: string; patch: Partial<AppState> } | { ok: false; reason: string };

function stamp<T extends { id: string; createdAt: string; updatedAt: string }>(
  base: T
): T {
  const now = new Date().toISOString();
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = base;
  return { ...rest, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as T;
}

export function duplicateStoryEntity(
  state: AppState,
  type: StoryEntityType,
  id: string
): DuplicateResult {
  switch (type) {
    case 'character': {
      const src = state.characters.find((c) => c.id === id && !c.isDeleted);
      if (!src) return { ok: false, reason: 'Personaje no encontrado' };
      const names = state.characters
        .filter((c) => c.worldId === src.worldId && !c.isDeleted)
        .map((c) => c.name);
      const copy = stamp({ ...src, name: nextDuplicateName(src.name, names), isFavorite: false });
      return { ok: true, newId: copy.id, patch: { characters: [...state.characters, copy] } };
    }
    case 'scene': {
      const src = state.scenes.find((s) => s.id === id && !s.isDeleted);
      if (!src) return { ok: false, reason: 'Escena no encontrada' };
      const names = state.scenes
        .filter((s) => s.worldId === src.worldId && !s.isDeleted)
        .map((s) => s.title);
      const copy = stamp({
        ...src,
        title: nextDuplicateName(src.title, names),
        isFavorite: false,
      });
      return { ok: true, newId: copy.id, patch: { scenes: [...state.scenes, copy] } };
    }
    case 'place': {
      const src = state.places.find((p) => p.id === id && !p.isDeleted);
      if (!src) return { ok: false, reason: 'Lugar no encontrado' };
      const names = state.places
        .filter((p) => p.worldId === src.worldId && !p.isDeleted)
        .map((p) => p.name);
      const copy = stamp({
        ...src,
        name: nextDuplicateName(src.name, names),
        isFavorite: false,
      });
      return { ok: true, newId: copy.id, patch: { places: [...state.places, copy] } };
    }
    case 'map': {
      const src = state.maps.find((m) => m.id === id && !m.isDeleted);
      if (!src) return { ok: false, reason: 'Mapa no encontrado' };
      const names = state.maps
        .filter((m) => m.worldId === src.worldId && !m.isDeleted)
        .map((m) => m.name);
      const copy = stamp({
        ...src,
        name: nextDuplicateName(src.name, names),
        markers: src.markers.map((mk) => ({ ...mk, id: crypto.randomUUID() })),
        isFavorite: false,
      });
      return { ok: true, newId: copy.id, patch: { maps: [...state.maps, copy] } };
    }
    case 'component': {
      const src = state.components.find((c) => c.id === id && !c.isDeleted);
      if (!src) return { ok: false, reason: 'Componente no encontrado' };
      const names = state.components
        .filter((c) => c.worldId === src.worldId && !c.isDeleted)
        .map((c) => c.name);
      const copy = stamp({
        ...src,
        name: nextDuplicateName(src.name, names),
        isFavorite: false,
      });
      return { ok: true, newId: copy.id, patch: { components: [...state.components, copy] } };
    }
    case 'organization': {
      const src = state.organizations.find((o) => o.id === id && !o.isDeleted);
      if (!src) return { ok: false, reason: 'Organización no encontrada' };
      const names = state.organizations
        .filter((o) => o.worldId === src.worldId && !o.isDeleted)
        .map((o) => o.name);
      const copy = stamp({
        ...src,
        name: nextDuplicateName(src.name, names),
        isFavorite: false,
      });
      return { ok: true, newId: copy.id, patch: { organizations: [...state.organizations, copy] } };
    }
    case 'plot': {
      const src = state.plots.find((p) => p.id === id && !p.isDeleted);
      if (!src) return { ok: false, reason: 'Trama no encontrada' };
      const names = state.plots
        .filter((p) => p.worldId === src.worldId && !p.isDeleted)
        .map((p) => p.title);
      const copy = stamp({
        ...src,
        title: nextDuplicateName(src.title, names),
        isFavorite: false,
      });
      return { ok: true, newId: copy.id, patch: { plots: [...state.plots, copy] } };
    }
    case 'idea': {
      const src = state.ideas.find((i) => i.id === id && !i.isDeleted);
      if (!src) return { ok: false, reason: 'Idea no encontrada' };
      const labels = state.ideas
        .filter((i) => i.worldId === src.worldId && !i.isDeleted)
        .map((i) => (i.description.split('\n')[0]?.trim() || 'Idea').slice(0, 80));
      const head = (src.description.split('\n')[0]?.trim() || 'Idea').slice(0, 80);
      const tail = src.description.slice(head.length);
      const copy = stamp({
        ...src,
        description: nextDuplicateName(head, labels) + tail,
        isFavorite: false,
      });
      return { ok: true, newId: copy.id, patch: { ideas: [...state.ideas, copy] } };
    }
    case 'fact': {
      const src = state.worldFacts.find((f) => f.id === id && !f.isDeleted);
      if (!src) return { ok: false, reason: 'Hecho no encontrado' };
      const names = state.worldFacts
        .filter((f) => f.worldId === src.worldId && !f.isDeleted)
        .map((f) => f.title);
      const copy = stamp({ ...src, title: nextDuplicateName(src.title, names) });
      return { ok: true, newId: copy.id, patch: { worldFacts: [...state.worldFacts, copy] } };
    }
    case 'datum': {
      const src = state.worldData.find((d) => d.id === id && !d.isDeleted);
      if (!src) return { ok: false, reason: 'Dato no encontrado' };
      const names = state.worldData
        .filter((d) => d.worldId === src.worldId && !d.isDeleted)
        .map((d) => d.title);
      const copy = stamp({ ...src, title: nextDuplicateName(src.title, names) });
      return { ok: true, newId: copy.id, patch: { worldData: [...state.worldData, copy] } };
    }
    case 'fantastic': {
      const src = state.fantasticElements.find((f) => f.id === id && !f.isDeleted);
      if (!src) return { ok: false, reason: 'Elemento no encontrado' };
      const names = state.fantasticElements
        .filter((f) => f.worldId === src.worldId && !f.isDeleted)
        .map((f) => f.name);
      const copy = stamp({
        ...src,
        name: nextDuplicateName(src.name, names),
        isFavorite: false,
      });
      return {
        ok: true,
        newId: copy.id,
        patch: { fantasticElements: [...state.fantasticElements, copy] },
      };
    }
    case 'timeline': {
      const src = state.timelines.find((t) => t.id === id && !t.isDeleted);
      if (!src) return { ok: false, reason: 'Línea temporal no encontrada' };
      const names = state.timelines
        .filter((t) => t.worldId === src.worldId && !t.isDeleted)
        .map((t) => t.name);
      const copy = stamp({ ...src, name: nextDuplicateName(src.name, names) });
      return { ok: true, newId: copy.id, patch: { timelines: [...state.timelines, copy] } };
    }
    case 'placeCollection': {
      const src = state.placeCollections.find((c) => c.id === id && !c.isDeleted);
      if (!src) return { ok: false, reason: 'Colección no encontrada' };
      const names = state.placeCollections
        .filter((c) => c.worldId === src.worldId && !c.isDeleted)
        .map((c) => c.name);
      const copy = stamp({
        ...src,
        name: nextDuplicateName(src.name, names),
        placeIds: [...src.placeIds],
      });
      return {
        ok: true,
        newId: copy.id,
        patch: { placeCollections: [...state.placeCollections, copy] },
      };
    }
    case 'mapCollection': {
      const src = state.mapCollections.find((c) => c.id === id && !c.isDeleted);
      if (!src) return { ok: false, reason: 'Colección no encontrada' };
      const names = state.mapCollections
        .filter((c) => c.worldId === src.worldId && !c.isDeleted)
        .map((c) => c.name);
      const copy = stamp({
        ...src,
        name: nextDuplicateName(src.name, names),
        mapIds: [...src.mapIds],
      });
      return {
        ok: true,
        newId: copy.id,
        patch: { mapCollections: [...state.mapCollections, copy] },
      };
    }
    case 'house':
      return { ok: false, reason: 'Las casas no se pueden duplicar desde aquí' };
    default:
      return { ok: false, reason: 'Tipo no soportado' };
  }
}

export const DUPLICATABLE_ENTITY_TYPES: StoryEntityType[] = [
  'character',
  'scene',
  'place',
  'map',
  'component',
  'organization',
  'plot',
  'idea',
  'fact',
  'datum',
  'fantastic',
  'timeline',
  'placeCollection',
  'mapCollection',
];
