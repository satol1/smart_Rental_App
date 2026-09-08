// path: rental-app-main/src/components/calendar/CalendarTable.tsx

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ru } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from "date-fns";
import { useCalendarGrid } from "@/hooks/useCalendarGrid";
import { useDateStore } from "@/store/dateStore";
import { isEquipmentUnderRepair } from "@/lib/equipmentUtils";
import { CalendarCell } from "./CalendarCell"; // Импортируем наш новый компонент
import { Button } from "@/components/ui/button";
import type { Equipment } from "@/types/equipment";

// ✅ Типы для пропсов обновлены и стали более точными
interface CellEventDataBase {
    orderType: 'reservation' | 'rental';
    orderId: number;
    userId: number;
}
interface CellEventDataWithEquipment extends CellEventDataBase {
    equipment: Equipment;
}

interface CalendarTableProps {
    equipment: Equipment[];
    equipmentIds: number[];
    isLoading: boolean;
    selectedGroupId: string | null;
    onSelectGroup: (groupId: string | null) => void;
    onShowDetails: (data: CellEventDataWithEquipment) => void;
    onNavigate: (data: CellEventDataBase) => void;
    isUserActionAllowed: (userId: number) => boolean;
}

const getDateRange = (start: Date, end: Date): Date[] => {
    const days = []; 
    const d = new Date(start);
    while (d <= end) { 
        days.push(new Date(d)); 
        d.setDate(d.getDate() + 1); 
    }
    return days;
};
const formatDateToDayMonthYear = (date: Date): string => format(date, "dd.MM.yyyy");

export default function CalendarTable({
    equipment, equipmentIds, isLoading, selectedGroupId,
    onSelectGroup, onShowDetails, onNavigate, isUserActionAllowed
}: CalendarTableProps) {
    const { t } = useTranslation();
    const { startDate, endDate } = useDateStore();
    const { data: calendarData, isLoading: isLoadingCalendarData, isError, refetch } = useCalendarGrid(equipmentIds);

    const dateRange = useMemo(() => (startDate && endDate ? getDateRange(startDate, endDate) : []), [startDate, endDate]);
    const todayStr = useMemo(() => formatDateToDayMonthYear(new Date()), []);

    if (isLoading || isLoadingCalendarData) {
        return (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4" role="status" aria-label={t('shell.calendarLoading')}>
                <span className="sr-only">{t('shell.calendarLoading')}</span>
                <Skeleton className="h-10 w-full" />
                {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}
            </div>
        );
    }
    if (isError) {
        return (
            <div className="rounded-xl border border-border bg-card px-4 py-10 text-center" role="alert">
                <CalendarDays className="mx-auto mb-3 h-6 w-6 text-destructive" aria-hidden="true" />
                <p className="text-base font-semibold text-foreground">{t('shell.calendarError')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('shell.calendarErrorHint')}</p>
                <Button onClick={() => refetch()} variant="outline" className="mt-5">{t('shell.retry')}</Button>
            </div>
        );
    }
    if (!equipment.length || !calendarData) {
        return (
            <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
                <CalendarDays className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium text-foreground">{t('shell.calendarEmpty')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('shell.calendarEmptyHint')}</p>
            </div>
        );
    }

    return (
        <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0} role="region" aria-label={t('shell.calendarTitle')}>
            <table className="min-w-full table-auto border-collapse text-sm">
                <caption className="sr-only">{t('shell.calendarTitle')}</caption>
                <thead>
                    <tr>
                        <th scope="col" className="sticky left-0 z-20 min-w-40 border-b border-r border-border bg-muted px-4 py-4 text-left font-semibold sm:min-w-60">
                            {t('shell.equipment')}
                        </th>
                        {dateRange.map((date) => {
                            const dateStr = formatDateToDayMonthYear(date);
                            return (
                                <th scope="col" key={dateStr} className={`min-w-24 border-b border-border px-3 py-3 text-center font-medium ${dateStr === todayStr ? 'bg-pastel-sky text-pastel-sky-fg' : 'bg-muted text-foreground'}`}>
                                    <time dateTime={format(date, 'yyyy-MM-dd')} className="block whitespace-nowrap">{format(date, 'd MMM', { locale: ru })}</time>
                                    <span className="mt-1 block text-xs font-normal opacity-75">{dateStr === todayStr ? t('shell.today') : format(date, 'EEEEEE', { locale: ru })}</span>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {equipment.map((item) => (
                        <tr key={item.id} className="group">
                            <th scope="row" className="sticky left-0 z-10 border-b border-r border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground group-hover:bg-muted">
                                <span className="block max-w-40 truncate sm:max-w-64" title={item.name}>{item.name}</span>
                            </th>
                            {dateRange.map((date) => {
                                const dateStr = formatDateToDayMonthYear(date);
                                const cellData = calendarData[item.id]?.[dateStr];
                                return (
                                    <td key={dateStr} className="border-b border-r border-border/60 p-1">
                                        <CalendarCell
                                            cellData={cellData}
                                            equipment={item}
                                            isHighlighted={cellData?.group_id === selectedGroupId}
                                            isUnderRepair={isEquipmentUnderRepair(item)}
                                            onSelect={onSelectGroup}
                                            onShowDetails={onShowDetails}
                                            onNavigate={onNavigate}
                                            isActionAllowed={isUserActionAllowed(cellData?.user_id ?? -1)}
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
