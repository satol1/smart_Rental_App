import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, X, ShoppingBag, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/ui/money-text';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { transitionBase, staggerContainer, listItem, motionSafeVariants } from '@/lib/motion';
import { useReserveStore } from '@/store/reserveStore';
import { useDateStore } from '@/store/dateStore';

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
  const items = useReserveStore((s) => s.items);
  const remove = useReserveStore((s) => s.remove);
  const selectedAccessories = useReserveStore((s) => s.selectedAccessories);
  const dayCount = useDateStore((s) => s.dayCount);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (items.length === 0) setIsExpanded(false);
  }, [items.length]);

  // Позиция в день = ставка техники + выбранные аксессуары (как в DiscountCalculator)
  const lineRates = useMemo(() => items.map((item) => {
    const accessoryRate = (item.accessories || [])
      .filter((acc) => (selectedAccessories[item.id] || []).includes(acc.id))
      .reduce((sum, acc) => sum + acc.price, 0);
    return item.daily_rate + accessoryRate;
  }), [items, selectedAccessories]);
  const totalForPeriod = useMemo(
    () => lineRates.reduce((sum, rate) => sum + rate, 0) * dayCount,
    [lineRates, dayCount],
  );

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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/25 bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-8"
      aria-label={t('shell.selection')}
    >
      <AnimatePresence initial={false}>
      {isExpanded && items.length > 0 && <motion.div
        key="selection-list-panel"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={reducedMotion ? { duration: 0 } : transitionBase}
        className="overflow-hidden"
      >
        <div className="mx-auto mb-3 max-w-7xl border-b border-border pb-3">
          <motion.ul
            variants={motionSafeVariants(reducedMotion, staggerContainer)}
            initial="hidden"
            animate="visible"
            className="max-h-[40vh] space-y-1 overflow-y-auto pr-1"
            aria-label={t('shell.selectionListTitle')}
          >
            {items.map((item, index) => (
              <motion.li
                key={item.id}
                variants={motionSafeVariants(reducedMotion, listItem)}
                className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {lineRates[index].toLocaleString('ru-RU')} {t('shell.perDayShort')}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={`${t('shell.removeItem')}: ${item.name}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-danger-soft hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </motion.ul>
          <div className="mt-2 flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">
              {t('shell.totalForPeriod')} · {t('shell.rentalDays', { count: dayCount })}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              <MoneyText value={totalForPeriod} />
            </span>
          </div>
        </div>
      </motion.div>}
      </AnimatePresence>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-11 w-11 items-center justify-center rounded-xl bg-pastel-sky sm:flex">
            <ShoppingBag className="h-5 w-5 text-pastel-sky-fg" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary" aria-live="polite">{t('shell.selectedItems', { count: selectedCount })}</p>
            {dateRangeText && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{dateRangeText}</p>}
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('shell.collapseSelectionList') : t('shell.expandSelectionList')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={reducedMotion ? { duration: 0 } : transitionBase}
              className="flex"
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </motion.span>
          </button>
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
