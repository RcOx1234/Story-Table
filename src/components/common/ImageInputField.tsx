import { useRef, useState, useCallback } from 'react';
import { Upload, Link2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'url' | 'file';

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  hint?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(file);
  });
}

export function ImageInputField({ label = 'Imagen', value, onChange, required, hint }: Props) {
  const [mode, setMode] = useState<Mode>(() => (value.startsWith('data:') || !value ? 'file' : 'url'));
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Selecciona un archivo de imagen');
        return;
      }
      try {
        const url = await readFileAsDataUrl(file);
        onChange(url);
        setMode('file');
      } catch {
        toast.error('No se pudo cargar la imagen');
      }
    },
    [onChange]
  );

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await applyFile(file);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await applyFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-mono uppercase tracking-wider text-[#5A6078]">
          {label}
          {required && ' *'}
        </label>
        <div className="flex rounded-lg border border-[#2A3045] p-0.5">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium uppercase transition-all ${
              mode === 'file' ? 'bg-[#D61E2B] text-white' : 'text-[#5A6078] hover:text-[#E8E9EB]'
            }`}
          >
            <Upload size={10} /> Archivo
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium uppercase transition-all ${
              mode === 'url' ? 'bg-[#D61E2B] text-white' : 'text-[#5A6078] hover:text-[#E8E9EB]'
            }`}
          >
            <Link2 size={10} /> URL
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          value={value.startsWith('data:') ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          className="story-input w-full"
          placeholder="https://..."
        />
      ) : (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-all ${
              dragOver ? 'border-[#D61E2B] bg-[#D61E2B]/5' : 'border-[#2A3045] bg-[#111318] hover:border-[#5A6078]'
            }`}
          >
            <ImageIcon size={24} className="text-[#5A6078]" />
            <p className="text-center text-xs text-[#8B91A7]">
              Arrastra una imagen aquí o <span className="text-[#D61E2B]">haz clic para elegir</span>
            </p>
          </div>
        </>
      )}

      {value && (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-16 w-16 rounded-lg border border-[#2A3045] object-cover" />
          <button type="button" className="text-xs text-[#5A6078] hover:text-[#D61E2B]" onClick={() => onChange('')}>
            Quitar imagen
          </button>
        </div>
      )}

      {hint && <p className="text-[10px] text-[#5A6078]">{hint}</p>}
    </div>
  );
}