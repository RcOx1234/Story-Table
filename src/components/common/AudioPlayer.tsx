import { Mic } from 'lucide-react';

type Props = {
  src: string;
  className?: string;
  compact?: boolean;
};

export function AudioPlayer({ src, className = '', compact }: Props) {
  if (!src) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!compact && <Mic size={14} className="shrink-0 text-[#8B5CF6]" />}
      <audio controls src={src} className="h-8 max-w-full flex-1" preload="metadata" />
    </div>
  );
}
