import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/dashboard/FocusItem.tsx
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { calculateDaysOverdue } from "@/lib/utils";
import { getTodayDate } from "@/lib/sortingUtils";
import UserInfo from "./UserInfo";
import EquipmentList from "./EquipmentList";
export default function FocusItem({ item, type, onClick }) {
    const today = getTodayDate();
    // Определяем стили и контент в зависимости от типа
    const getItemConfig = () => {
        switch (type) {
            case 'pickup': {
                const pickupItem = item;
                const itemStartDate = pickupItem.start_date ? new Date(pickupItem.start_date) : null;
                const isPendingPickup = pickupItem.is_pending_pickup;
                const daysPassed = itemStartDate ? differenceInDays(today, itemStartDate) : 0;
                return {
                    bgColor: isPendingPickup ? "bg-cyan-50 hover:bg-cyan-100" : "bg-blue-50 hover:bg-blue-100",
                    badgeText: isPendingPickup ? `К выдаче (-${daysPassed} дн.)` : "Выдача сегодня",
                    badgeVariant: (isPendingPickup ? "outline" : "secondary"),
                    scheduledTime: pickupItem.scheduled_time ? new Date(pickupItem.scheduled_time).toLocaleDateString('ru-RU') : 'Не указано'
                };
            }
            case 'return': {
                const returnItem = item;
                return {
                    bgColor: "bg-green-50 hover:bg-green-100",
                    badgeText: "Возврат",
                    badgeVariant: "secondary",
                    scheduledTime: returnItem.scheduled_time ? new Date(returnItem.scheduled_time).toLocaleDateString('ru-RU') : 'Не указано'
                };
            }
            case 'overdue': {
                const overdueItem = item;
                const daysOverdue = calculateDaysOverdue(overdueItem.due_date, overdueItem.days_overdue);
                return {
                    bgColor: "bg-red-50 hover:bg-red-100",
                    badgeText: "Просрочено",
                    badgeVariant: "destructive",
                    scheduledTime: daysOverdue > 0 ? `${daysOverdue} дн.` : 'Просрочено',
                    showAlertIcon: true
                };
            }
            default:
                return {
                    bgColor: "bg-gray-50 hover:bg-gray-100",
                    badgeText: "Неизвестно",
                    badgeVariant: "outline",
                    scheduledTime: "Не указано"
                };
        }
    };
    const config = getItemConfig();
    return (_jsxs("div", { className: `p-3 rounded-lg cursor-pointer ${config.bgColor} transition-colors`, onClick: onClick, children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsx(UserInfo, { userName: item.user_name, userPhone: item.user_phone, user_telegram: item.user_telegram, userStatus: item.user_status, userBalance: item.user_balance, equipmentList: item.equipment_list, scheduledTime: config.scheduledTime, type: type }), _jsxs("div", { className: "text-right ml-2", children: [_jsx(Badge, { variant: config.badgeVariant, className: "text-xs", children: config.badgeText }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: config.scheduledTime })] })] }), _jsx(EquipmentList, { equipmentList: item.equipment_list })] }));
}
