// src/components/layout/StickyDateBar.tsx

import { memo } from 'react';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyDateBarProps {
  isVisible: boolean;
}

const StickyDateBar = memo(function StickyDateBar({ isVisible }: StickyDateBarProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={cn(
        "fixed top-20 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b shadow-md py-2 px-4 transition-all duration-300 ease-in-out",
        isVisible
          ? "translate-y-0 opacity-100 visible pointer-events-auto"
          : "-translate-y-full opacity-0 invisible pointer-events-none"
      )}
      aria-hidden={!isVisible}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center flex-wrap sm:flex-nowrap gap-2 sm:gap-4">
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center text-xs sm:text-sm font-medium text-foreground hover:text-sky-600 dark:hover:text-sky-400 transition-colors focus:outline-none cursor-pointer"
            title="Нажмите, чтобы вернуться к выбору дат"
          >
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 mr-1.5 flex-shrink-0" aria-hidden="true" />
            <span>Выбор дат:</span>
          </button>
          <CalendarDateInputRange compact />
        </div>
      </div>
    </div>
  );
});

export default StickyDateBar;
