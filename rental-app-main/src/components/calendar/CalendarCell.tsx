// path: rental-app-main/src/components/calendar/CalendarCell.tsx

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayStatus } from "@/types/availability";
import type { Equipment } from "@/types/equipment";

// Типы для колбэков
interface CellEventDataBase {
    orderType: 'reservation' | 'rental';
    orderId: number;
    userId: number;
}
interface CellEventDataWithEquipment extends CellEventDataBase {
    equipment: Equipment;
}

interface CalendarCellProps {
    cellData?: DayStatus; // ✅ Сделаем cellData опциональным
    equipment: Equipment;
    isHighlighted: boolean;
    isUnderRepair: boolean;
    onSelect: (groupId: string | null) => void;
    onShowDetails: (data: CellEventDataWithEquipment) => void;
    onNavigate: (data: CellEventDataBase) => void;
    isActionAllowed: boolean;
}

// --- НОВАЯ КОРРЕКТНАЯ ПАЛИТРА ---
// Цвета для событий других пользователей
const cellBgMap = {
    available: "bg-emerald-100", // Светло-салатовый для свободных ячеек
    reserved: "bg-amber-200",    // Менее яркий оранжевый для чужих резервов
    rented: "bg-rose-200"        // Светло-красный для чужих аренд
};

// Цвета для событий ТЕКУЩЕГО пользователя (более яркие)
const userCellBgMap = {
    available: "bg-emerald-100", // Такой же, как у всех
    reserved: "bg-amber-400",    // Яркий оранжевый для МОИХ резервов
    rented: "bg-rose-400"        // Более темный красный для МОИХ аренд
};

const grayscaleCellBgMap = {
    available: "bg-gray-200",
    reserved: "bg-gray-300",
    rented: "bg-gray-400"
};

export function CalendarCell({
    cellData, equipment, isHighlighted, isUnderRepair,
    onSelect, onShowDetails, onNavigate, isActionAllowed
}: CalendarCellProps) {

    // ✅ ГЛАВНОЕ ИЗМЕНЕНИЕ: "Ранний выход" для пустых ячеек
    // Если нет данных о событии, рендерим простую ячейку и выходим из компонента.
    // Это гарантирует, что код ниже никогда не выполнится для пустой ячейки.
    if (!cellData || !cellData.group_id || !cellData.order_type || !cellData.user_id) {
        const bgColor = isUnderRepair ? grayscaleCellBgMap.available : cellBgMap.available;
        return <div className={`w-full h-6 rounded-md ${bgColor}`} />;
    }

    // Этот код выполнится только если cellData - валидный объект события
    const { status, group_id, is_user_reservation: isUserEvent, user_id, order_type } = cellData;
    const orderId = parseInt(group_id.split('-')[1]);
    
    const eventInfo = { orderType: order_type, orderId, userId: user_id };
    
    const handleSingleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(group_id);
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isActionAllowed) {
            onShowDetails({ ...eventInfo, equipment });
        }
    };
    
    // ✅ Логика выбора цвета теперь будет работать корректно
    const currentBgMap = isUnderRepair ? grayscaleCellBgMap : isUserEvent ? userCellBgMap : cellBgMap;
    const bgColor = currentBgMap[status] || currentBgMap.available;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div
                    onClick={handleSingleClick}
                    onDoubleClick={handleDoubleClick}
                    className={cn(
                        "w-full h-6 rounded-md transition-colors cursor-pointer",
                        bgColor,
                        isHighlighted && "ring-2 ring-sky-500 ring-inset"
                    )}
                    title={`${status} #${orderId}`}
                />
            </PopoverTrigger>
            {isActionAllowed && (
                <PopoverContent side="top" align="center" className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-2">
                        <div className="text-sm font-medium">{order_type === 'reservation' ? 'Резерв' : 'Аренда'} #{orderId}</div>
                        <Button onClick={() => onNavigate(eventInfo)} size="sm" className="w-full">
                            <ArrowRight className="w-3 h-3 mr-1" /> Перейти
                        </Button>
                    </div>
                </PopoverContent>
            )}
        </Popover>
    );
}
