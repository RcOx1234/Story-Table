type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
  disabled?: boolean;
};

/** Interruptor circular con animación suave (uso global en ajustes y formularios). */
export function StoryToggle({ checked, onChange, 'aria-label': ariaLabel, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`story-toggle relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ease-out ${
        checked
          ? 'border-[#D61E2B] bg-[#D61E2B] shadow-[0_0_12px_rgba(214,30,43,0.35)]'
          : 'border-[#3A4460] bg-[#111318] hover:border-[#5A6078]'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`block rounded-full bg-white transition-all duration-200 ease-out ${
          checked ? 'h-2 w-2 scale-100 opacity-100' : 'h-0 w-0 scale-0 opacity-0'
        }`}
      />
    </button>
  );
}
