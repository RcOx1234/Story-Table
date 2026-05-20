import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';

type Props = {
  text: string;
  worldId: string;
  lines?: 2 | 3;
  className?: string;
};

/** Vista previa compacta con inserciones para tarjetas y listas. */
export function RichTextSnippet({ text, worldId, lines = 2, className = '' }: Props) {
  if (!text?.trim()) return null;
  const clamp = lines === 3 ? 'line-clamp-3' : 'line-clamp-2';
  return (
    <div className={`${clamp} overflow-hidden text-xs text-[#8B91A7] ${className}`}>
      <StoryRichTextDisplay text={text} worldId={worldId} />
    </div>
  );
}
