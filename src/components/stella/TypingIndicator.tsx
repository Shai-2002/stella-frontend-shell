import { useState, useEffect } from 'react';

export default function TypingIndicator() {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowMessage(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 py-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-[7px] h-[7px] rounded-full bg-primary/60 animate-bounce"
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '1s',
            }}
          />
        ))}
      </div>
      {showSlowMessage && (
        <p className="text-[12px] text-stella-text-dim animate-in fade-in duration-300">
          Stella is thinking... this is taking longer than usual.
        </p>
      )}
    </div>
  );
}
