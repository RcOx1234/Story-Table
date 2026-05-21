import { useRef, useCallback, useState } from 'react';
import { ImageIcon, Link2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(file);
  });
}

function isLikelyImageUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('data:image/')) return false;
  if (u.startsWith('data:image/')) return true;
  return /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i.test(u) || u.includes('image') || true;
}

export function MultiImageInputField({ label = 'Imágenes', value, onChange, max = 12 }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState('');

  const applyFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (!list.length) {
        toast.error('Selecciona archivos de imagen');
        return;
      }
      const room = max - value.length;
      if (room <= 0) {
        toast.error(`Máximo ${max} imágenes`);
        return;
      }
      try {
        const urls: string[] = [];
        for (const file of list.slice(0, room)) {
          urls.push(await readFileAsDataUrl(file));
        }
        onChange([...value, ...urls]);
      } catch {
        toast.error('No se pudieron cargar las imágenes');
      }
    },
    [max, onChange, value]
  );

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (!isLikelyImageUrl(url)) {
      toast.error('Introduce una URL válida (http/https o data:image)');
      return;
    }
    if (value.length >= max) {
      toast.error(`Máximo ${max} imágenes`);
      return;
    }
    if (value.includes(url)) {
      toast.error('Esa imagen ya está añadida');
      return;
    }
    onChange([...value, url]);
    setUrlDraft('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-mono uppercase tracking-wider text-[#5A6078]">{label}</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void applyFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="flex gap-2">
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
          className="story-input min-w-0 flex-1 text-sm"
          placeholder="https://… (URL de imagen)"
        />
        <button type="button" className="story-btn-secondary shrink-0 px-2 py-1 text-xs" onClick={addUrl}>
          <Link2 size={12} className="inline" /> URL
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={`${url.slice(0, 24)}-${i}`} className="group relative">
            <img src={url} alt="" className="h-16 w-16 rounded-lg border border-[#2A3045] object-cover" />
            <button
              type="button"
              aria-label="Quitar imagen"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute -right-1 -top-1 rounded-full bg-[#D61E2B] p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X size={12} className="text-white" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-[#2A3045] bg-[#111318] text-[#5A6078] transition-all hover:border-[#D61E2B]"
          >
            <Plus size={14} />
            <span className="text-[8px] uppercase">Archivo</span>
          </button>
        )}
      </div>
      {value.length === 0 && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2A3045] bg-[#111318] px-4 py-4 transition-all hover:border-[#5A6078]"
        >
          <ImageIcon size={20} className="text-[#5A6078]" />
          <p className="text-center text-xs text-[#8B91A7]">Archivo, URL arriba, o arrastra imágenes</p>
        </button>
      )}
    </div>
  );
}
