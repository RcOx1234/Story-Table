import { AlertTriangle, ChevronRight, User } from 'lucide-react';
import type { GenealogyIssue } from '@/lib/characterGenealogy';

type Props = {
  issues: GenealogyIssue[];
  onGoToCharacter?: (characterId: string) => void;
};

export function GenealogyIssuesPanel({ issues, onGoToCharacter }: Props) {
  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="mb-4 space-y-2">
      {errors.length > 0 && (
        <div className="rounded-xl border border-[#D61E2B]/30 bg-[#D61E2B]/8 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-[#D61E2B]">
            <AlertTriangle size={14} />
            Conflictos en relaciones ({errors.length})
          </p>
          <ul className="space-y-2">
            {errors.map((issue) => (
              <IssueRow key={issue.id} issue={issue} onGoToCharacter={onGoToCharacter} />
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-[#EAB308]/25 bg-[#EAB308]/8 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-[#EAB308]">
            <AlertTriangle size={14} />
            Avisos ({warnings.length})
          </p>
          <ul className="space-y-2">
            {warnings.map((issue) => (
              <IssueRow key={issue.id} issue={issue} onGoToCharacter={onGoToCharacter} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  onGoToCharacter,
}: {
  issue: GenealogyIssue;
  onGoToCharacter?: (characterId: string) => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#2A3045]/60 bg-[#111318]/80 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#E8E9EB]">{issue.message}</p>
        {issue.hint && <p className="mt-0.5 text-[10px] text-[#5A6078]">{issue.hint}</p>}
        <p className="mt-1 flex items-center gap-1 text-[10px] text-[#8B91A7]">
          <User size={10} />
          {issue.characterName}
          {issue.relatedName && (
            <>
              <span className="text-[#5A6078]">·</span>
              {issue.relatedName}
            </>
          )}
        </p>
      </div>
      {onGoToCharacter && (
        <button
          type="button"
          className="story-btn-secondary shrink-0 px-2 py-1 text-[10px]"
          onClick={() => onGoToCharacter(issue.focusCharacterId)}
        >
          Ver en árbol
          <ChevronRight size={12} />
        </button>
      )}
    </li>
  );
}
