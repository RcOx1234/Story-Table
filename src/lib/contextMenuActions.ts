import type { DetectedEntity } from '@/lib/storyEntityContext';

export function entityEditPath(entity: DetectedEntity): string | null {
  const { type, id, worldId } = entity;
  if (!worldId) return null;
  switch (type) {
    case 'character':
      return `/world/${worldId}/character/${id}?edit=1`;
    case 'scene':
      return `/world/${worldId}/scene/${id}?edit=1`;
    case 'place':
      return `/world/${worldId}/place/${id}?edit=1`;
    case 'house':
      return `/world/${worldId}/house/${id}?edit=1`;
    case 'map':
      return `/world/${worldId}/map/${id}?edit=1`;
    case 'component':
      return `/world/${worldId}?tab=components&edit=${id}`;
    case 'organization':
      return `/world/${worldId}?tab=organizations&edit=${id}`;
    case 'plot':
      return `/world/${worldId}?tab=plots&edit=${id}`;
    case 'idea':
      return `/world/${worldId}?tab=ideas&edit=${id}`;
    case 'fact':
      return `/world/${worldId}?tab=hechos&edit=${id}`;
    case 'datum':
      return `/world/${worldId}?tab=datos&edit=${id}`;
    case 'fantastic':
      return `/world/${worldId}?tab=fantastic&edit=${id}`;
    case 'timeline':
      return `/world/${worldId}?tab=timelines&edit=${id}`;
    default:
      return null;
  }
}
