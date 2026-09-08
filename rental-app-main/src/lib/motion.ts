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

/** Стандартная кривая ускорения (responsive ease-out) */
export const easeStandard: [number, number, number, number] = [0.23, 1, 0.32, 1];

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

/** Пружинные пресеты для жестов (hover/tap) и появления мелких элементов */
export const springs = {
  /** Отзывчивое нажатие кнопок и переключателей */
  press: { type: 'spring', stiffness: 500, damping: 30, mass: 0.8 },
  /** Пружинистое появление бейджей, галочек, поповеров */
  pop: { type: 'spring', stiffness: 400, damping: 22, mass: 0.9 },
  /** Мягкое раскрытие панелей и акцентных блоков */
  soft: { type: 'spring', stiffness: 260, damping: 26, mass: 1 },
  /** Быстрый отклик hover-подсветки */
  snap: { type: 'spring', stiffness: 700, damping: 35, mass: 0.6 },
} as const;

/** Стандартный жест кнопки: лёгкий подъём на hover, пружинное вжатие на tap */
export const buttonGesture = {
  whileHover: { scale: 1.02, y: -1 },
  whileTap: { scale: 0.96, y: 0 },
  transition: springs.press,
} as const;

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
