// src/lib/motion.ts
// Единая шкала motion-токенов приложения.
// Правило: анимируем ТОЛЬКО transform и opacity (никогда width/height/top/left),
// чтобы всё шло по композитору и не вызывало layout/reflow.

import type { Variants } from "framer-motion";

/** Длительности в секундах */
export const motionDurations = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
} as const;

/** Стандартная кривая ускорения (Material standard easing) */
export const easeStandard: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Базовые transition-параметры для большинства анимаций */
export const transitionBase = {
  duration: motionDurations.base,
  ease: easeStandard,
} as const;

export const transitionFast = {
  duration: motionDurations.fast,
  ease: easeStandard,
} as const;

export const transitionSlow = {
  duration: motionDurations.slow,
  ease: easeStandard,
} as const;

/**
 * Появление снизу-вверх с лёгким фейдом.
 * Только transform/opacity.
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionBase,
  },
};

/**
 * Переход страницы: фейд + сдвиг на 8px.
 * Только transform/opacity.
 */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionBase,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: transitionFast,
  },
};

/**
 * Контейнер для каскадного (stagger) появления списка.
 * staggerChildren 0.05 — быстрый, не раздражающий каскад.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * Элемент списка внутри staggerContainer.
 * Только transform/opacity.
 */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionBase,
  },
};

/**
 * Варианты без движения — для prefers-reduced-motion.
 * Никаких transform, только мгновенное появление (или чистый fade).
 */
export const staticFade: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

/**
 * Убирает движение из variants, если пользователь предпочитает reduced motion.
 * Возвращает «статичные» варианты (мгновенное появление без анимации).
 */
export function motionSafeVariants(
  prefersReduced: boolean | null | undefined,
  variants: Variants,
): Variants {
  return prefersReduced ? staticFade : variants;
}
