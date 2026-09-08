import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, addDays, startOfDay, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DayStatus } from '@/types/availability';

interface AvailabilityStripProps {
  dailyStatus?: Record<string, DayStatus>;
  isUnavailable?: boolean;
  onSetStartDate: (date: Date) => void;
}
const statusSurfaces: Record<string, string> = {
  available: 'bg-success-soft text-success',
  reserved: 'bg-warning-soft text-warning',
  rented: 'bg-danger-soft text-destructive',
  unknown: 'bg-muted text-muted-foreground',
};
const statusPreview: Record<string, string> = {
  available: 'bg-success/70', reserved: 'bg-warning/70', rented: 'bg-destructive/70', unknown: 'bg-border',
};

export default function AvailabilityStrip({ dailyStatus = {}, isUnavailable = false, onSetStartDate }: AvailabilityStripProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const dates = useMemo(() => Array.from({ length: 30 }, (_, index) => addDays(startOfDay(new Date()), index)), []);
  const statusFor = (date: Date) => isUnavailable ? 'unknown' : dailyStatus[format(date, 'dd.MM.yyyy')]?.status ?? 'unknown';
  const statusText = (status: string) => t(status === 'unknown' ? 'catalogDesign.unknownAvailability' : `catalogDesign.${status}`);
  const selectedDate = dates[selected];
  const selectedStatus = statusFor(selectedDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex min-h-11 w-full flex-col justify-center gap-2 rounded-md text-left text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('catalogDesign.availability')}>
          <span className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" />{t('catalogDesign.availability')}</span><ChevronRight className="size-3.5" aria-hidden="true" /></span>
          <span className="flex h-1 w-full gap-px overflow-hidden rounded-full" aria-hidden="true">{dates.map(date => <span key={date.toISOString()} className={cn('flex-1', statusPreview[statusFor(date)] ?? statusPreview.unknown)} />)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-1rem))] p-3 sm:p-4" side="bottom" align="center">
        <h4 className="text-base font-semibold">{t('catalogDesign.nextThirtyDays')}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{format(dates[0], 'd MMM', { locale: ru })} — {format(dates[29], 'd MMM yyyy', { locale: ru })}</p>
        <div className="my-4 grid grid-cols-7 gap-0.5" role="group" aria-label={t('catalogDesign.availability')}>
          {Array.from({ length: 7 }, (_, index) => <span key={`weekday-${index}`} className="py-1 text-center text-xs text-muted-foreground" aria-hidden="true">{format(addDays(startOfWeek(dates[0], { weekStartsOn: 1 }), index), 'EEEEEE', { locale: ru })}</span>)}
          {Array.from({ length: (dates[0].getDay() + 6) % 7 }, (_, index) => <span key={`offset-${index}`} aria-hidden="true" />)}
          {dates.map((date, index) => {
            const status = statusFor(date);
            return <button type="button" key={date.toISOString()} onClick={() => setSelected(index)} className={cn('flex min-h-11 items-center justify-center rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring', statusSurfaces[status] ?? statusSurfaces.unknown, index === selected && 'ring-2 ring-primary ring-offset-1 ring-offset-popover')} aria-pressed={index === selected} aria-label={t('catalogDesign.dateStatus', { date: format(date, 'd MMMM, EEEE', { locale: ru }), status: statusText(status) })}>{format(date, 'd')}</button>;
          })}
        </div>
        <div className="space-y-3 border-t border-border pt-3">
          <p className="text-sm" aria-live="polite">{isUnavailable ? t('catalogDesign.unavailableEquipment') : t('catalogDesign.dateStatus', { date: format(selectedDate, 'd MMMM', { locale: ru }), status: statusText(selectedStatus) })}</p>
          <Button className="w-full whitespace-normal" disabled={isUnavailable || selectedStatus !== 'available'} onClick={() => { onSetStartDate(selectedDate); setOpen(false); }}>{t('catalogDesign.useDateAndReserve')}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
