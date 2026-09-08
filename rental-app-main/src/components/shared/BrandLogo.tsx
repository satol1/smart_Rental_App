import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { transitionBase, transitionFast } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  animated?: boolean;
}

/** Circular lens and shutter mark, redrawn from the supplied brand artwork. */
export function BrandLogo({ className, size = 44, showText = true, animated = true }: BrandLogoProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const canAnimate = animated && !reducedMotion;

  return (
    <motion.span
      className={cn('inline-flex select-none items-center gap-2.5', className)}
      initial="rest"
      animate="rest"
      whileHover={canAnimate ? 'active' : undefined}
      whileFocus={canAnimate ? 'active' : undefined}
      whileTap={canAnimate ? 'pressed' : undefined}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 1547"
        role={showText ? undefined : 'img'}
        aria-label={showText ? undefined : t('shell.brandName')}
        aria-hidden={showText ? true : undefined}
        focusable="false"
        style={{ width: size, height: 'auto', color: 'hsl(var(--brand, var(--primary)))' }}
        className="block shrink-0 overflow-visible"
      >
        <path
          d="M 1418.56 1077.75 A 690 690 0 1 0 1104.35 1391.25 A 224 224 0 0 0 1418.56 1077.75 Z"
          fill="hsl(var(--brand-paper, var(--card)))"
          stroke="currentColor"
          strokeWidth="46"
          strokeLinejoin="round"
        />
        <motion.circle
          cx="800" cy="772" r="349" fill="currentColor"
          variants={{ rest: { scale: 1 }, active: { scale: 0.975 }, pressed: { scale: 0.93 } }}
          style={{ transformOrigin: '800px 772px' }}
          transition={reducedMotion ? { duration: 0 } : transitionBase}
        />
        <motion.g
          fill="hsl(var(--brand-ink, var(--foreground)))"
          variants={{ rest: { rotate: 0 }, active: { rotate: 0 }, pressed: { rotate: -2.5 } }}
          style={{ transformOrigin: '800px 772px' }}
          transition={reducedMotion ? { duration: 0 } : transitionFast}
        >
          <path
            d="M 878 1145 V 850 H 1165"
            fill="none"
            stroke="hsl(var(--brand-ink, var(--foreground)))"
            strokeWidth="158"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="1090" cy="1062" r="92" />
          <circle cx="1240" cy="1212" r="92" />
        </motion.g>
      </svg>
      {showText && (
        <span className="flex flex-col text-left">
          <span className="text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
            {t('shell.brandName')}
          </span>
          <span className="hidden text-xs leading-relaxed text-muted-foreground sm:block">
            {t('shell.brandDescription')}
          </span>
        </span>
      )}
    </motion.span>
  );
}

export default BrandLogo;
