import { type Transition } from 'framer-motion';

/**
 * Editorial motion tokens adhering strictly to the < 300ms constraint.
 * Easing curve [0.16, 1, 0.3, 1] gives purposeful deceleration without cartoonish bounce.
 */
export const EASING_QUIET = [0.16, 1, 0.3, 1] as const;

export const DURATIONS = {
  fast: 0.12, // 120ms
  normal: 0.2, // 200ms
  slow: 0.28, // 280ms - strictly under 300ms
} as const;

export const TRANSITIONS = {
  layout: {
    type: 'tween',
    duration: DURATIONS.normal,
    ease: EASING_QUIET,
  } as Transition,

  fade: {
    duration: DURATIONS.fast,
    ease: 'easeOut',
  } as Transition,

  crossfade: {
    duration: DURATIONS.normal,
    ease: 'easeInOut',
  } as Transition,

  scaleTap: {
    duration: DURATIONS.fast,
    ease: 'easeOut',
  } as Transition,
};

/**
 * Return simplified/zeroed transition when user prefers reduced motion.
 */
export function getMotionConfig(prefersReducedMotion: boolean | null) {
  if (prefersReducedMotion) {
    return {
      transition: { duration: 0 },
      reduced: true,
    };
  }
  return {
    transition: TRANSITIONS.layout,
    reduced: false,
  };
}
