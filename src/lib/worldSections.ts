import type { SectionType, World } from '@/types';

export const ALL_WORLD_SECTIONS: SectionType[] = [
  'characters',
  'scenes',
  'places',
  'plots',
  'maps',
  'components',
  'organizations',
  'houses',
  'datos',
  'hechos',
  'ideas',
  'timelines',
  'fantastic',
];

export const DEFAULT_NEW_WORLD_SECTIONS: SectionType[] = ['characters', 'scenes', 'places'];

/** Mundos sin configuración explícita muestran todas las secciones (compatibilidad). */
export function getWorldEnabledSections(world: World): SectionType[] {
  if (world.enabledSections?.length) return world.enabledSections;
  return ALL_WORLD_SECTIONS;
}

export function getWorldSectionOrder(world: World): SectionType[] {
  const enabled = getWorldEnabledSections(world);
  const order = world.sectionOrder?.filter((s) => enabled.includes(s)) ?? [];
  const missing = enabled.filter((s) => !order.includes(s));
  return [...order, ...missing];
}

export function isNewWorldDefaults(world: World): boolean {
  return (
    !world.enabledSections?.length &&
    !world.sectionOrder?.length &&
    new Date(world.createdAt).getTime() > Date.parse('2026-05-18')
  );
}

export function worldInitialSectionConfig(): Pick<World, 'enabledSections' | 'sectionOrder'> {
  return {
    enabledSections: [...DEFAULT_NEW_WORLD_SECTIONS],
    sectionOrder: [...DEFAULT_NEW_WORLD_SECTIONS],
  };
}
