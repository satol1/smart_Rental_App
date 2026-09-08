import type { MouseEvent } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import AvailabilityStrip from '@/components/AvailabilityStrip';
import { Button } from '@/components/ui/button';
import { buttonGesture } from '@/lib/motion';
import { STATUS_TEXT_STYLES, STATUS_TEXTS } from './constants';
import type { DayStatus, EquipmentStatus } from '@/types/availability';

const MotionButton = motion.create(Button);

// Занятое оборудование подсвечиваем reserved-токенами (очевидный красноватый),
// не путая с brand-цветом состояния «выбрано пользователем»
const isOccupied = (status: EquipmentStatus | 'my_reservation' | 'added') => status === 'reserved' || status === 'rented';

interface CardFooterProps {
  status: EquipmentStatus | 'my_reservation' | 'added';
  dateRange: string;
  selected: boolean;
  onToggleSelection: (e: MouseEvent) => void;
  isUnavailable?: boolean;
  dailyStatus?: Record<string, DayStatus>;
  onSetStartDate: (date: Date) => void;
}

export function CardFooter({ status, dateRange, selected, onToggleSelection, isUnavailable, dailyStatus, onSetStartDate }: CardFooterProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-auto space-y-3 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm font-medium ${isOccupied(status) ? 'text-reserved-foreground' : STATUS_TEXT_STYLES[status]}`}>
          {STATUS_TEXTS[status]}
          {dateRange && <span className="mt-1 block text-xs font-normal text-muted-foreground">{dateRange}</span>}
        </p>
        {(status === 'available' || status === 'added') && (
          <MotionButton onClick={onToggleSelection} disabled={isUnavailable} variant={selected ? 'default' : 'tonal'} aria-pressed={selected} {...buttonGesture}>
            {status === 'added' ? <X className="size-4" /> : selected ? <Check className="size-4" /> : <Plus className="size-4" />}
            {t(isUnavailable ? 'catalogDesign.unavailable' : status === 'added' ? 'catalogDesign.remove' : selected ? 'catalogDesign.selected' : 'catalogDesign.select')}
          </MotionButton>
        )}
      </div>
      <AvailabilityStrip dailyStatus={dailyStatus} isUnavailable={isUnavailable} onSetStartDate={onSetStartDate} />
    </div>
  );
}
