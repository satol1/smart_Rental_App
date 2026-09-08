// src/components/shared/AnimatedOutlet.tsx
// Только появление входящего маршрута. Сохранённый на время exit старый
// Outlet читает новый router context и повторно монтирует целевую страницу.

import { motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import {
  motionSafeVariants,
  transitionFast,
} from "@/lib/motion";

export default function AnimatedOutlet() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion() ?? false;

  // При reduced motion — без движения: только мгновенное появление.
  const pageFade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitionFast },
  };
  const enterVariants = motionSafeVariants(prefersReducedMotion, pageFade);

  return (
    <motion.div
      key={location.pathname}
      initial="hidden"
      animate="visible"
      variants={enterVariants}
    >
      <Outlet />
    </motion.div>
  );
}
