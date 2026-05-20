import type { LucideIcon } from 'lucide-react';
import {
  Users,
  FileText,
  MapPin,
  Castle,
  Globe,
  Box,
  Building2,
  Route,
  Landmark,
  ScrollText,
  Database,
  Lightbulb,
  Sparkles,
} from 'lucide-react';

export type InsertionEntityType =
  | 'character'
  | 'scene'
  | 'place'
  | 'house'
  | 'map'
  | 'component'
  | 'organization'
  | 'plot'
  | 'timeline'
  | 'fact'
  | 'datum'
  | 'idea'
  | 'fantastic';

export const INSERTION_META: Record<
  InsertionEntityType,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  character: { label: 'Personaje', icon: Users, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  scene: { label: 'Escena', icon: FileText, color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  place: { label: 'Lugar', icon: MapPin, color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
  house: { label: 'Casa', icon: Castle, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  map: { label: 'Mapa', icon: Globe, color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  component: { label: 'Componente', icon: Box, color: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
  organization: { label: 'Organización', icon: Building2, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  plot: { label: 'Trama', icon: Route, color: '#D61E2B', bg: 'rgba(214,30,43,0.12)' },
  timeline: { label: 'Timeline', icon: Landmark, color: '#64748B', bg: 'rgba(100,116,139,0.15)' },
  fact: { label: 'Hecho', icon: ScrollText, color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  datum: { label: 'Dato', icon: Database, color: '#14B8A6', bg: 'rgba(20,184,166,0.12)' },
  idea: { label: 'Idea', icon: Lightbulb, color: '#EAB308', bg: 'rgba(234,179,8,0.15)' },
  fantastic: { label: 'Fantástico', icon: Sparkles, color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
};

export function insertionMeta(type: string) {
  return INSERTION_META[type as InsertionEntityType] ?? {
    label: type,
    icon: Box,
    color: '#8B91A7',
    bg: 'rgba(139,145,167,0.12)',
  };
}
