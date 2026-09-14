import React from 'react';
import { m } from 'motion/react';
import { Bot } from 'lucide-react';

interface StudySparkleProps {
  size?: number;
  className?: string;
  isAnimated?: boolean;
}

export const StudySparkle: React.FC<StudySparkleProps> = ({
  size = 20,
  className = '',
  isAnimated = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 text-blue-500 ${className}`}
      style={{ width: size, height: size }}
    >
      <m.div
        className="relative z-10 flex items-center justify-center"
        animate={
          isAnimated
            ? {
                scale: [1, 1.1, 1],
                y: [0, -2, 0]
              }
            : {}
        }
        transition={
          isAnimated
            ? {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : {}
        }
      >
        <Bot size={size} />
      </m.div>
    </div>
  );
};
