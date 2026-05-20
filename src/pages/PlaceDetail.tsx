import { useParams } from 'react-router-dom';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MapPin, Edit2, Trash2, FileText, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EntityReference } from '@/components/common/EntityReference';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { PlaceFormModal } from '@/components/modals/crud/PlaceFormModal';
import { toast } from 'sonner';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';

const typeLabels: Record<string, string> = {
  city: 'Ciudad',
  town: 'Pueblo',
  kingdom: 'Reino',
  forest: 'Bosque',
  mountain: 'Montaña',
  dungeon: 'Mazmorra',
  castle: 'Castillo',
  temple: 'Templo',
  other: 'Otro',
};

export function PlaceDetail() {
  const { worldId = '', placeId = '' } = useParams<{ worldId: string; placeId: string }>();
  const goBack = useNavigationReturn(`/world/${worldId}`);
  const place = useAppStore((s) => s.places.find((p) => p.id === placeId));
  const updatePlace = useAppStore((s) => s.updatePlace);
  const toggleFav = useAppStore((s) => s.toggleFavoritePlace);
  const deletePlace = useAppStore((s) => s.deletePlace);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('edit') === '1') {
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const scenesHere = useAppStore((s) =>
    s.scenes.filter((sc) => sc.worldId === worldId && sc.placeId === placeId && !sc.isDeleted)
  );

  const charsHere = useAppStore((s) => {
    const ids = new Set(
      s.scenes
        .filter((sc) => sc.worldId === worldId && sc.placeId === placeId && !sc.isDeleted)
        .flatMap((sc) => sc.characters)
    );
    return s.characters.filter((c) => ids.has(c.id) && c.worldId === worldId && !c.isDeleted);
  });

  if (!place) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <MapPin size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="text-[#5A6078]">Lugar no encontrado</p>
        </div>
      </div>
    );
  }

  const sections = [
    { key: 'description', label: 'Descripción' },
    { key: 'customs', label: 'Costumbres' },
    { key: 'symbols', label: 'Símbolos' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-3xl"
      {...storyEntityDataAttrs('place', place.id, worldId, place.name)}
    >
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg p-2 transition-all hover:bg-[#1E2230]"
          >
            <ArrowLeft size={20} className="text-[#8B91A7]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#EAB308]" />
              <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-xs uppercase tracking-wider text-[#5A6078]">
                {typeLabels[place.type]}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
              {place.name}
            </h1>
            {place.population ? <p className="mt-1 text-sm text-[#5A6078]">Población: {place.population}</p> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleFav(place.id)}
            className="rounded-xl p-2.5 transition-all hover:bg-[#1E2230]"
            aria-label="Favorito"
          >
            <Heart size={18} className={place.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-xl p-2.5 text-[#5A6078] transition-all hover:bg-[#1E2230] hover:text-[#D61E2B]"
            aria-label="Eliminar lugar"
          >
            <Trash2 size={18} />
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="story-btn-secondary text-sm">
            <Edit2 size={14} /> Editar
          </button>
        </div>
      </div>

      {place.mapUrl && (
        <div className="story-card mb-6 overflow-hidden">
          <img src={place.mapUrl} alt={place.name} className="h-48 w-full object-cover" />
        </div>
      )}

      <div className="space-y-4">
        {sections.map(({ key, label }) => (
          <div key={key} className="story-card p-5">
            <h3 className="mb-2 font-mono text-sm font-semibold uppercase tracking-wider text-[#E8E9EB]">{label}</h3>
            <StoryRichTextDisplay
              text={(place[key as keyof typeof place] as string) ?? ''}
              worldId={worldId}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="story-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-[#E8E9EB]">
            <FileText size={14} className="text-[#D61E2B]" /> Escenas en este lugar
          </h3>
          {scenesHere.length === 0 ? (
            <p className="text-sm text-[#5A6078]">Ninguna escena vinculada</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {scenesHere.map((sc) => (
                <EntityReference key={sc.id} type="scene" id={sc.id} worldId={worldId} label={sc.title} />
              ))}
            </div>
          )}
        </div>
        <div className="story-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-[#E8E9EB]">
            <Users size={14} className="text-[#D61E2B]" /> Personajes relacionados
          </h3>
          {charsHere.length === 0 ? (
            <p className="text-sm text-[#5A6078]">Nadie aparece aquí aún</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {charsHere.map((c) => (
                <EntityReference key={c.id} type="character" id={c.id} worldId={worldId} label={c.name} />
              ))}
            </div>
          )}
        </div>
      </div>

      <PlaceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        worldId={worldId}
        initial={place}
        onSubmit={(data) => {
          updatePlace(place.id, data);
          toast.success('Lugar actualizado');
        }}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        message={`¿Enviar a la papelera el lugar «${place.name}»?`}
        onConfirm={() => {
          deletePlace(place.id);
          goBack();
        }}
      />
    </motion.div>
  );
}
