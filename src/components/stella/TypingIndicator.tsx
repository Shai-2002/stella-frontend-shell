import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      {/* Stella avatar — matches MessageBubble avatar, pulsing */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 6px rgba(218,119,86,0.2)',
            '0 0 16px rgba(218,119,86,0.5)',
            '0 0 6px rgba(218,119,86,0.2)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 border border-stella-terra-border"
        style={{
          background: 'linear-gradient(135deg, #e08860 0%, #da7756 50%, #c4623f 100%)',
        }}
      >
        <span className="text-[13px] font-bold text-white tracking-tight">S</span>
      </motion.div>

      {/* Typing dots */}
      <div className="flex items-center gap-[5px] pt-3 mt-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 0.9, 0.2], y: [0, -3, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
            className="w-[5px] h-[5px] rounded-full bg-primary"
          />
        ))}
      </div>
    </div>
  );
}
