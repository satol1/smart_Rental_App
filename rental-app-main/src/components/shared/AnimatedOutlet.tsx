// src/components/shared/AnimatedOutlet.tsx
// Переходы между страницами: fade + translateY(8px), duration base.
// Глобально уважает prefers-reduced-motion:
//  - <MotionConfig reducedMotion="user"> в App отключает transform-анимации;
//  - дополнительно здесь useReducedMotion() подменяет variants на статичные.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import {
  motionSafeVariants,
  pageTransition,
  staticFade,
} from "@/lib/motion";

export default function AnimatedOutlet() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion() ?? false;

  // При reduced motion — без движения: только мгновенное появление.
  const enterVariants = motionSafeVariants(prefersReducedMotion, pageTransition);
  const exitVariants = prefersReducedMotion ? staticFade : pageTransition;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={{
          ...enterVariants,
          exit: exitVariants.exit,
        }}
        style={{ willChange: "transform, opacity" }}
      >
        {/*
          popLayout вместо wait: новая страница монтируется сразу, не дожидаясь
          exit-анимации старой (wait добавлял ~150 мс к каждому переходу и на
          lazy-роутах превращал навигацию в «сначала скелетон, потом страница»).
          Suspense находится в MainLayout над AnimatedOutlet: пока грузится
          lazy-чанк, хедер остаётся, контент заменяется на PageFallback.
        */}
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
