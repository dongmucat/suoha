import type { Variants } from 'framer-motion'

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
} as const satisfies Variants

export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
} as const satisfies Variants

export const modalContent = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
} as const satisfies Variants

export const cardHover = {
  rest: { scale: 1, boxShadow: '0 4px 20px rgba(255,107,157,0.1)' },
  hover: { scale: 1.02, boxShadow: '0 8px 32px rgba(255,107,157,0.2)', transition: { duration: 0.2 } },
} as const satisfies Variants

export const buttonTap = {
  rest: { scale: 1 },
  hover: { scale: 1.03 },
  tap: { scale: 0.95 },
} as const satisfies Variants

export const listItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
} as const satisfies Variants

export const listContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
} as const satisfies Variants

export const numberPop = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.2, 1], transition: { duration: 0.3, ease: 'easeOut' } },
} as const satisfies Variants

export const celebrateWin = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: [0.8, 1.1, 1],
    opacity: 1,
    rotate: [0, 2, -2, 0],
    transition: { duration: 0.5, ease: 'easeOut' },
  },
} as const satisfies Variants

export const sadLose = {
  initial: { scale: 0.9, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    y: [0, 3, 0],
    transition: { duration: 0.4, ease: 'easeOut' },
  },
} as const satisfies Variants

export const shakeError = {
  animate: { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } },
} as const satisfies Variants

export const toastSlideIn = {
  initial: { opacity: 0, y: -30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } },
  exit: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.15 } },
} as const satisfies Variants
