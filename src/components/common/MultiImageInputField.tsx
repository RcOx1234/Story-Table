import { useRef, useCallback } from 'react';
import { ImageIcon, Plus, X } from 'lucide-react';
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

export function MultiImageInputField({ label = 'Imágenes', value, onChange, max = 12 }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

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
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={`${url.slice(0, 24)}-${i}`} className="group relative">
            <img src={url} alt="" className="h-20 w-20 rounded-lg border border-[#2A3045] object-cover" />
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
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#2A3045] bg-[#111318] text-[#5A6078] transition-all hover:border-[#D61E2B]"
          >
            <Plus size={16} />
            <span className="text-[9px] uppercase">Añadir</span>
          </button>
        )}
      </div>
      {value.length === 0 && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2A3045] bg-[#111318] px-4 py-5 transition-all hover:border-[#5A6078]"
        >
          <ImageIcon size={22} className="text-[#5A6078]" />
          <p className="text-center text-xs text-[#8B91A7]">Arrastra o haz clic para añadir fotos</p>
        </button>
      )}
    </div>
  );
}
