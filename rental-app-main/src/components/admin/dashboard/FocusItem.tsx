// src/components/admin/dashboard/FocusItem.tsx

import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { calculateDaysOverdue } from "@/lib/utils";
import { getTodayDate } from "@/lib/sortingUtils";
import type { PickupReturnItem, OverdueRentalItem } from "@/hooks/admin/useDashboardData";
import UserInfo from "./UserInfo";
import EquipmentList from "./EquipmentList";

interface FocusItemProps {
    item: PickupReturnItem | OverdueRentalItem;
    type: 'pickup' | 'return' | 'overdue';
    onClick: () => void;
}

export default function FocusItem({ item, type, onClick }: FocusItemProps) {
    const today = getTodayDate();

    // Определяем стили и контент в зависимости от типа
    const getItemConfig = () => {
        switch (type) {
            case 'pickup': {
                const pickupItem = item as PickupReturnItem;
                const itemStartDate = pickupItem.start_date ? new Date(pickupItem.start_date) : null;
                const isPendingPickup = pickupItem.is_pending_pickup;
                const daysPassed = itemStartDate ? differenceInDays(today, itemStartDate) : 0;

                return {
                    bgColor: isPendingPickup ? "bg-info-soft/60 hover:bg-info-soft" : "bg-accent/60 hover:bg-accent",
                    badgeText: isPendingPickup ? `К выдаче (-${daysPassed} дн.)` : "Выдача сегодня",
                    badgeVariant: (isPendingPickup ? "outline" : "secondary") as "outline" | "secondary",
                    scheduledTime: pickupItem.scheduled_time ? new Date(pickupItem.scheduled_time).toLocaleDateString('ru-RU') : 'Не указано'
                };
            }
            case 'return': {
                const returnItem = item as PickupReturnItem;
                return {
                    bgColor: "bg-success-soft/60 hover:bg-success-soft",
                    badgeText: "Возврат",
                    badgeVariant: "secondary" as "secondary",
                    scheduledTime: returnItem.scheduled_time ? new Date(returnItem.scheduled_time).toLocaleDateString('ru-RU') : 'Не указано'
                };
            }
            case 'overdue': {
                const overdueItem = item as OverdueRentalItem;
                const daysOverdue = calculateDaysOverdue(overdueItem.due_date, overdueItem.days_overdue);
                return {
                    bgColor: "bg-danger-soft/60 hover:bg-danger-soft",
                    badgeText: "Просрочено",
                    badgeVariant: "destructive" as "destructive",
                    scheduledTime: daysOverdue > 0 ? `${daysOverdue} дн.` : 'Просрочено',
                    showAlertIcon: true
                };
            }
            default:
                return {
                    bgColor: "bg-muted/60 hover:bg-muted",
                    badgeText: "Неизвестно",
                    badgeVariant: "outline" as const,
                    scheduledTime: "Не указано"
                };
        }
    };

    const config = getItemConfig();

    return (
        <div 
            className={`p-3 rounded-lg cursor-pointer ${config.bgColor} transition-colors`}
            onClick={onClick}
        >
            <div className="flex justify-between items-start">
                {/* Левая часть - информация о пользователе */}
                <UserInfo 
                    userName={item.user_name}
                    userPhone={item.user_phone}
                    user_telegram={item.user_telegram}
                    userStatus={item.user_status}
                    userBalance={item.user_balance}
                    equipmentList={item.equipment_list}
                    scheduledTime={config.scheduledTime}
                    type={type}
                />
                
                {/* Правая часть - статус и время */}
                <div className="text-right ml-2">
                    <Badge variant={config.badgeVariant} className="text-xs">
                        {config.badgeText}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                        {config.scheduledTime}
                    </p>
                </div>
            </div>
            
            {/* Список оборудования */}
            <EquipmentList equipmentList={item.equipment_list} />
        </div>
    );
}
