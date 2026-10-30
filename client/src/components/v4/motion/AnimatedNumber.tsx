import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { DURATIONS } from './motionTokens.js';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: (n: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  format = (n) => Math.round(n).toLocaleString(),
}) => {
  const shouldReduceMotion = useReducedMotion();
  const prevValueRef = useRef(value);

  // Fast, calm spring transition strictly under 300ms
  const spring = useSpring(value, {
    stiffness: 280,
    damping: 30,
    restDelta: 0.01,
  });

  const display = useTransform(spring, (current) => format(current));

  useEffect(() => {
    spring.set(value);
    prevValueRef.current = value;
  }, [value, spring]);

  if (shouldReduceMotion) {
    return (
      <span className={`tabular font-mono ${className}`}>
        {format(value)}
      </span>
    );
  }

  return (
    <motion.span className={`tabular font-mono inline-block ${className}`}>
      {display}
    </motion.span>
  );
};
