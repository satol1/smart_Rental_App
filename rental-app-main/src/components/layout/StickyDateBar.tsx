// src/components/layout/StickyDateBar.tsx

import { memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { Calendar, ChevronUp } from 'lucide-react';

interface StickyDateBarProps {
  isVisible: boolean;
}

const StickyDateBar = memo(function StickyDateBar({ isVisible }: StickyDateBarProps) {
  const scrollToCalendar = () => {
    const calendarEl = document.getElementById('main-date-range-selector');
    if (calendarEl) {
      calendarEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="sticky-date-bar"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-20 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] py-2.5 px-4"
          aria-label="Плавающая панель выбора дат"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            <motion.button
              type="button"
              onClick={scrollToCalendar}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1.5 rounded-full bg-pastel-sky text-pastel-sky-fg border border-sky-200/60 hover:bg-sky-100/80 transition-colors cursor-pointer flex-shrink-0"
              title="Нажмите, чтобы вернуться к календарю"
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">Выбранные даты</span>
              <ChevronUp className="w-3.5 h-3.5 text-primary/70" />
            </motion.button>

            <div className="flex-1 flex justify-center max-w-xl min-w-0">
              <CalendarDateInputRange compact />
            </div>

            <div className="hidden sm:block text-xs text-muted-foreground font-medium flex-shrink-0">
              Цены пересчитаны под выбранный период
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
});

export default StickyDateBar;

