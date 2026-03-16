interface ActionButtonsProps {
  onAction: (action: 'research' | 'build' | 'both') => void;
}

const buttonBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 20px',
  borderRadius: '999px',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.02em',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const styles: Record<string, React.CSSProperties> = {
  research: {
    ...buttonBase,
    background: 'var(--color-cl-terra)',
    border: '1px solid var(--color-cl-terra)',
    color: '#fff',
  },
  build: {
    ...buttonBase,
    background: 'rgba(74,222,128,0.08)',
    border: '1.5px solid rgba(74,222,128,0.5)',
    color: 'var(--color-cl-green)',
  },
  both: {
    ...buttonBase,
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(255,255,255,0.15)',
    color: 'var(--color-cl-text-muted)',
  },
};

export default function ActionButtons({ onAction }: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3 mt-5">
      <button onClick={() => onAction('research')} style={styles.research}>
        <span style={{ fontSize: 12 }}>⬡</span> Research
      </button>
      <button onClick={() => onAction('build')} style={styles.build}>
        <span style={{ fontSize: 12 }}>⌥</span> Build
      </button>
      <button onClick={() => onAction('both')} style={styles.both}>
        <span style={{ fontSize: 12 }}>∞</span> Research → Build
      </button>
    </div>
  );
}
