import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MapPin, Edit2, Save, Trash2, FileText, Users } from 'lucide-react';
import { useState } from 'react';
import type { Place } from '@/types';
import { EntityReference } from '@/components/common/EntityReference';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';

const typeLabels: Record<string, string> = {
  city: 'Ciudad', town: 'Pueblo', kingdom: 'Reino', forest: 'Bosque',
  mountain: 'Montaña', dungeon: 'Mazmorra', castle: 'Castillo', temple: 'Templo', other: 'Otro',
};

export function PlaceDetail() {
  const { worldId = '', placeId = '' } = useParams<{ worldId: string; placeId: string }>();
  const navigate = useNavigate();
  const place = useAppStore((s) => s.places.find((p) => p.id === placeId));
  const updatePlace = useAppStore((s) => s.updatePlace);
  const toggleFav = useAppStore((s) => s.toggleFavoritePlace);
  const deletePlace = useAppStore((s) => s.deletePlace);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Place>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <MapPin size={48} className="text-[#2A3045] mx-auto mb-4" />
          <p className="text-[#5A6078]">Lugar no encontrado</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updatePlace(place.id, editData);
    setIsEditing(false);
  };

  const sections = [
    { key: 'description', label: 'Descripción' },
    { key: 'customs', label: 'Costumbres' },
    { key: 'symbols', label: 'Símbolos' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/world/${worldId}`)} className="p-2 rounded-lg hover:bg-[#1E2230] transition-all">
            <ArrowLeft size={20} className="text-[#8B91A7]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#EAB308]" />
              <span className="text-xs uppercase tracking-wider text-[#5A6078] bg-[#1E2230] px-2 py-0.5 rounded-full">{typeLabels[place.type]}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#E8E9EB] mt-1" style={{ fontFamily: 'Montserrat' }}>{place.name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => toggleFav(place.id)} className="p-2.5 rounded-xl hover:bg-[#1E2230] transition-all" aria-label="Favorito">
            <Heart size={18} className={place.isFavorite ? 'text-[#D61E2B] fill-[#D61E2B]' : 'text-[#5A6078]'} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="p-2.5 rounded-xl hover:bg-[#1E2230] transition-all text-[#5A6078] hover:text-[#D61E2B]"
            aria-label="Eliminar lugar"
          >
            <Trash2 size={18} />
          </button>
          <button type="button" onClick={() => { if (isEditing) handleSave(); setIsEditing(!isEditing); }} className="story-btn-secondary text-sm">
            {isEditing ? <><Save size={14} /> Guardar</> : <><Edit2 size={14} /> Editar</>}
          </button>
        </div>
      </div>

      {place.mapUrl && (
        <div className="story-card overflow-hidden mb-6">
          <img src={place.mapUrl} alt={place.name} className="w-full h-48 object-cover" />
        </div>
      )}

      <div className="space-y-4">
        {sections.map(({ key, label }) => (
          <div key={key} className="story-card p-5">
            <h3 className="text-sm font-semibold text-[#E8E9EB] font-mono uppercase tracking-wider mb-2">{label}</h3>
            {isEditing ? (
              <textarea
                value={editData[key as keyof Place] as string ?? place[key as keyof Place] as string}
                onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                className="story-input w-full h-24 text-sm"
              />
            ) : (
              <p className="text-sm text-[#8B91A7] whitespace-pre-wrap">{(place[key as keyof Place] as string) || <span className="text-[#3A4460]">Sin información</span>}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="story-card p-5">
          <h3 className="text-sm font-semibold text-[#E8E9EB] font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
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
          <h3 className="text-sm font-semibold text-[#E8E9EB] font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
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

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        message={`¿Enviar a la papelera el lugar «${place.name}»?`}
        onConfirm={() => {
          deletePlace(place.id);
          navigate(`/world/${worldId}`);
        }}
      />
    </motion.div>
  );
}
