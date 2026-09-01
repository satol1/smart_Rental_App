// path: rental-app-main/src/components/calendar/CalendarTable.tsx

import React, { useMemo } from "react";
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
    let d = new Date(start);
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
    const { startDate, endDate } = useDateStore();
    const { data: calendarData, isLoading: isLoadingCalendarData, isError, refetch } = useCalendarGrid(equipmentIds);

    const dateRange = useMemo(() => (startDate && endDate ? getDateRange(startDate, endDate) : []), [startDate, endDate]);
    const todayStr = useMemo(() => formatDateToDayMonthYear(new Date()), []);

    if (isLoading || isLoadingCalendarData) return <p className="text-center py-4">Загрузка календаря...</p>;
    
    if (isError) {
        return (
            <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg border border-red-200">
                <div className="space-y-3">
                    <p className="text-lg font-medium">Ошибка загрузки данных календаря</p>
                    <p className="text-sm text-red-500">
                        Произошла ошибка при получении данных с сервера. 
                        Пожалуйста, попробуйте обновить страницу или повторить запрос.
                    </p>
                    <Button 
                        onClick={() => refetch()} 
                        variant="outline" 
                        className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                    >
                        Попробовать снова
                    </Button>
                </div>
            </div>
        );
    }
    
    if (!equipment.length || !calendarData) return <p className="text-center py-4 text-gray-500">Нет данных для отображения.</p>;

    return (
        <div className="overflow-x-auto rounded-xl border bg-white shadow">
            <table className="min-w-max table-auto border-collapse">
                <thead>
                    <tr>
                        <th className="sticky left-0 z-20 bg-white border-b px-4 py-2 text-sm font-semibold min-w-[220px]" style={{ boxShadow: "2px 0 6px -2px #e0e7ef" }}>
                            Оборудование
                        </th>
                        {dateRange.map((date) => {
                            const dateStr = formatDateToDayMonthYear(date);
                            return (
                                <th key={dateStr} className={`sticky top-0 z-10 border-b px-2 py-1 text-xs font-medium min-w-[90px] truncate ${dateStr === todayStr ? "bg-sky-100 text-sky-800 border-sky-400 border-b-2" : "bg-white"}`}>
                                    {dateStr}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {equipment.map((item) => (
                        <tr key={item.id}>
                            <td className="sticky left-0 bg-white border-r px-3 py-1 z-10 min-w-[220px] text-xs text-gray-800 truncate">{item.name}</td>
                            {dateRange.map((date) => {
                                const dateStr = formatDateToDayMonthYear(date);
                                const cellData = calendarData[item.id]?.[dateStr];
                                return (
                                    <td key={dateStr} className="p-[2px] border border-white">
                                        <CalendarCell
                                            cellData={cellData} // ✅ Просто передаем cellData, даже если он undefined
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