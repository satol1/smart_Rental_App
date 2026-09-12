import { memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronUp } from 'lucide-react';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { Button } from '@/components/ui/button';
import { transitionBase, transitionSlow } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { HEADER_HEIGHT_COMPACT, HEADER_HEIGHT_EXPANDED, useHeaderScrolled } from './useHeaderScrolled';

interface StickyDateBarProps { isVisible: boolean; }

// Панель висит на top компактной шапки, а под раскрытую шапку опускается
// transform-ом — анимируем только transform, и тем же токеном 300ms/ease-out,
// что и высота шапки: панель едет вместе с ней, без зазора и без рассинхрона.
const EXPANDED_OFFSET = HEADER_HEIGHT_EXPANDED - HEADER_HEIGHT_COMPACT;

const StickyDateBar = memo(function StickyDateBar({ isVisible }: StickyDateBarProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const isHeaderCompact = useHeaderScrolled();
  const baseY = isHeaderCompact ? 0 : EXPANDED_OFFSET;
  const enterY = reducedMotion ? baseY : baseY - 8;
  const scrollToCalendar = () => {
    const calendarEl = document.getElementById('main-date-range-selector');
    const behavior = reducedMotion ? 'instant' : 'smooth';
    if (calendarEl) calendarEl.scrollIntoView({ behavior, block: 'center' });
    else window.scrollTo({ top: 0, behavior });
  };

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="sticky-date-bar"
          initial={{ y: enterY, opacity: reducedMotion ? 1 : 0 }}
          animate={{ y: baseY, opacity: 1 }}
          exit={{ y: enterY, opacity: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { y: transitionSlow, opacity: transitionBase, default: transitionBase }
          }
          className={cn(
            // top-16 == HEADER_HEIGHT_COMPACT: см. EXPANDED_OFFSET
            'fixed inset-x-0 top-16 z-40 border-b px-4 py-2.5 transition-[background-color,box-shadow,border-color] duration-slow sm:px-6 lg:px-8',
            isHeaderCompact
              ? 'border-border/70 bg-card/85 shadow-sm backdrop-blur-md'
              : 'border-border bg-card',
          )}
          role="region" aria-label={t('shell.stickyDates')}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-6">
            <Button
              type="button" variant="ghost" onClick={scrollToCalendar}
              className="h-11 shrink-0 gap-2 px-2 sm:px-3"
              aria-label={t('shell.backToCalendar')} title={t('shell.backToCalendar')}
            >
              <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="hidden font-medium sm:inline">{t('shell.chosenDates')}</span>
              <ChevronUp className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
            </Button>
            <CalendarDateInputRange compact className="max-w-md flex-1" />
            <span className="hidden text-sm text-muted-foreground lg:block">{t('shell.pricesForPeriod')}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
});

export default StickyDateBar;
