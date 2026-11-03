import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <button type="button" className="mobile-menu-button rounded-xl p-2 text-white md:hidden" aria-label="Abrir navegación"><Menu size={22} /></button>
    </SheetTrigger>
    <SheetContent side="left" className="mobile-navigation gap-0 border-[#2A3045] bg-[#111318] p-0 text-[#E8E9EB]" aria-describedby="mobile-nav-description">
      <SheetTitle className="sr-only">Navegación de Story Table</SheetTitle>
      <SheetDescription id="mobile-nav-description" className="sr-only">Mundos, personajes, ideas y ajustes</SheetDescription>
      <Sidebar mobile onNavigate={() => setOpen(false)} />
    </SheetContent>
  </Sheet>;
}
