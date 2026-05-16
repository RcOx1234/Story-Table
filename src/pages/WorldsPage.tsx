import { motion } from 'framer-motion';
import { WorldsGridSection } from '@/sections/WorldsGridSection';

export function WorldsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <WorldsGridSection variant="full" />
    </motion.div>
  );
}
