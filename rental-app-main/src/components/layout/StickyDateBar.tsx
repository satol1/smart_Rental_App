import { memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronUp } from 'lucide-react';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { Button } from '@/components/ui/button';
import { transitionBase } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useHeaderScrolled } from './Header';

interface StickyDateBarProps { isVisible: boolean; }

const StickyDateBar = memo(function StickyDateBar({ isVisible }: StickyDateBarProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const isHeaderCompact = useHeaderScrolled();
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
          initial={{ y: reducedMotion ? 0 : -8, opacity: reducedMotion ? 1 : 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reducedMotion ? 0 : -8, opacity: 0 }}
          transition={reducedMotion ? { duration: 0 } : transitionBase}
          className={cn(
            'fixed inset-x-0 z-40 border-b px-4 py-2.5 transition-[top,background-color,box-shadow,border-color] duration-slow sm:px-6 lg:px-8',
            isHeaderCompact
              ? 'top-16 border-border/70 bg-card/85 shadow-sm backdrop-blur-md'
              : 'top-20 border-border bg-card',
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
