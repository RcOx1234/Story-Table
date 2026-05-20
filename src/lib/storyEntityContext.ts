import { useStore } from '@/store';

export type StoryEntityType =
  | 'character'
  | 'scene'
  | 'place'
  | 'house'
  | 'map'
  | 'component'
  | 'organization'
  | 'plot'
  | 'idea'
  | 'fact'
  | 'datum'
  | 'fantastic'
  | 'timeline';

export type DetectedEntity = {
  type: StoryEntityType;
  id: string;
  worldId: string;
  label: string;
};

const ROUTE_PATTERNS: { re: RegExp; type: StoryEntityType }[] = [
  { re: /^\/world\/([^/]+)\/character\/([^/]+)/, type: 'character' },
  { re: /^\/world\/([^/]+)\/scene\/([^/]+)/, type: 'scene' },
  { re: /^\/world\/([^/]+)\/place\/([^/]+)/, type: 'place' },
  { re: /^\/world\/([^/]+)\/house\/([^/]+)/, type: 'house' },
  { re: /^\/world\/([^/]+)\/map\/([^/]+)/, type: 'map' },
];

export function enrichEntityLabel(entity: DetectedEntity): DetectedEntity {
  if (entity.label) return entity;
  const s = useStore.getState();
  let label = '';
  switch (entity.type) {
    case 'character':
      label = s.getCharacterById(entity.id)?.name ?? '';
      break;
    case 'scene':
      label = s.scenes.find((x) => x.id === entity.id)?.title ?? '';
      break;
    case 'place':
      label = s.places.find((x) => x.id === entity.id)?.name ?? '';
      break;
    case 'house':
      label = s.houses.find((x) => x.id === entity.id)?.name ?? '';
      break;
    case 'map':
      label = s.maps.find((x) => x.id === entity.id)?.name ?? '';
      break;
    case 'component':
      label = s.components.find((x) => x.id === entity.id)?.name ?? '';
      break;
    case 'organization':
      label = s.organizations.find((x) => x.id === entity.id)?.name ?? '';
      break;
    case 'plot':
      label = s.plots.find((x) => x.id === entity.id)?.title ?? '';
      break;
    case 'idea':
      label = s.ideas.find((x) => x.id === entity.id)?.description.slice(0, 40) ?? '';
      break;
    case 'fact':
      label = s.worldFacts.find((x) => x.id === entity.id)?.title ?? '';
      break;
    case 'datum':
      label = s.worldData.find((x) => x.id === entity.id)?.title ?? '';
      break;
    case 'fantastic':
      label = s.fantasticElements.find((x) => x.id === entity.id)?.name ?? '';
      break;
    case 'timeline':
      label = s.timelines.find((x) => x.id === entity.id)?.name ?? '';
      break;
    default:
      break;
  }
  return { ...entity, label: label || 'Elemento' };
}

export function detectEntityFromRoute(pathname: string): DetectedEntity | null {
  for (const { re, type } of ROUTE_PATTERNS) {
    const m = pathname.match(re);
    if (m) {
      return enrichEntityLabel({ type, id: m[2], worldId: m[1], label: '' });
    }
  }
  return null;
}

export function detectEntityFromTarget(target: EventTarget | null): DetectedEntity | null {
  const el = (target as HTMLElement | null)?.closest?.('[data-story-entity]') as HTMLElement | null;
  if (el) {
    const type = el.dataset.storyEntity as StoryEntityType | undefined;
    const id = el.dataset.storyId;
    const worldId = el.dataset.storyWorldId ?? '';
    const label = el.dataset.storyLabel ?? '';
    if (type && id) {
      return enrichEntityLabel({ type, id, worldId, label });
    }
  }
  return detectEntityFromRoute(typeof window !== 'undefined' ? window.location.pathname : '');
}

export function detectEntityFromContext(target: EventTarget | null): DetectedEntity | null {
  return detectEntityFromTarget(target);
}

export function entityDetailPath(entity: DetectedEntity): string | null {
  const { worldId, type, id } = entity;
  if (!worldId || !id) return null;
  switch (type) {
    case 'character':
      return `/world/${worldId}/character/${id}`;
    case 'scene':
      return `/world/${worldId}/scene/${id}`;
    case 'place':
      return `/world/${worldId}/place/${id}`;
    case 'house':
      return `/world/${worldId}/house/${id}`;
    case 'map':
      return `/world/${worldId}/map/${id}`;
    default:
      return null;
  }
}

export function storyEntityDataAttrs(
  type: StoryEntityType,
  id: string,
  worldId: string,
  label: string
): Record<string, string> {
  return {
    'data-story-entity': type,
    'data-story-id': id,
    'data-story-world-id': worldId,
    'data-story-label': label,
  };
}
