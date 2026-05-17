import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, X, Globe, FileText, MapPin, Lightbulb, Command, Map, Castle, Route, Building2 } from 'lucide-react';

export function SearchModal() {
  const activeModal = useAppStore((s) => s.activeModal);
  const setActiveModal = useAppStore((s) => s.setActiveModal);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const worlds = useAppStore((s) =>
    s.worlds.filter((w) => !w.isDeleted && (!query || w.name.toLowerCase().includes(query.toLowerCase())))
  );
  const characters = useAppStore((s) => s.characters.filter((c) => !c.isDeleted && (!query || c.name.toLowerCase().includes(query.toLowerCase()))));
  const scenes = useAppStore((s) => s.scenes.filter((sc) => !sc.isDeleted && (!query || sc.title.toLowerCase().includes(query.toLowerCase()))));
  const places = useAppStore((s) => s.places.filter((p) => !p.isDeleted && (!query || p.name.toLowerCase().includes(query.toLowerCase()))));
  const mapsList = useAppStore((s) => s.maps.filter((m) => !query || m.name.toLowerCase().includes(query.toLowerCase())));
  const houses = useAppStore((s) =>
    s.houses.filter((h) => !h.isDeleted && (!query || h.name.toLowerCase().includes(query.toLowerCase()) || h.motto.toLowerCase().includes(query.toLowerCase())))
  );
  const plots = useAppStore((s) =>
    s.plots.filter((p) => !p.isDeleted && (!query || p.title.toLowerCase().includes(query.toLowerCase())))
  );
  const organizations = useAppStore((s) =>
    s.organizations.filter((o) => !o.isDeleted && (!query || o.name.toLowerCase().includes(query.toLowerCase())))
  );
  const ideas = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted && (!query || i.description.toLowerCase().includes(query.toLowerCase()))));

  useEffect(() => {
    if (activeModal === 'search') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeModal]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setActiveModal(activeModal === 'search' ? null : 'search');
      }
      if (e.key === 'Escape' && activeModal === 'search') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeModal, setActiveModal]);

  if (activeModal !== 'search') return null;

  const filters = [
    { id: 'all', label: 'Todo' },
    { id: 'worlds', label: 'Mundos' },
    { id: 'characters', label: 'Personajes' },
    { id: 'scenes', label: 'Escenas' },
    { id: 'places', label: 'Lugares' },
    { id: 'maps', label: 'Mapas' },
    { id: 'houses', label: 'Casas' },
    { id: 'plots', label: 'Tramas' },
    { id: 'organizations', label: 'Organizaciones' },
    { id: 'ideas', label: 'Ideas' },
  ];

  const hasResults =
    worlds.length +
      characters.length +
      scenes.length +
      places.length +
      mapsList.length +
      houses.length +
      plots.length +
      organizations.length +
      ideas.length >
    0;

  const handleNavigate = (path: string) => {
    navigate(path);
    setActiveModal(null);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4" onClick={() => setActiveModal(null)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl story-card overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-[#1E2230]">
          <Search size={18} className="text-[#5A6078] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar mundos, personajes, escenas, lugares..."
            className="flex-1 bg-transparent text-[#E8E9EB] placeholder:text-[#5A6078] outline-none text-base"
          />
          <div className="flex items-center gap-1 text-xs text-[#5A6078]">
            <Command size={12} />
            <span>K</span>
          </div>
          <button onClick={() => setActiveModal(null)} className="p-1 rounded hover:bg-[#1E2230]">
            <X size={16} className="text-[#5A6078]" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-1 p-3 border-b border-[#1E2230] overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filter === f.id ? 'bg-[#D61E2B] text-white' : 'bg-[#1E2230] text-[#8B91A7] hover:text-[#E8E9EB]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin p-3">
          {!query ? (
            <div className="text-center py-8 text-[#5A6078] text-sm">
              Escribe para buscar en tu universo creativo
            </div>
          ) : !hasResults ? (
            <div className="text-center py-8 text-[#5A6078] text-sm">No se encontraron resultados</div>
          ) : (
            <div className="space-y-1">
              {(filter === 'all' || filter === 'worlds') && worlds.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Mundos</p>
                  {worlds.map((w) => (
                    <button key={w.id} onClick={() => handleNavigate(`/world/${w.id}`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left">
                      <Globe size={16} className="text-[#3B82F6] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E9EB] truncate">{w.name}</p>
                        <p className="text-xs text-[#5A6078] truncate">{w.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(filter === 'all' || filter === 'characters') && characters.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Personajes</p>
                  {characters.map((c) => (
                    <button key={c.id} onClick={() => handleNavigate(`/world/${c.worldId}/character/${c.id}`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left">
                      <div className="w-7 h-7 rounded-full bg-[#1E2230] flex items-center justify-center flex-shrink-0 text-xs">{c.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E9EB] truncate">{c.name}</p>
                        <p className="text-xs text-[#5A6078] capitalize">{c.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(filter === 'all' || filter === 'scenes') && scenes.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Escenas</p>
                  {scenes.map((s) => (
                    <button key={s.id} onClick={() => handleNavigate(`/world/${s.worldId}/scene/${s.id}`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left">
                      <FileText size={16} className="text-[#22C55E] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E9EB] truncate">{s.title}</p>
                        <p className="text-xs text-[#5A6078] truncate">{s.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(filter === 'all' || filter === 'places') && places.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Lugares</p>
                  {places.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleNavigate(`/world/${p.worldId}/place/${p.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left"
                    >
                      <MapPin size={16} className="text-[#EAB308] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E9EB] truncate">{p.name}</p>
                        <p className="text-xs text-[#5A6078] capitalize">{p.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(filter === 'all' || filter === 'maps') && mapsList.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Mapas</p>
                  {mapsList.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleNavigate(`/world/${m.worldId}/map/${m.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left"
                    >
                      <Map size={16} className="text-[#38BDF8] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E9EB] truncate">{m.name}</p>
                        <p className="text-xs text-[#5A6078] truncate">{m.description || 'Mapa'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(filter === 'all' || filter === 'houses') && houses.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Casas</p>
                  {houses.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => handleNavigate(`/world/${h.worldId}?tab=houses`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left"
                    >
                      <Castle size={16} className="text-[#EAB308] flex-shrink-0" />
                      <motion.div className="flex-1 min-w-0" whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                        <p className="text-sm text-[#E8E9EB] truncate">{h.name}</p>
                        {h.motto && <p className="text-xs text-[#5A6078] truncate">{h.motto}</p>}
                      </motion.div>
                    </button>
                  ))}
                </div>
              )}

              {(filter === 'all' || filter === 'plots') && plots.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Tramas</p>
                  {plots.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleNavigate(`/world/${p.worldId}?tab=plots`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left"
                    >
                      <Route size={16} className="text-[#D61E2B] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E9EB] truncate">{p.title}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}

              {(filter === 'all' || filter === 'organizations') && organizations.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Organizaciones</p>
                  {organizations.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleNavigate(`/world/${o.worldId}?tab=organizations`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left"
                    >
                      <Building2 size={16} className="text-[#3B82F6] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E9EB] truncate">{o.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(filter === 'all' || filter === 'ideas') && ideas.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078] px-2 py-1">Ideas</p>
                  {ideas.map((i) => (
                    <button key={i.id} onClick={() => handleNavigate('/ideas')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1E2230] transition-all text-left">
                      <Lightbulb size={16} className="text-[#8B5CF6] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E8E9EB] truncate">{i.description}</p>
                        <p className="text-xs text-[#5A6078] capitalize">{i.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
