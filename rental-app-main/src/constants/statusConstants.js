// path: rental-app-main/src/constants/statusConstants.ts
import { CheckCircle, AlertTriangle, XCircle, Calendar, Truck } from "lucide-react";
export const STATUS_CONFIG = {
    active: {
        text: "Активен",
        Icon: Calendar,
        colorClass: "text-blue-600",
        badgeClass: "bg-blue-50 border-blue-200 text-blue-800"
    },
    completed: {
        text: "Завершен",
        Icon: CheckCircle,
        colorClass: "text-gray-600",
        badgeClass: "bg-gray-100 border-gray-200 text-gray-800"
    },
    overdue: {
        text: "Просрочен",
        Icon: AlertTriangle,
        colorClass: "text-orange-600",
        badgeClass: "bg-orange-50 border-orange-200 text-orange-800"
    },
    fulfilled: {
        text: "Выдан в аренду",
        Icon: Truck,
        colorClass: "text-green-600",
        badgeClass: "bg-green-50 border-green-200 text-green-800"
    },
    cancelled: {
        text: "Отменен",
        Icon: XCircle,
        colorClass: "text-gray-600",
        badgeClass: "bg-gray-100 border-gray-200 text-gray-800"
    }
};
