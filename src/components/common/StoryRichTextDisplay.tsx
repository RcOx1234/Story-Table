import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseStorySegments } from '@/lib/storyRichText';
import { storyRefPath } from '@/lib/storyInsertionCatalog';
import { opensInPlacePreview } from '@/lib/storyInsertionPreview';
import { useAppStore } from '@/store';
import { StoryInsertionChip } from '@/components/common/StoryInsertionChip';

type Props = {
  text: string;
  worldId?: string;
  className?: string;
  /** Chips más legibles sobre fondos claros (cartas). */
  onLightSurface?: boolean;
};

function formatInline(line: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = line;
  let i = 0;

  const take = (re: RegExp, wrap: (inner: string, k: number) => ReactNode) => {
    const m = re.exec(rest);
    if (!m || m.index === undefined) return false;
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    nodes.push(wrap(m[1], i++));
    rest = rest.slice(m.index + m[0].length);
    return true;
  };

  while (rest.length > 0) {
    const before = rest;
    if (take(/\*\*(.+?)\*\*/, (inner, k) => <strong key={`${keyPrefix}-b${k}`}>{inner}</strong>)) continue;
    if (take(/__(.+?)__/, (inner, k) => (
      <u key={`${keyPrefix}-u${k}`} className="decoration-[#8B91A7] underline-offset-2">
        {inner}
      </u>
    ))) continue;
    if (take(/(?<!\*)\*([^*\n]+?)\*(?!\*)/, (inner, k) => <em key={`${keyPrefix}-i${k}`}>{inner}</em>)) continue;
    nodes.push(rest);
    break;
    if (rest === before) {
      nodes.push(rest);
      break;
    }
  }

  return nodes;
}

function FormattedText({ value }: { value: string }) {
  const lines = value.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {formatInline(line, `l${li}`)}
        </Fragment>
      ))}
    </>
  );
}

export function StoryRichTextDisplay({ text, worldId, className = '', onLightSurface = false }: Props) {
  const navigate = useNavigate();
  const openInsertionPreview = useAppStore((s) => s.openInsertionPreview);
  if (!text?.trim()) {
    return <span className="text-[#5A6078]">Sin datos.</span>;
  }

  const segments = parseStorySegments(text);

  return (
    <div className={`story-rich-display text-sm leading-relaxed text-[#8B91A7] ${className}`}>
      {segments.map((seg, idx) =>
        seg.kind === 'ref' ? (
          <StoryInsertionChip
            key={`ref-${idx}`}
            type={seg.type}
            label={seg.label}
            className="mx-0.5"
            onLightSurface={onLightSurface}
            onClick={
              worldId
                ? () => {
                    if (opensInPlacePreview(seg.type)) {
                      openInsertionPreview(worldId, seg.type, seg.id);
                      return;
                    }
                    const path = storyRefPath(worldId, seg.type, seg.id);
                    if (path) navigate(path);
                  }
                : undefined
            }
          />
        ) : (
          <FormattedText key={`t-${idx}`} value={seg.value} />
        )
      )}
    </div>
  );
}
