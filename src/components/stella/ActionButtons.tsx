interface ActionButtonsProps {
  onAction: (action: 'research' | 'build' | 'both') => void;
}

const buttonStyle = (type: 'research' | 'build' | 'both'): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  borderRadius: '8px',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.02em',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  background: type === 'research'
    ? 'rgba(79, 70, 229, 0.12)'
    : type === 'build'
    ? 'rgba(218, 119, 86, 0.12)'
    : 'rgba(74, 222, 128, 0.08)',
  border: type === 'research'
    ? '1px solid rgba(79, 70, 229, 0.3)'
    : type === 'build'
    ? '1px solid rgba(218, 119, 86, 0.3)'
    : '1px solid rgba(74, 222, 128, 0.2)',
  color: type === 'research'
    ? 'var(--color-cl-indigo)'
    : type === 'build'
    ? 'var(--color-cl-terra)'
    : 'var(--color-cl-green)',
});

export default function ActionButtons({ onAction }: ActionButtonsProps) {
  return (
    <div className="flex gap-2 mt-4">
      <button onClick={() => onAction('research')} style={buttonStyle('research')}>
        <span style={{ fontSize: 10 }}>⬡</span> Run Research
      </button>
      <button onClick={() => onAction('build')} style={buttonStyle('build')}>
        <span style={{ fontSize: 10 }}>⌥</span> Run Build
      </button>
      <button onClick={() => onAction('both')} style={buttonStyle('both')}>
        <span style={{ fontSize: 10 }}>∞</span> Research → Build
      </button>
    </div>
  );
}
