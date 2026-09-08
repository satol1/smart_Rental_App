import { jsx as _jsx } from "react/jsx-runtime";
// src/components/ui/status-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, } from "@/constants/statusConstants";
import { USER_STATUS, } from "@/constants/userStatusConstants";
const ORDER_STATUS_STYLES = {
    active: {
        label: STATUS_CONFIG.active.text,
        className: "border-primary/30 bg-primary/10 text-primary",
    },
    completed: {
        label: STATUS_CONFIG.completed.text,
        className: "border-border bg-secondary text-secondary-foreground",
    },
    overdue: {
        label: STATUS_CONFIG.overdue.text,
        className: "border-destructive/40 bg-destructive/10 text-destructive",
    },
    fulfilled: {
        label: STATUS_CONFIG.fulfilled.text,
        className: "border-chart-2/40 bg-chart-2/10 text-chart-2",
    },
    cancelled: {
        label: STATUS_CONFIG.cancelled.text,
        className: "border-border bg-muted text-muted-foreground",
    },
};
const USER_STATUS_STYLES = {
    [USER_STATUS.NEW]: {
        label: USER_STATUS.NEW,
        className: "border-border bg-muted text-muted-foreground",
    },
    [USER_STATUS.REGULAR]: {
        label: USER_STATUS.REGULAR,
        className: "border-primary/30 bg-primary/10 text-primary",
    },
    [USER_STATUS.VIP]: {
        label: USER_STATUS.VIP,
        className: "border-chart-4/50 bg-chart-4/15 text-chart-4",
    },
    [USER_STATUS.BLOCKED]: {
        label: USER_STATUS.BLOCKED,
        className: "border-destructive/40 bg-destructive/10 text-destructive",
    },
    [USER_STATUS.PERSONA_NON_GRATA]: {
        label: USER_STATUS.PERSONA_NON_GRATA,
        className: "border-destructive bg-destructive text-destructive-foreground",
    },
};
const STATUS_STYLES = {
    ...ORDER_STATUS_STYLES,
    ...USER_STATUS_STYLES,
};
export function StatusBadge({ status, withLabel = true, className, ...props }) {
    const config = STATUS_STYLES[status];
    // Неизвестный статус — нейтральный бейдж с исходной строкой
    if (!config) {
        return (_jsx(Badge, { variant: "outline", className: cn("font-medium", className), ...props, children: withLabel ? String(status) : null }));
    }
    return (_jsx(Badge, { variant: "outline", className: cn("font-medium", config.className, className), ...props, children: withLabel ? config.label : null }));
}
export default StatusBadge;
