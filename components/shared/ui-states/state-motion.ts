/** Shared motion tokens for app-wide UI states (respect reduced-motion at call sites). */

export const stateEase = [0.16, 1, 0.3, 1] as const;

export const stateEnter = {
  initial: { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(4px)" },
  transition: { duration: 0.35, ease: stateEase },
};

export const stateEnterReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

export const iconPop = {
  initial: { scale: 0.82, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring" as const, stiffness: 380, damping: 22 },
};

export const shakeX = {
  animate: { x: [0, -6, 6, -4, 4, 0] },
  transition: { duration: 0.4, ease: stateEase },
};
