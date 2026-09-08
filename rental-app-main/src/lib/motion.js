// src/lib/motion.ts
// Единая шкала motion-токенов приложения.
// Правило: анимируем ТОЛЬКО transform и opacity (никогда width/height/top/left),
// чтобы всё шло по композитору и не вызывало layout/reflow.
/** Длительности в секундах */
export const motionDurations = {
    fast: 0.15,
    base: 0.2,
    slow: 0.3,
};
/** Стандартная кривая ускорения (Material standard easing) */
export const easeStandard = [0.4, 0, 0.2, 1];
/** Базовые transition-параметры для большинства анимаций */
export const transitionBase = {
    duration: motionDurations.base,
    ease: easeStandard,
};
export const transitionFast = {
    duration: motionDurations.fast,
    ease: easeStandard,
};
export const transitionSlow = {
    duration: motionDurations.slow,
    ease: easeStandard,
};
/**
 * Появление снизу-вверх с лёгким фейдом.
 * Только transform/opacity.
 */
export const fadeInUp = {
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
export const pageTransition = {
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
export const staggerContainer = {
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
export const listItem = {
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
export const staticFade = {
    hidden: { opacity: 1 },
    visible: { opacity: 1 },
};
/**
 * Убирает движение из variants, если пользователь предпочитает reduced motion.
 * Возвращает «статичные» варианты (мгновенное появление без анимации).
 */
export function motionSafeVariants(prefersReduced, variants) {
    return prefersReduced ? staticFade : variants;
}
