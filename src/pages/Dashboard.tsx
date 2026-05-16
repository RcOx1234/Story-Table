import { useNavigate } from 'react-router-dom';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { AudioPlayer } from '@/components/common/AudioPlayer';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Globe, Users, FileText, Lightbulb, ArrowRight } from 'lucide-react';
import { WorldsGridSection } from '@/sections/WorldsGridSection';

export function Dashboard() {
  const navigate = useNavigate();
  const navigateWithReturn = useNavigateWithReturn();
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const characters = useAppStore((s) => s.characters.filter((c) => !c.isDeleted));
  const scenes = useAppStore((s) => s.scenes.filter((sc) => !sc.isDeleted));
  const ideas = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted && !i.worldId));

  const stats = [
    { label: 'Mundos Activos', value: worlds.length, icon: Globe, color: '#D61E2B' },
    { label: 'Personajes', value: characters.length, icon: Users, color: '#3B82F6' },
    { label: 'Escenas', value: scenes.length, icon: FileText, color: '#22C55E' },
    { label: 'Ideas Libres', value: ideas.length, icon: Lightbulb, color: '#EAB308' },
  ];

  const recentIdeas = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted && !i.worldId).slice(0, 5));
  const favCharacters = useAppStore((s) => s.characters.filter((c) => c.isFavorite && !c.isDeleted).slice(0, 6));

  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="story-card flex items-center gap-4 p-5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${stat.color}15` }}
            >
              <stat.icon size={22} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#E8E9EB]">{stat.value}</p>
              <p className="text-xs uppercase tracking-wider text-[#5A6078]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <WorldsGridSection variant="dashboard" />

      {recentIdeas.length > 0 && (
        <div className="story-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-[#EAB308]" />
              <h3 className="font-semibold text-[#E8E9EB]">Ideas Sin Organizar</h3>
              <span className="rounded-full bg-[#EAB308]/10 px-2 py-0.5 text-xs text-[#EAB308]">{ideas.length}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/ideas')}
              className="flex items-center gap-1 text-xs text-[#8B91A7] transition-colors hover:text-[#D61E2B]"
            >
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recentIdeas.map((idea) => (
              <div
                key={idea.id}
                onClick={() => navigate('/ideas')}
                className="group flex cursor-pointer items-center gap-3 rounded-lg bg-[#0B0D10]/50 p-3 transition-all hover:bg-[#1E2230]"
              >
                {idea.imageUrl ? (
                  <img src={idea.imageUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#1E2230]">
                    <Lightbulb size={14} className="text-[#5A6078]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#E8E9EB]">{idea.description}</p>
                  {idea.audioUrl && <AudioPlayer src={idea.audioUrl} compact className="mt-1 max-w-[200px]" />}
                </div>
                <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-xs text-[#5A6078]">{idea.type}</span>
                <span className="text-xs text-[#5A6078]">{new Date(idea.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {favCharacters.length > 0 && (
        <div>
          <h2 className="mb-5 text-xl font-semibold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Personajes Favoritos
          </h2>
          <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-2">
            {favCharacters.map((char) => (
              <div
                key={char.id}
                onClick={() => navigateWithReturn(`/world/${char.worldId}/character/${char.id}`)}
                className="group w-36 flex-shrink-0 cursor-pointer story-card p-4 transition-all hover:border-[#D61E2B]"
              >
                <div className="mx-auto mb-3 h-14 w-14 overflow-hidden rounded-full bg-[#1E2230]">
                  {char.images[0] ? (
                    <img src={char.images[0]} alt={char.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#8B91A7]">
                      {char.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="truncate text-center text-sm font-medium text-[#E8E9EB]">{char.name}</p>
                <p className="text-center text-xs capitalize text-[#5A6078]">{char.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
