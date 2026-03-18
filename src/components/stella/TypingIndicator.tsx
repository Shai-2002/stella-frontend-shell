import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex items-start pl-[52px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85, y: -2 }}
        transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex items-center gap-[5px] px-3.5 py-2.5 rounded-2xl bg-white/[0.04]"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              opacity: [0.25, 0.85, 0.25],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 1.0,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
            className="w-[6px] h-[6px] rounded-full bg-primary"
          />
        ))}
      </motion.div>
    </div>
  );
}
