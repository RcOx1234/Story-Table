import { BaseModal } from './BaseModal';
import { useNavigate } from 'react-router-dom';
import type { World } from '@/types';
import { Users, FileText, MapPin, Lightbulb, Clock } from 'lucide-react';
import { useAppStore } from '@/store';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';

type Props = {
  open: boolean;
  onClose: () => void;
  world: World | null;
  onEdit: () => void;
};

export function WorldDetailModal({ open, onClose, world, onEdit }: Props) {
  const navigate = useNavigate();
  const characters = useAppStore((s) => s.characters.filter((c) => !c.isDeleted && c.worldId === world?.id));
  const scenes = useAppStore((s) => s.scenes.filter((sc) => !sc.isDeleted && sc.worldId === world?.id));
  const places = useAppStore((s) => s.places.filter((p) => !p.isDeleted && p.worldId === world?.id));
  const ideas = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted && i.worldId === world?.id));

  if (!world) return null;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={world.name}
      description="Resumen del mundo"
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="story-btn-secondary text-sm">
            Cerrar
          </button>
          <button type="button" onClick={() => { onEdit(); onClose(); }} className="story-btn-secondary text-sm">
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/world/${world.id}`);
            }}
            className="story-btn-primary text-sm"
          >
            Entrar al mundo
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {world.description?.trim() ? (
          <StoryRichTextDisplay text={world.description} worldId={world.id} className="text-[#8B91A7]" />
        ) : (
          <p className="text-sm text-[#5A6078]">Sin descripción.</p>
        )}
        {world.imageUrl && (
          <div className="aspect-video overflow-hidden rounded-2xl border border-white/10">
            <img src={world.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {world.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-[#2A3045] bg-[#111318] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#8B91A7]">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-[#111318] p-3 text-center">
            <Users size={16} className="mx-auto mb-1 text-[#D61E2B]" />
            <p className="text-lg font-bold text-[#E8E9EB]">{characters.length}</p>
            <p className="text-[10px] uppercase text-[#5A6078]">Personajes</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#111318] p-3 text-center">
            <FileText size={16} className="mx-auto mb-1 text-[#22C55E]" />
            <p className="text-lg font-bold text-[#E8E9EB]">{scenes.length}</p>
            <p className="text-[10px] uppercase text-[#5A6078]">Escenas</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#111318] p-3 text-center">
            <MapPin size={16} className="mx-auto mb-1 text-[#EAB308]" />
            <p className="text-lg font-bold text-[#E8E9EB]">{places.length}</p>
            <p className="text-[10px] uppercase text-[#5A6078]">Lugares</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#111318] p-3 text-center">
            <Lightbulb size={16} className="mx-auto mb-1 text-[#8B5CF6]" />
            <p className="text-lg font-bold text-[#E8E9EB]">{ideas.length}</p>
            <p className="text-[10px] uppercase text-[#5A6078]">Ideas</p>
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-[#5A6078]">
          <Clock size={14} /> Última actualización: {new Date(world.updatedAt).toLocaleString()}
        </p>
      </div>
    </BaseModal>
  );
}
