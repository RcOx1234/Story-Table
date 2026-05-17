import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MapPin,
  FileText,
  Route,
  Globe,
  Heart,
  ArrowLeft,
  Shield,
  Box,
  Building2,
  Lightbulb,
  Crown,
  Database,
  ScrollText,
  Landmark,
} from 'lucide-react';
import { CharactersSection } from '@/sections/CharactersSection';
import { ScenesSection } from '@/sections/ScenesSection';
import { PlacesSection } from '@/sections/PlacesSection';
import { TimelinesSection } from '@/sections/TimelinesSection';
import { PlotsSection } from '@/sections/PlotsSection';
import { OrganizationsSection } from '@/sections/OrganizationsSection';
import { ComponentsSection } from '@/sections/ComponentsSection';
import { WorldIdeasSection } from '@/sections/WorldIdeasSection';
import { WorldMapsSection } from '@/sections/WorldMapsSection';
import { HousesSection } from '@/sections/HousesSection';
import { FactsSection } from '@/sections/FactsSection';
import { DatosSection } from '@/sections/DatosSection';
import type { SectionType } from '@/types';
import { isWorldUnlocked } from '@/lib/worldUnlock';
import { WorldPasswordModal } from '@/components/modals/crud/WorldPasswordModal';

const tabs: { id: SectionType; label: string; icon: typeof Users }[] = [
  { id: 'characters', label: 'Personajes', icon: Users },
  { id: 'scenes', label: 'Escenas', icon: FileText },
  { id: 'places', label: 'Lugares', icon: MapPin },
  { id: 'plots', label: 'Tramas', icon: Route },
  { id: 'maps', label: 'Mapas', icon: Globe },
  { id: 'components', label: 'Componentes', icon: Box },
  { id: 'organizations', label: 'Organizaciones', icon: Building2 },
  { id: 'houses', label: 'Casas', icon: Crown },
  { id: 'datos', label: 'Datos', icon: Database },
  { id: 'hechos', label: 'Hechos', icon: ScrollText },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'timelines', label: 'Timeline', icon: Landmark },
];

export function WorldView() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const goBack = useNavigationReturn('/');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SectionType>('characters');
  const world = useAppStore((s) => s.getWorldById(worldId ?? ''));
  const toggleFavoriteWorld = useAppStore((s) => s.toggleFavoriteWorld);
  const [lockOpen, setLockOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab') as SectionType | null;
    if (t && tabs.some((x) => x.id === t)) setActiveTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!world || world.isDeleted) return;
    if (!world.protected) {
      setUnlocked(true);
      setLockOpen(false);
      return;
    }
    const ok = isWorldUnlocked(world.id);
    setUnlocked(ok);
    setLockOpen(!ok);
  }, [world?.id, world?.protected, world?.isDeleted]);

  if (!worldId || !world || world.isDeleted) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Globe size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <h2 className="mb-2 text-xl text-[#E8E9EB]">Mundo no encontrado</h2>
          <button type="button" onClick={() => navigate('/')} className="story-btn-primary text-sm">
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (world.protected && !unlocked) {
    return (
      <>
        <div className="flex h-[40vh] flex-col items-center justify-center gap-4">
          <Shield size={40} className="text-[#EAB308]" />
          <p className="text-[#8B91A7]">Este mundo está protegido.</p>
          <button type="button" className="story-btn-secondary text-sm" onClick={() => navigate('/')}>
            Volver al inicio
          </button>
        </div>
        <WorldPasswordModal
          open={lockOpen}
          world={world}
          onUnlocked={() => {
            setUnlocked(true);
            setLockOpen(false);
          }}
          onCancel={() => navigate('/')}
        />
      </>
    );
  }

  const selectTab = (id: SectionType) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="relative mb-6">
        <div className="relative mb-4 h-48 overflow-hidden rounded-2xl">
          {world.imageUrl ? (
            <img src={world.imageUrl} alt={world.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#1E2230] to-[#2A3045]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-[#0B0D10]/40 to-transparent" />

          <button
            type="button"
            onClick={goBack}
            className="absolute left-4 top-4 rounded-lg bg-black/40 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/60"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
                    {world.name}
                  </h1>
                  {world.protected && <Shield size={16} className="text-[#EAB308]" />}
                </div>
                <p className="line-clamp-2 max-w-2xl text-sm text-[#8B91A7]">{world.description}</p>
                <div className="mt-3 flex gap-2">
                  {world.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-black/30 px-2.5 py-1 text-xs uppercase tracking-wider text-[#8B91A7]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleFavoriteWorld(world.id)}
                  className="rounded-xl bg-black/40 p-2.5 backdrop-blur-sm transition-all hover:bg-[#D61E2B]/80"
                >
                  <Heart size={18} className={world.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-white'} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-[#1E2230] pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`story-tab flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'characters' && <CharactersSection worldId={world.id} />}
          {activeTab === 'scenes' && <ScenesSection worldId={world.id} />}
          {activeTab === 'places' && <PlacesSection worldId={world.id} />}
          {activeTab === 'timelines' && <TimelinesSection worldId={world.id} />}
          {activeTab === 'plots' && <PlotsSection worldId={world.id} />}
          {activeTab === 'organizations' && <OrganizationsSection worldId={world.id} />}
          {activeTab === 'components' && <ComponentsSection worldId={world.id} />}
          {activeTab === 'ideas' && <WorldIdeasSection worldId={world.id} />}
          {activeTab === 'maps' && <WorldMapsSection worldId={world.id} />}
          {activeTab === 'houses' && <HousesSection worldId={world.id} />}
          {activeTab === 'datos' && <DatosSection worldId={world.id} />}
          {activeTab === 'hechos' && <FactsSection worldId={world.id} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
