import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Heart, Globe, Users, FileText, MapPin, Map as MapIcon, ArrowLeft } from 'lucide-react';

type FavItem =
  | { type: 'world'; data: { id: string; name: string }; icon: typeof Globe; color: string }
  | { type: 'character'; data: { id: string; worldId: string; name: string }; icon: typeof Users; color: string }
  | { type: 'scene'; data: { id: string; worldId: string; title: string }; icon: typeof FileText; color: string }
  | { type: 'place'; data: { id: string; worldId: string; name: string }; icon: typeof MapPin; color: string }
  | { type: 'map'; data: { id: string; worldId: string; name: string }; icon: typeof MapIcon; color: string };

export function FavoritesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const favorites = useAppStore((s) => s.getFavorites());

  const filters = [
    { id: 'all', label: 'Todos' },
    { id: 'worlds', label: 'Mundos' },
    { id: 'characters', label: 'Personajes' },
    { id: 'scenes', label: 'Escenas' },
    { id: 'places', label: 'Lugares' },
    { id: 'maps', label: 'Mapas' },
  ];

  const allItems: FavItem[] = [
    ...favorites.worlds.map((w) => ({ type: 'world' as const, data: w, icon: Globe, color: '#3B82F6' })),
    ...favorites.characters.map((c) => ({ type: 'character' as const, data: c, icon: Users, color: '#22C55E' })),
    ...favorites.scenes.map((s) => ({ type: 'scene' as const, data: s, icon: FileText, color: '#EAB308' })),
    ...favorites.places.map((p) => ({ type: 'place' as const, data: p, icon: MapPin, color: '#8B5CF6' })),
    ...favorites.maps.map((m) => ({ type: 'map' as const, data: m, icon: MapIcon, color: '#38BDF8' })),
  ];

  const filtered =
    activeFilter === 'all'
      ? allItems
      : allItems.filter((item) => `${item.type}s` === activeFilter);

  const go = (item: FavItem) => {
    switch (item.type) {
      case 'world':
        navigate(`/world/${item.data.id}`);
        break;
      case 'character':
        navigate(`/world/${item.data.worldId}/character/${item.data.id}`);
        break;
      case 'scene':
        navigate(`/world/${item.data.worldId}/scene/${item.data.id}`);
        break;
      case 'place':
        navigate(`/world/${item.data.worldId}/place/${item.data.id}`);
        break;
      case 'map':
        navigate(`/world/${item.data.worldId}/map/${item.data.id}`);
        break;
      default:
        break;
    }
  };

  const labelFor = (item: FavItem) => {
    if (item.type === 'scene') return item.data.title;
    return item.data.name;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-[#1E2230] transition-all">
          <ArrowLeft size={20} className="text-[#8B91A7]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Favoritos
          </h1>
          <p className="text-sm text-[#5A6078]">{allItems.length} elementos favoritos</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === f.id ? 'bg-[#D61E2B] text-white' : 'bg-[#1E2230] text-[#8B91A7]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={48} className="text-[#2A3045] mx-auto mb-4" />
          <p className="text-[#5A6078]">No tienes favoritos aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, i) => (
            <motion.div
              key={`${item.type}-${item.data.id}`}
              role="button"
              tabIndex={0}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => go(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  go(item);
                }
              }}
              className="story-card p-4 flex items-center gap-4 cursor-pointer hover:bg-[#1A1E28] transition-all"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${item.color}15` }}
              >
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#E8E9EB] truncate">{labelFor(item)}</p>
                <p className="text-xs text-[#5A6078] capitalize">{item.type}</p>
              </div>
              <Heart size={14} className="text-[#D61E2B] fill-[#D61E2B] flex-shrink-0" />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
