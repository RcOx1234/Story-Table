import { useCallback, useEffect, useState, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';

type Props = {
  images: string[];
  alt?: string;
  className?: string;
};

/** Galería de imágenes de entidad: una imagen grande centrada o carrusel si hay varias. */
export function StoryEntityImageGallery({ images, alt = '', className = '' }: Props) {
  const urls = images.filter(Boolean).slice(0, 4);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: urls.length > 1 });
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <div className={`flex justify-center ${className}`}>
        <img
          src={urls[0]}
          alt={alt}
          className="max-h-72 w-full max-w-md rounded-xl border border-[#2A3045] object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={emblaRef} className="overflow-hidden rounded-xl border border-[#2A3045]">
        <div className="flex">
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="min-w-0 flex-[0_0_100%]">
              <img src={url} alt={alt} className="max-h-72 w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label="Imagen anterior"
        className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#2A3045] bg-[#151820]/90 text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
        onClick={() => emblaApi?.scrollPrev()}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        aria-label="Imagen siguiente"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#2A3045] bg-[#151820]/90 text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
        onClick={() => emblaApi?.scrollNext()}
      >
        <ChevronRight size={16} />
      </button>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {urls.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-4 bg-[#D61E2B]' : 'w-1.5 bg-[#2A3045]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

type PlaceholderProps = {
  icon?: ReactNode;
  className?: string;
};

/** Marcador visual cuando una tarjeta no tiene imagen. */
export function StoryCardImagePlaceholder({ icon, className = '' }: PlaceholderProps) {
  return (
    <div
      className={`mb-2 flex h-20 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#2A3045]/80 bg-[#111318]/80 ${className}`}
    >
      {icon ?? <ImageIcon size={28} className="text-[#2A3045]" strokeWidth={1.25} />}
    </div>
  );
}
