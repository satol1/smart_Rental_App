import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DayStatus } from '@/types/availability';
import type { Equipment } from '@/types/equipment';

interface CellEventDataBase {
  orderType: 'reservation' | 'rental';
  orderId: number;
  userId: number;
}
interface CellEventDataWithEquipment extends CellEventDataBase { equipment: Equipment; }
interface CalendarCellProps {
  cellData?: DayStatus;
  equipment: Equipment;
  isHighlighted: boolean;
  isUnderRepair: boolean;
  onSelect: (groupId: string | null) => void;
  onShowDetails: (data: CellEventDataWithEquipment) => void;
  onNavigate: (data: CellEventDataBase) => void;
  isActionAllowed: boolean;
}

const statusSurfaces = {
  available: 'bg-success-soft',
  reserved: 'bg-reserved-soft text-reserved-foreground',
  rented: 'bg-reserved text-primary-foreground dark:text-destructive',
};

export function CalendarCell({ cellData, equipment, isHighlighted, isUnderRepair, onSelect, onShowDetails, onNavigate, isActionAllowed }: CalendarCellProps) {
  const { t } = useTranslation();
  if (!cellData || !cellData.group_id || !cellData.order_type || !cellData.user_id) {
    // Свободный день — только цвет, без подписи; ремонт подписываем текстом.
    return (
      <div
        className={cn('flex min-h-11 w-full items-center justify-center rounded-md px-2 text-xs transition-colors duration-150', isUnderRepair ? 'bg-muted text-muted-foreground' : statusSurfaces.available)}
        aria-label={t(isUnderRepair ? 'shell.underRepair' : 'shell.available')}
        title={t(isUnderRepair ? 'shell.underRepair' : 'shell.available')}
      >
        {isUnderRepair ? t('shell.underRepair') : <span className="sr-only">{t('shell.available')}</span>}
      </div>
    );
  }

  const { status, group_id, is_user_reservation: isUserEvent, user_id, order_type } = cellData;
  const orderId = parseInt(group_id.split('-')[1]);
  const eventInfo = { orderType: order_type, orderId, userId: user_id };
  const eventLabel = t('shell.eventLabel', { status: t(order_type === 'reservation' ? 'shell.reserved' : 'shell.rented'), id: orderId });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onSelect(group_id); }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (isActionAllowed) onShowDetails({ ...eventInfo, equipment });
          }}
          className={cn(
            'flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-xs outline-none transition-[transform,filter,box-shadow] duration-150 hover:z-10 hover:scale-[1.04] hover:brightness-95 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.98]',
            isUnderRepair ? 'bg-muted text-muted-foreground' : statusSurfaces[status],
            isUserEvent && 'font-semibold',
            isHighlighted && 'ring-2 ring-primary ring-inset',
          )}
          aria-pressed={isHighlighted}
          aria-label={isUserEvent ? `${eventLabel}, ${t('shell.ownEvent')}` : eventLabel}
        >
          <span className="whitespace-nowrap">{eventLabel}</span>
          {isUserEvent && <span className="text-xs font-normal opacity-80">{t('shell.ownEvent')}</span>}
        </button>
      </PopoverTrigger>
      {isActionAllowed && (
        <PopoverContent side="top" align="center" className="w-56 p-3" onClick={(event) => event.stopPropagation()}>
          <p className="mb-3 text-sm font-semibold">{eventLabel}</p>
          <div className="grid gap-2">
            <Button variant="outline" onClick={() => onShowDetails({ ...eventInfo, equipment })}>{t('shell.details')}</Button>
            <Button onClick={() => onNavigate(eventInfo)}>
              {t('shell.openOrder')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
