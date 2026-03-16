import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
      {/* Stella avatar — same as MessageBubble, pulsing */}
      <motion.div
        animate={{ boxShadow: ['0 0 6px rgba(218,119,86,0.2)', '0 0 14px rgba(218,119,86,0.5)', '0 0 6px rgba(218,119,86,0.2)'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(218,119,86,0.9), rgba(180,80,50,0.8))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '2px',
          border: '1px solid rgba(218,119,86,0.3)'
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>S</span>
      </motion.div>

      {/* Typing dots */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '0.6rem 0',
        marginTop: '2px'
      }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 0.9, 0.2], y: [0, -3, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut'
            }}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--color-cl-terra)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
