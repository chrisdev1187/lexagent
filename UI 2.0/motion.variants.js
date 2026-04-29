// Lex Protocol — Motion Variants (Framer Motion / Motion)
// Import: import { entryTrace, blueprintDraw, glassTilt, neonPulse, terminalType } from '@/lib/motion.variants';

export const entryTrace = {
  hidden: {
    clipPath: 'inset(0 100% 0 0)',
    opacity: 0,
    filter: 'blur(1px)',
  },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const blueprintDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  },
};

export const glassTilt = {
  rest: { rotateX: 0, rotateY: 0, scale: 1 },
  hover: {
    rotateX: 4,
    rotateY: -4,
    scale: 1.01,
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
  },
};

export const neonPulse = {
  animate: {
    opacity: [1, 0.55, 1],
    transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const terminalType = {
  hidden: { opacity: 0 },
  visible: (i = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: i * 0.04 },
  }),
};

export const terminalChar = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.08, ease: [0.16, 1, 0.3, 1] },
  },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

export const slideModal = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: 0.16, ease: [0.2, 0.6, 0.2, 1] },
  },
};
