import { Fragment, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  normalizeStoredMarkdown,
  parseStorySegments,
  splitDisplayInline,
  type StorySegment,
  type TextAlign,
} from '@/lib/storyRichText';
import { storyRefPath } from '@/lib/storyInsertionCatalog';
import { opensInPlacePreview } from '@/lib/storyInsertionPreview';
import { captureNavigationReturn, navigateWithReturnState } from '@/lib/storyNavigation';
import { resolveStoryRef } from '@/lib/storyRefResolve';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { StoryInsertionChip } from '@/components/common/StoryInsertionChip';

type Props = {
  text: string;
  worldId?: string;
  className?: string;
  onLightSurface?: boolean;
};

const alignClass: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

function InlineFormatted({ value, keyPrefix }: { value: string; keyPrefix: string }) {
  const tokens = splitDisplayInline(value);
  return (
    <>
      {tokens.map((t, i) => {
        const k = `${keyPrefix}-${i}`;
        if (t.type === 'boldItalic')
          return (
            <strong key={k} className="font-semibold text-[#F3F1EA]">
              <em>{t.value}</em>
            </strong>
          );
        if (t.type === 'bold') return <strong key={k} className="font-semibold text-[#F3F1EA]">{t.value}</strong>;
        if (t.type === 'italic') return <em key={k}>{t.value}</em>;
        if (t.type === 'underline')
          return (
            <u key={k} className="decoration-[#8B91A7] underline-offset-2">
              {t.value}
            </u>
          );
        return <Fragment key={k}>{t.value}</Fragment>;
      })}
    </>
  );
}

function FormattedText({ value }: { value: string }) {
  const lines = value.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          <InlineFormatted value={line} keyPrefix={`l${li}`} />
        </Fragment>
      ))}
    </>
  );
}

function SegmentList({
  segments,
  worldId,
  onLightSurface,
  keyPrefix,
  openRef,
}: {
  segments: StorySegment[];
  worldId?: string;
  onLightSurface?: boolean;
  keyPrefix: string;
  openRef: (type: string, id: string, label: string) => void;
}) {
  return (
    <>
      {segments.map((seg, idx) => {
        const k = `${keyPrefix}-${idx}`;
        if (seg.kind === 'ref') {
          return (
            <StoryInsertionChip
              key={k}
              type={seg.type}
              label={seg.label}
              className="mx-0.5"
              onLightSurface={onLightSurface}
              onClick={worldId ? () => openRef(seg.type, seg.id, seg.label) : undefined}
            />
          );
        }
        if (seg.kind === 'align') {
          return (
            <div key={k} className={`block w-full ${alignClass[seg.align]}`}>
              <SegmentList
                segments={parseStorySegments(seg.value)}
                worldId={worldId}
                onLightSurface={onLightSurface}
                keyPrefix={`${k}-a`}
                openRef={openRef}
              />
            </div>
          );
        }
        return <FormattedText key={k} value={seg.value} />;
      })}
    </>
  );
}

export function StoryRichTextDisplay({ text, worldId, className = '', onLightSurface = false }: Props) {
  const navigate = useNavigate();

  const openRef = useCallback(
    (type: string, id: string, label: string) => {
      if (!worldId) return;
      const resolved = resolveStoryRef(worldId, type, id, label, useStore.getState());
      if (!resolved) {
        toast.error('No se encontró la entidad enlazada');
        return;
      }
      const { type: resolvedType, id: resolvedId } = resolved;
      if (opensInPlacePreview(resolvedType)) {
        const returnTo = captureNavigationReturn();
        useStore.getState().openInsertionPreview(worldId, resolvedType, resolvedId, returnTo);
        return;
      }
      const path = storyRefPath(worldId, resolvedType, resolvedId);
      if (path) navigateWithReturnState(navigate, path);
    },
    [navigate, worldId]
  );

  if (!text?.trim()) {
    return <span className="text-[#5A6078]">Sin datos.</span>;
  }

  const segments = parseStorySegments(normalizeStoredMarkdown(text));

  return (
    <div className={`story-rich-display text-sm leading-relaxed text-[#8B91A7] ${className}`}>
      <SegmentList
        segments={segments}
        worldId={worldId}
        onLightSurface={onLightSurface}
        keyPrefix="root"
        openRef={openRef}
      />
    </div>
  );
}
