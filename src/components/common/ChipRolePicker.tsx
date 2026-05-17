import { motion } from 'framer-motion';

type Option = { value: string; label: string; group: string };

type Props = {
  options: Option[];
  groups: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function ChipRolePicker({ options, groups, value, onChange, label }: Props) {
  return (
    <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      {label ? <p className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">{label}</p> : null}
      {groups.map((group) => {
        const items = options.filter((o) => o.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className="mb-1.5 text-[10px] uppercase text-[#3A4460]">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((o) => {
                const active = value === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange(active ? '' : o.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#D61E2B] text-white shadow-[0_0_12px_rgba(214,30,43,0.35)]'
                        : 'bg-[#1E2230] text-[#8B91A7] hover:bg-[#2A3045] hover:text-[#E8E9EB]'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
