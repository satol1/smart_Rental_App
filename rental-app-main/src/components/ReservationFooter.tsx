import { useTranslation } from 'react-i18next';
import { ArrowRight, X, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { transitionBase } from '@/lib/motion';

interface ReservationFooterProps {
  selectedCount: number;
  onClick: () => void;
  onReset: () => void;
  isEditingMode: boolean;
  intent?: string;
  startDate?: Date;
  endDate?: Date;
}

export default function ReservationFooter({ selectedCount, onClick, onReset, isEditingMode, intent, startDate, endDate }: ReservationFooterProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const buttonText = isEditingMode && intent !== 'add_to_new_reservation'
    ? t('shell.addToReservation') : t('shell.checkout');
  const formatDateForDisplay = (date: Date): string => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
  const dateRangeText = startDate && endDate
    ? t('shell.dateSpan', { from: formatDateForDisplay(startDate), to: formatDateForDisplay(endDate) }) : '';

  return createPortal(
    <AnimatePresence>
    {selectedCount > 0 && <motion.aside
      key="reservation-footer"
      initial={{ y: reducedMotion ? 0 : 8, opacity: reducedMotion ? 1 : 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: reducedMotion ? 0 : 8, opacity: 0 }}
      transition={reducedMotion ? { duration: 0 } : transitionBase}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/25 bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-8"
      aria-label={t('shell.selection')}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-11 w-11 items-center justify-center rounded-xl bg-pastel-sky sm:flex">
            <ShoppingBag className="h-5 w-5 text-pastel-sky-fg" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary" aria-live="polite">{t('shell.selectedItems', { count: selectedCount })}</p>
            {dateRangeText && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{dateRangeText}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button onClick={onReset} variant="ghost" size="icon" className="shrink-0 sm:w-auto sm:px-3" aria-label={t('shell.resetSelection')}>
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('shell.resetSelection')}</span>
          </Button>
          <Button onClick={onClick} className="gap-2 px-3 sm:px-5">
            {buttonText}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </motion.aside>}
    </AnimatePresence>,
    document.body,
  );
}
