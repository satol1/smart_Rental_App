import { jsx as _jsx } from "react/jsx-runtime";
// src/components/shared/AnimatedOutlet.tsx
// Переходы между страницами: fade + translateY(8px), duration base.
// Глобально уважает prefers-reduced-motion:
//  - <MotionConfig reducedMotion="user"> в App отключает transform-анимации;
//  - дополнительно здесь useReducedMotion() подменяет variants на статичные.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { motionSafeVariants, pageTransition, staticFade, } from "@/lib/motion";
export default function AnimatedOutlet() {
    const location = useLocation();
    const prefersReducedMotion = useReducedMotion() ?? false;
    // При reduced motion — без движения: только мгновенное появление.
    const enterVariants = motionSafeVariants(prefersReducedMotion, pageTransition);
    const exitVariants = prefersReducedMotion ? staticFade : pageTransition;
    return (_jsx(AnimatePresence, { mode: "popLayout", initial: false, children: _jsx(motion.div, { initial: "hidden", animate: "visible", exit: "exit", variants: {
                ...enterVariants,
                exit: exitVariants.exit,
            }, style: { willChange: "transform, opacity" }, children: _jsx(Outlet, {}) }, location.pathname) }));
}
