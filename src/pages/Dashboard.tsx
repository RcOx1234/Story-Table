import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import {
  Globe,
  Users,
  FileText,
  Lightbulb,
  Heart,
  Plus,
  MoreVertical,
  Clock,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { sha256Hex } from '@/lib/password';
import type { World } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorldFormModal, type WorldFormValues } from '@/components/modals/crud/WorldFormModal';
import { WorldDetailModal } from '@/components/modals/crud/WorldDetailModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';

export function Dashboard() {
  const navigate = useNavigate();
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const characters = useAppStore((s) => s.characters.filter((c) => !c.isDeleted));
  const scenes = useAppStore((s) => s.scenes.filter((sc) => !sc.isDeleted));
  const ideas = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted && !i.worldId));
  const toggleFavoriteWorld = useAppStore((s) => s.toggleFavoriteWorld);
  const addWorld = useAppStore((s) => s.addWorld);
  const updateWorld = useAppStore((s) => s.updateWorld);
  const deleteWorld = useAppStore((s) => s.deleteWorld);
  const duplicateWorld = useAppStore((s) => s.duplicateWorld);

  const [worldModalOpen, setWorldModalOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
  const [detailWorld, setDetailWorld] = useState<World | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<World | null>(null);

  const stats = [
    { label: 'Mundos Activos', value: worlds.length, icon: Globe, color: '#D61E2B' },
    { label: 'Personajes', value: characters.length, icon: Users, color: '#3B82F6' },
    { label: 'Escenas', value: scenes.length, icon: FileText, color: '#22C55E' },
    { label: 'Ideas Libres', value: ideas.length, icon: Lightbulb, color: '#EAB308' },
  ];

  const recentIdeas = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted && !i.worldId).slice(0, 5));
  const favCharacters = useAppStore((s) => s.characters.filter((c) => c.isFavorite && !c.isDeleted).slice(0, 6));

  const buildWorldPayload = async (values: WorldFormValues, existing?: World | null) => {
    let passwordHash = existing?.passwordHash;
    let password = existing?.password;
    if (values.protected) {
      if (values.password) {
        passwordHash = await sha256Hex(values.password);
        password = undefined;
      } else if (!existing?.passwordHash && !existing?.password) {
        toast.error('La contraseña es obligatoria si proteges el mundo');
        return null;
      }
    } else {
      passwordHash = undefined;
      password = undefined;
    }

    const base: Omit<World, 'id' | 'createdAt' | 'updatedAt'> = {
      name: values.name,
      description: values.description,
      imageUrl: values.imageUrl,
      tags: values.tags,
      worldType: values.worldType,
      protected: values.protected,
      passwordHash,
      password,
      isFavorite: existing?.isFavorite ?? false,
      isPinned: existing?.isPinned ?? false,
      isDeleted: false,
    };
    return base;
  };

  const handleWorldSubmit = async (values: WorldFormValues) => {
    const payload = await buildWorldPayload(values, editingWorld);
    if (!payload) return;

    if (editingWorld) {
      updateWorld(editingWorld.id, payload);
      toast.success('Mundo actualizado');
      setEditingWorld(null);
    } else {
      addWorld(payload);
      toast.success('Mundo creado');
    }
    setWorldModalOpen(false);
  };

  const openCreateWorld = () => {
    setEditingWorld(null);
    setWorldModalOpen(true);
  };

  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="story-card flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
              <stat.icon size={22} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#E8E9EB]">{stat.value}</p>
              <p className="text-xs uppercase tracking-wider text-[#5A6078]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

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
                <p className="flex-1 truncate text-sm text-[#E8E9EB]">{idea.description}</p>
                <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-xs text-[#5A6078]">{idea.type}</span>
                <span className="text-xs text-[#5A6078]">{new Date(idea.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Mis Mundos
          </h2>
          <button type="button" onClick={openCreateWorld} className="story-btn-primary text-sm">
            <Plus size={16} /> Nuevo Mundo
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {worlds.map((world, i) => (
            <motion.div
              key={world.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="story-card group cursor-pointer overflow-hidden"
              onClick={() => navigate(`/world/${world.id}`)}
            >
                <div className="relative aspect-video overflow-hidden">
                  {world.imageUrl ? (
                    <img
                      src={world.imageUrl}
                      alt={world.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E2230] to-[#2A3045]">
                      <Globe size={48} className="text-[#3A4460]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151820] via-transparent to-transparent" />

                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label="Favorito"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteWorld(world.id);
                      }}
                      className="rounded-lg bg-black/40 p-2 backdrop-blur-sm transition-all hover:bg-[#D61E2B]/80"
                    >
                      <Heart size={14} className={world.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-white'} />
                    </button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Menú del mundo"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg bg-black/40 p-2 backdrop-blur-sm transition-all hover:bg-[#1E2230]/80"
                        >
                          <MoreVertical size={14} className="text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[200px] border-[#2A3045] bg-[#111318] text-[#E8E9EB]">
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-[#1E2230]"
                          onClick={(e) => {
                            e.preventDefault();
                            setDetailWorld(world);
                          }}
                        >
                          <Eye size={14} className="mr-2" /> Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-[#1E2230]"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingWorld(world);
                            setWorldModalOpen(true);
                          }}
                        >
                          Editar mundo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-[#1E2230]"
                          onClick={(e) => {
                            e.preventDefault();
                            const nid = duplicateWorld(world.id);
                            if (nid) toast.success('Mundo duplicado');
                          }}
                        >
                          Duplicar mundo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-[#1E2230]"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFavoriteWorld(world.id);
                          }}
                        >
                          {world.isFavorite ? 'Quitar favorito' : 'Marcar favorito'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-[#1E2230]"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingWorld(world);
                            setWorldModalOpen(true);
                          }}
                        >
                          Proteger con contraseña
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-[#1E2230]"
                          onClick={(e) => {
                            e.preventDefault();
                            toast.info('Exportación pendiente');
                          }}
                        >
                          Exportar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#2A3045]" />
                        <DropdownMenuItem
                          className="cursor-pointer text-[#D61E2B] focus:bg-[#D61E2B]/10"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteTarget(world);
                          }}
                        >
                          Eliminar a papelera
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailWorld(world);
                    }}
                    className="absolute bottom-16 left-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-mono uppercase text-[#E8E9EB] opacity-0 backdrop-blur-sm transition-opacity hover:bg-[#D61E2B]/80 group-hover:opacity-100"
                  >
                    Ver detalles
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="mb-1 text-lg font-semibold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
                      {world.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {world.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8B91A7]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t border-[#1E2230] px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#5A6078]">
                    <Users size={12} />
                    <span>{characters.filter((c) => c.worldId === world.id).length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#5A6078]">
                    <FileText size={12} />
                    <span>{scenes.filter((s) => s.worldId === world.id).length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#5A6078]">
                    <Clock size={12} />
                    <span>{new Date(world.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: worlds.length * 0.1 }}
            onClick={openCreateWorld}
            className="story-card flex aspect-[16/10] min-h-[200px] cursor-pointer flex-col items-center justify-center border-dashed border-[#3A4460] transition-all hover:border-[#D61E2B]"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2230] transition-all group-hover:bg-[#D61E2B]/10">
              <Plus size={24} className="text-[#5A6078]" />
            </div>
            <p className="text-sm text-[#5A6078]">Crear Nuevo Mundo</p>
          </motion.div>
        </div>
      </div>

      {favCharacters.length > 0 && (
        <div>
          <h2 className="mb-5 text-xl font-semibold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Personajes Favoritos
          </h2>
          <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-2">
            {favCharacters.map((char) => (
              <div
                key={char.id}
                onClick={() => navigate(`/world/${char.worldId}/character/${char.id}`)}
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

      <WorldFormModal
        open={worldModalOpen}
        onClose={() => {
          setWorldModalOpen(false);
          setEditingWorld(null);
        }}
        initialData={editingWorld ?? undefined}
        onSubmit={handleWorldSubmit}
      />

      <WorldDetailModal
        open={!!detailWorld}
        onClose={() => setDetailWorld(null)}
        world={detailWorld}
        onEdit={() => {
          if (!detailWorld) return;
          setEditingWorld(detailWorld);
          setWorldModalOpen(true);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar mundo"
        message={`¿Enviar “${deleteTarget?.name ?? ''}” y su contenido a la papelera?`}
        confirmLabel="Sí, eliminar"
        onConfirm={() => {
          if (deleteTarget) {
            deleteWorld(deleteTarget.id);
            toast.success('Mundo enviado a la papelera');
          }
        }}
      />
    </motion.div>
  );
}
