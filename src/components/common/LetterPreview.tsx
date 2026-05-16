import type { Component } from '@/types';

type Props = {
  component: Component;
};

export function LetterPreview({ component }: Props) {
  const to = component.letterTo || component.target || 'Destinatario';
  const from = component.letterFrom || '—';
  const date = component.letterDate || '';
  const salutation = component.letterSalutation || 'Estimado/a,';
  const body = component.description || '';
  const closing = component.letterClosing || 'Atentamente,';
  const signature = from !== '—' ? from : component.name;

  return (
    <div className="mx-auto max-w-lg">
      <div
        className="relative overflow-hidden rounded-sm shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        style={{
          background: 'linear-gradient(165deg, #f4efe4 0%, #e8dcc8 45%, #ddd0b8 100%)',
          boxShadow: 'inset 0 0 80px rgba(139,119,88,0.15)',
        }}
      >
        <div className="relative border-b border-[#c4b59a]/60 px-8 pb-4 pt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#6b5d48]">Carta</p>
          {date && <p className="mt-2 text-right text-xs italic text-[#5c4f3a]">{date}</p>}
        </div>
        <div className="relative space-y-4 px-8 py-6 font-serif text-[#2c2418]">
          <p className="text-sm">
            <span className="text-[#6b5d48]">Para:</span> {to}
          </p>
          {from !== '—' && (
            <p className="text-sm">
              <span className="text-[#6b5d48]">De:</span> {from}
            </p>
          )}
          <p className="pt-2 text-base leading-relaxed">{salutation}</p>
          <div className="min-h-[120px] whitespace-pre-wrap text-[15px] leading-[1.85] text-[#3d3428]">
            {body || <span className="italic text-[#8a7b66]">Sin contenido de la carta…</span>}
          </div>
          <div className="pt-4">
            <p className="text-base">{closing}</p>
            <p className="mt-6 font-medium italic text-[#4a3f32]">{signature}</p>
          </div>
        </div>
        <div className="h-3 bg-gradient-to-b from-[#ddd0b8] to-[#cfc2a8]" />
      </div>
    </div>
  );
}