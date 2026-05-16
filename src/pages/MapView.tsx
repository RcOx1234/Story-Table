import { useParams } from 'react-router-dom';
import { useNavigationReturn, useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, ZoomIn, ZoomOut, Maximize, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { MarkerFormModal } from '@/components/modals/crud/MarkerFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import type { MapMarker } from '@/types';
import { toast } from 'sonner';
import { purgeMapStorage } from '@/lib/trashStorage';
import { isFirebaseConfigured } from '@/lib/firebase';

export function MapView() {
  const { worldId, mapId } = useParams<{ worldId: string; mapId: string }>();
  const goBack = useNavigationReturn(`/world/${worldId}`);
  const navigateWithReturn = useNavigateWithReturn();
  const mapData = useAppStore((s) => s.maps.find((m) => m.id === mapId));
  const updateMap = useAppStore((s) => s.updateMap);
  const deleteMap = useAppStore((s) => s.deleteMap);
  const getWorldById = useAppStore((s) => s.getWorldById);
  const user = useAppStore((s) => s.user);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [addMode, setAddMode] = useState(false);
  const [markerModal, setMarkerModal] = useState<{ initial?: MapMarker | null; coords: { x: number; y: number } | null }>({
    initial: null,
    coords: null,
  });
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [deleteMarkerId, setDeleteMarkerId] = useState<string | null>(null);
  const [confirmDeleteMap, setConfirmDeleteMap] = useState(false);

  const percentFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el || !mapData) return null;
      const rect = el.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 100;
      const ny = ((clientY - rect.top) / rect.height) * 100;
      return {
        x: Math.min(100, Math.max(0, nx)),
        y: Math.min(100, Math.max(0, ny)),
      };
    },
    [mapData]
  );

  if (!mapData || !worldId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <button type="button" onClick={goBack} className="rounded-lg p-2 transition-all hover:bg-[#1E2230]">
            <ArrowLeft size={20} className="text-[#8B91A7]" />
          </button>
          <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Mapa
          </h1>
        </div>
        <div className="story-card p-12 text-center">
          <MapPin size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="text-[#5A6078]">Mapa no encontrado</p>
          <button type="button" className="story-btn-primary mt-4 text-sm" onClick={goBack}>
            Volver al mundo
          </button>
        </div>
      </motion.div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (addMode) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (addMode || !dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addMode || !containerRef.current) return;
    const p = percentFromEvent(e.clientX, e.clientY);
    if (!p) return;
    setMarkerModal({ initial: null, coords: p });
    setAddMode(false);
  };

  const onMapTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!addMode || !containerRef.current) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const p = percentFromEvent(t.clientX, t.clientY);
    if (!p) return;
    setMarkerModal({ initial: null, coords: p });
    setAddMode(false);
  };

  const selectedMarker = mapData.markers.find((m) => m.id === selectedMarkerId);

  const saveMarker = (data: Omit<MapMarker, 'id'> & { id?: string }) => {
    if (data.id) {
      const next = mapData.markers.map((m) =>
        m.id === data.id
          ? {
              ...m,
              ...data,
              id: data.id,
            }
          : m
      );
      updateMap(mapData.id, { markers: next });
      toast.success('Marcador actualizado');
    } else {
      const newMarker: MapMarker = {
        id: crypto.randomUUID(),
        x: data.x,
        y: data.y,
        placeId: data.placeId ?? '',
        placeName: data.placeName ?? '',
        note: data.note ?? '',
        type: data.type,
        label: data.label,
        description: data.description,
        sceneId: data.sceneId,
        componentId: data.componentId,
        organizationId: data.organizationId,
        color: data.color,
        icon: data.icon,
      };
      updateMap(mapData.id, { markers: [...mapData.markers, newMarker] });
      toast.success('Marcador añadido');
    }
  };

  const removeMarker = (id: string) => {
    updateMap(mapData.id, { markers: mapData.markers.filter((m) => m.id !== id) });
    setSelectedMarkerId(null);
    toast.success('Marcador enviado a la historia — eliminado del mapa');
  };

  const labelFor = (m: MapMarker) => m.label || m.placeName || 'Marcador';

  const handleDeleteMap = async () => {
    if (!mapData || !worldId) return;
    const world = getWorldById(worldId);
    if (user?.id && world && isFirebaseConfigured()) {
      try {
        await purgeMapStorage(user.id, mapData, world);
      } catch {
        /* borrado local aunque falle Storage */
      }
    }
    deleteMap(mapData.id);
    toast.success('Mapa eliminado');
    setConfirmDeleteMap(false);
    goBack();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-[calc(100vh-120px)] flex-col">
      <div className="mb-4 flex flex-shrink-0 items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={goBack} className="rounded-lg p-2 transition-all hover:bg-[#1E2230]">
            <ArrowLeft size={20} className="text-[#8B91A7]" />
          </button>
          <h1 className="text-xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            {mapData.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAddMode((a) => !a);
              setSelectedMarkerId(null);
            }}
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-all ${addMode ? 'bg-[#D61E2B] text-white' : 'bg-[#1E2230] text-[#E8E9EB] hover:bg-[#252A3C]'}`}
          >
            <Plus size={16} /> {addMode ? 'Toca el mapa…' : 'Agregar marcador'}
          </button>
          <button type="button" onClick={() => setScale((s) => Math.min(s + 0.2, 3))} className="rounded-lg bg-[#1E2230] p-2 transition-all hover:bg-[#252A3C]">
            <ZoomIn size={16} className="text-[#E8E9EB]" />
          </button>
          <button type="button" onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))} className="rounded-lg bg-[#1E2230] p-2 transition-all hover:bg-[#252A3C]">
            <ZoomOut size={16} className="text-[#E8E9EB]" />
          </button>
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded-lg bg-[#1E2230] p-2 transition-all hover:bg-[#252A3C]"
          >
            <Maximize size={16} className="text-[#E8E9EB]" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteMap(true)}
            className="rounded-lg bg-[#1E2230] p-2 text-[#D61E2B] transition-all hover:bg-[#D61E2B]/20"
            aria-label="Eliminar mapa"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`story-card relative flex-1 overflow-hidden ${addMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={onMapClick}
        onTouchEnd={onMapTouchEnd}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 0.2s',
          }}
        >
          <img
            src={mapData.imageUrl}
            alt={mapData.name}
            className="pointer-events-none max-h-full max-w-full select-none object-contain"
            draggable={false}
          />

          {mapData.markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (addMode) return;
                setSelectedMarkerId(selectedMarkerId === marker.id ? null : marker.id);
              }}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transform"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full shadow-lg transition-all ${
                  selectedMarkerId === marker.id ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: marker.color || '#D61E2B' }}
              >
                <MapPin size={14} className="text-white" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedMarker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 flex-shrink-0 story-card p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#E8E9EB]">{labelFor(selectedMarker)}</p>
                <p className="text-xs uppercase tracking-wider text-[#5A6078]">{selectedMarker.type ?? 'note'}</p>
                <p className="mt-1 text-xs text-[#8B91A7]">{selectedMarker.description || selectedMarker.note || '—'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMarker.placeId && (
                  <button
                    type="button"
                    className="story-btn-secondary text-xs"
                    onClick={() => navigateWithReturn(`/world/${worldId}/place/${selectedMarker.placeId}`)}
                  >
                    <ExternalLink size={12} /> Lugar
                  </button>
                )}
                {selectedMarker.sceneId && (
                  <button
                    type="button"
                    className="story-btn-secondary text-xs"
                    onClick={() => navigateWithReturn(`/world/${worldId}/scene/${selectedMarker.sceneId}`)}
                  >
                    <ExternalLink size={12} /> Escena
                  </button>
                )}
                <button
                  type="button"
                  className="story-btn-secondary text-xs"
                  onClick={() => setMarkerModal({ initial: selectedMarker, coords: null })}
                >
                  <Pencil size={12} /> Editar
                </button>
                <button type="button" className="story-btn-secondary border-[#D61E2B]/40 text-xs text-[#D61E2B]" onClick={() => setDeleteMarkerId(selectedMarker.id)}>
                  <Trash2 size={12} /> Quitar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MarkerFormModal
        open={!!markerModal.coords || !!markerModal.initial}
        onClose={() => setMarkerModal({ initial: null, coords: null })}
        worldId={worldId}
        initial={markerModal.initial}
        coords={markerModal.initial ? null : markerModal.coords}
        onSubmit={saveMarker}
      />

      <ConfirmDeleteModal
        open={!!deleteMarkerId}
        onClose={() => setDeleteMarkerId(null)}
        title="Eliminar marcador"
        message="¿Quitar este marcador del mapa?"
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteMarkerId) removeMarker(deleteMarkerId);
        }}
      />

      <ConfirmDeleteModal
        open={confirmDeleteMap}
        onClose={() => setConfirmDeleteMap(false)}
        title="Eliminar mapa"
        message={`¿Eliminar "${mapData.name}" permanentemente? Se borrará también su imagen en Storage.`}
        confirmLabel="Eliminar mapa"
        onConfirm={() => void handleDeleteMap()}
      />
    </motion.div>
  );
}
