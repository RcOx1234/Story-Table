import { Feather } from 'lucide-react';

export function SplashLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0D10]">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D61E2B] shadow-lg shadow-[#D61E2B]/25">
        <Feather size={30} className="text-white" />
      </div>
      <p className="text-sm text-[#8B91A7]" style={{ fontFamily: 'Montserrat' }}>
        Story Table
      </p>
      <p className="mt-1 text-xs text-[#5A6078]">Cargando…</p>
    </div>
  );
}
