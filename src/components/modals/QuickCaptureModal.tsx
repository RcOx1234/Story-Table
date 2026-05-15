import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { X, Type, Mic, Image, Send, Square } from 'lucide-react';
import { toast } from 'sonner';
import type { Idea } from '@/types';

export function QuickCaptureModal() {
  const activeModal = useAppStore((s) => s.activeModal);
  const setActiveModal = useAppStore((s) => s.setActiveModal);
  const addIdea = useAppStore((s) => s.addIdea);
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));

  const [tab, setTab] = useState<'text' | 'audio' | 'image'>('text');
  const [text, setText] = useState('');
  const [ideaType, setIdeaType] = useState<Idea['type']>('scene');
  const [worldId, setWorldId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (activeModal !== 'quick-capture') return;
    setText('');
    setImagePreview(null);
    setImageDataUrl(null);
    setAudioDataUrl(null);
    setRecordMs(0);
    setRecording(false);
    setTab('text');
  }, [activeModal]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    },
    []
  );

  if (activeModal !== 'quick-capture') return null;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('No se pudo leer el archivo'));
      r.readAsDataURL(file);
    });

  const onImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen');
      return;
    }
    const url = await readFileAsDataUrl(file);
    setImageDataUrl(url);
    setImagePreview(url);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const r = new FileReader();
        r.onloadend = () => setAudioDataUrl(String(r.result));
        r.readAsDataURL(blob);
      };
      rec.start();
      setRecording(true);
      setRecordMs(0);
      timerRef.current = window.setInterval(() => setRecordMs((m) => m + 100), 100);
    } catch {
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const handleSave = () => {
    const desc =
      text.trim() ||
      (tab === 'image' && imageDataUrl ? 'Idea con imagen adjunta' : '') ||
      (tab === 'audio' && audioDataUrl ? 'Nota de voz' : '');
    if (!desc && !imageDataUrl && !audioDataUrl) {
      toast.error('Añade texto, imagen o audio');
      return;
    }
    addIdea({
      worldId,
      description: desc || '(captura)',
      type: ideaType,
      references: [],
      imageUrl: imageDataUrl ?? undefined,
      audioUrl: audioDataUrl ?? undefined,
      status: 'pending',
      isFavorite: false,
      isDeleted: false,
      tags: [],
    });
    toast.success('Idea guardada');
    setText('');
    setImagePreview(null);
    setImageDataUrl(null);
    setAudioDataUrl(null);
    setActiveModal(null);
  };

  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-white/10 bg-[#0A0A0A] shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-center justify-between border-b border-[#1E2230] p-5">
          <h2 className="text-lg font-semibold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Captura Rápida
          </h2>
          <button type="button" aria-label="Cerrar" onClick={() => setActiveModal(null)} className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]">
            <X size={18} className="text-[#5A6078]" />
          </button>
        </div>

        <div className="flex border-b border-[#1E2230]">
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
              tab === 'text' ? 'border-b-2 border-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'
            }`}
          >
            <Type size={14} /> Texto
          </button>
          <button
            type="button"
            onClick={() => setTab('audio')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
              tab === 'audio' ? 'border-b-2 border-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'
            }`}
          >
            <Mic size={14} /> Audio
          </button>
          <button
            type="button"
            onClick={() => setTab('image')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
              tab === 'image' ? 'border-b-2 border-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'
            }`}
          >
            <Image size={14} /> Imagen
          </button>
        </div>

        <div className="p-5">
          {tab === 'text' && (
            <div className="space-y-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe tu idea aquí..."
                className="story-input h-32 w-full resize-none"
                autoFocus
              />
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-4 py-4 text-center">
              {!recording ? (
                <button type="button" onClick={() => void startRecording()} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#1E2230] transition-all hover:bg-[#252A3C]">
                  <Mic size={28} className="text-[#5A6078]" />
                </button>
              ) : (
                <button type="button" onClick={stopRecording} className="mx-auto flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-[#D61E2B]">
                  <Square size={24} className="text-white" />
                </button>
              )}
              <p className="text-sm text-[#8B91A7]">{recording ? `Grabando ${fmt(recordMs)}` : 'Pulsa para grabar'}</p>
              {audioDataUrl && <audio controls src={audioDataUrl} className="mx-auto w-full" />}
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Notas sobre el audio (opcional)" className="story-input h-20 w-full resize-none" />
            </div>
          )}

          {tab === 'image' && (
            <div className="space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onImagePick(e)} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#2A3045] transition-colors hover:border-[#D61E2B]"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="max-h-36 max-w-full rounded-lg object-contain" />
                ) : (
                  <>
                    <Image size={32} className="mb-2 text-[#5A6078]" />
                    <p className="text-sm text-[#8B91A7]">Clic para elegir imagen</p>
                  </>
                )}
              </button>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Descripción (opcional)" className="story-input h-20 w-full resize-none" />
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-[#1E2230] pt-4 sm:flex-row sm:items-center">
            <select value={ideaType} onChange={(e) => setIdeaType(e.target.value as Idea['type'])} className="story-input text-sm sm:w-40">
              <option value="scene">Escena</option>
              <option value="character">Personaje</option>
              <option value="plot">Trama</option>
              <option value="dialogue">Diálogo</option>
              <option value="lore">Lore</option>
              <option value="other">Otro</option>
            </select>
            <select value={worldId || ''} onChange={(e) => setWorldId(e.target.value || null)} className="story-input flex-1 text-sm">
              <option value="">Bandeja de ideas</option>
              {worlds.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleSave} className="story-btn-primary flex-1 justify-center sm:flex-initial">
              <Send size={14} /> Guardar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
