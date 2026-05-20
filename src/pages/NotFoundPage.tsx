import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Compass, Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0D10] px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-md text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#2A3045] bg-gradient-to-b from-[#151820] to-[#0B0D10]">
          <Compass size={36} className="text-[#D61E2B]" />
        </div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[#D61E2B]">404</p>
        <h1 className="mb-3 text-2xl font-semibold text-[#E8E9EB]">Esta página no existe en Story Table</h1>
        <p className="mb-8 text-sm leading-relaxed text-[#8B91A7]">
          La ruta que buscas no está en el mapa. Puede haber cambiado de nombre o el enlace estar incompleto.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="story-btn-primary inline-flex items-center gap-2 text-sm">
            <Home size={16} />
            Ir al inicio
          </Link>
          <Link to="/mundos" className="story-btn-secondary inline-flex items-center gap-2 text-sm">
            <BookOpen size={16} />
            Ver mundos
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
