import { motion } from 'framer-motion';

interface ActionButtonsProps {
  onAction: (action: 'research' | 'build' | 'both' | 'go_ahead' | 'cancel') => void;
  /** 'clarify' shows Research/Build/Both. 'confirm' shows Go ahead/Change plan/Cancel. */
  actionType?: 'clarify' | 'confirm';
}

const clarifyButtons = [
  {
    id: 'research' as const,
    icon: '⬡',
    label: 'Research',
    className: 'bg-primary border-primary text-white hover:brightness-110',
  },
  {
    id: 'build' as const,
    icon: '⌥',
    label: 'Build',
    className: 'bg-stella-green-dim border-stella-green/50 text-stella-green hover:bg-stella-green/15',
  },
  {
    id: 'both' as const,
    icon: '∞',
    label: 'Research → Build',
    className: 'bg-white/[0.04] border-white/[0.15] text-stella-text-muted hover:bg-white/[0.08]',
  },
];

const confirmButtons = [
  {
    id: 'go_ahead' as const,
    icon: '▶',
    label: 'Go ahead',
    className: 'bg-primary border-primary text-white hover:brightness-110',
  },
  {
    id: 'cancel' as const,
    icon: '✕',
    label: 'Cancel',
    className: 'bg-white/[0.04] border-white/[0.15] text-stella-text-muted hover:bg-white/[0.08]',
  },
];

export default function ActionButtons({ onAction, actionType = 'clarify' }: ActionButtonsProps) {
  const buttons = actionType === 'confirm' ? confirmButtons : clarifyButtons;

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mt-5">
      {buttons.map((btn, i) => (
        <motion.button
          key={btn.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={() => onAction(btn.id)}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-full text-[13px] font-semibold tracking-wide cursor-pointer border transition-all duration-200 min-h-[44px] ${btn.className}`}
        >
          <span className="text-xs">{btn.icon}</span> {btn.label}
        </motion.button>
      ))}
    </div>
  );
}
