interface ActionButtonsProps {
  onAction: (action: 'research' | 'build' | 'both') => void;
}

export default function ActionButtons({ onAction }: ActionButtonsProps) {
  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => onAction('research')}
        className="px-5 py-[7px] rounded-[20px] text-[13px] font-medium tracking-tight bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Research
      </button>
      <button
        onClick={() => onAction('build')}
        className="px-5 py-[7px] rounded-[20px] text-[13px] font-medium tracking-tight bg-stella-green-dim text-stella-green hover:opacity-90 transition-opacity"
        style={{ border: '1px solid rgba(74,222,128,0.25)' }}
      >
        Build
      </button>
      <button
        onClick={() => onAction('both')}
        className="px-5 py-[7px] rounded-[20px] text-[13px] font-medium tracking-tight bg-stella-indigo-dim hover:opacity-90 transition-opacity"
        style={{ border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}
      >
        Both
      </button>
    </div>
  );
}
