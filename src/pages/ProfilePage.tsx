import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, Save, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { updateAccountProfile } from '@/services/authService';
import { uploadFileToUserPath } from '@/services/storageService';

export function ProfilePage() {
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initial = user?.displayName?.charAt(0)?.toUpperCase() || 'U';

  const saveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('Escribe un nombre');
      return;
    }
    setSaving(true);
    try {
      if (isFirebaseConfigured()) {
        await updateAccountProfile({ displayName: displayName.trim() });
      }
      updateUser({ displayName: displayName.trim() });
      toast.success('Perfil actualizado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (file: File) => {
    if (!user?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen');
      return;
    }
    setUploadingPhoto(true);
    try {
      let photoURL = '';
      if (isFirebaseConfigured()) {
        const ext = file.name.split('.').pop() || 'jpg';
        photoURL = await uploadFileToUserPath(user.id, `perfil/avatar.${ext}`, file, file.type);
        await updateAccountProfile({ photoURL });
      } else {
        const reader = new FileReader();
        photoURL = await new Promise<string>((res, rej) => {
          reader.onload = () => res(String(reader.result));
          reader.onerror = () => rej(new Error('lectura'));
          reader.readAsDataURL(file);
        });
      }
      updateUser({ photoURL });
      toast.success('Foto de perfil actualizada');
    } catch {
      toast.error('No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D61E2B]/30 bg-[#D61E2B]/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
          <Sparkles size={12} /> Tu identidad en Story Table
        </p>
        <h1 className="text-3xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
          Perfil
        </h1>
      </div>

      <div className="story-card overflow-hidden p-0">
        <div className="h-28 bg-gradient-to-r from-[#D61E2B]/25 via-[#8B5CF6]/15 to-transparent" />
        <div className="relative px-8 pb-8">
          <div className="-mt-14 mb-6 flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="group relative h-28 w-28 rounded-full border-4 border-[#111318] bg-[#1E2230] shadow-xl transition-transform hover:scale-[1.02]"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#D61E2B]">
                  {initial}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={24} className="text-white" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void onPhoto(f);
              }}
            />
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                <User size={12} /> Nombre para mostrar
              </label>
              <input
                className="story-input w-full text-base"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre de autor"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                <Mail size={12} /> Email
              </label>
              <input
                className="story-input w-full text-base opacity-70"
                value={user?.email ?? ''}
                readOnly
                disabled
              />
              <p className="mt-1 text-[10px] text-[#5A6078]">El email no se puede cambiar desde aquí.</p>
            </div>

            <button
              type="button"
              className="story-btn-primary w-full sm:w-auto"
              disabled={saving}
              onClick={() => void saveProfile()}
            >
              <Save size={16} /> {saving ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
