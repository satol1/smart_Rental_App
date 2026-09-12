// path: rental-app-main/src/constants/statusConstants.ts

import { CheckCircle, AlertTriangle, XCircle, Calendar, Truck } from "lucide-react";
import React from "react";

export type OrderStatus = 'active' | 'completed' | 'overdue' | 'fulfilled' | 'cancelled' | 'completed_with_debt';

interface StatusConfig {
    text: string;
    Icon: React.ElementType;
    colorClass: string;
    badgeClass: string;
}

export const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
    active: {
        text: "Активен",
        Icon: Calendar,
        colorClass: "text-primary",
        badgeClass: "bg-info-soft border-primary/30 text-primary"
    },
    completed: {
        text: "Завершен",
        Icon: CheckCircle,
        colorClass: "text-muted-foreground",
        badgeClass: "bg-muted border-border text-muted-foreground"
    },
    overdue: {
        text: "Просрочен",
        Icon: AlertTriangle,
        colorClass: "text-warning",
        badgeClass: "bg-warning-soft border-warning/30 text-warning"
    },
    fulfilled: {
        text: "Выдан в аренду",
        Icon: Truck,
        colorClass: "text-success",
        badgeClass: "bg-success-soft border-success/30 text-success"
    },
    cancelled: {
        text: "Отменен",
        Icon: XCircle,
        colorClass: "text-muted-foreground",
        badgeClass: "bg-muted border-border text-muted-foreground"
    },
    completed_with_debt: {
        text: "Закрыт с долгом",
        Icon: AlertTriangle,
        colorClass: "text-destructive",
        badgeClass: "bg-danger-soft border-destructive/30 text-destructive"
    }
};
