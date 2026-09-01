// src/components/layout/StickyDateBar.tsx

import { memo } from 'react';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { cn } from '@/lib/utils';

interface StickyDateBarProps {
  isVisible: boolean;
}

const StickyDateBar = memo(function StickyDateBar({ isVisible }: StickyDateBarProps) {
  return (
    <div
      className={cn(
        "fixed top-20 left-0 right-0 z-40 bg-background/90 backdrop-blur-sm border-b shadow-md p-2 transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center">
          <div className="text-sm font-medium text-gray-700 mr-4">
            Выбор дат:
          </div>
          <CalendarDateInputRange className="flex-row gap-4" />
        </div>
      </div>
    </div>
  );
});

export default StickyDateBar;
