// src/components/ui/status-badge.tsx

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STATUS_CONFIG,
  type OrderStatus,
} from "@/constants/statusConstants";
import {
  USER_STATUS,
  type UserStatus,
} from "@/constants/userStatusConstants";

/**
 * Единый бейдж статуса для резервов, аренд и пользователей.
 *
 * Поддерживает:
 *  - статусы заказов (OrderStatus): active | completed | overdue | fulfilled | cancelled
 *  - статусы пользователей (UserStatus): Новый | Постоянный | VIP | Заблокирован | Персона НонГрата
 *
 * Цветовая карта построена на CSS-переменных-токенах темы
 * (info / success / warning / destructive / muted) и автоматически
 * адаптируется к тёмной теме.
 */

export type BadgeStatus = OrderStatus | UserStatus;

interface StatusStyle {
  /** Текст на бейдже */
  label: string;
  /** Классы на токенах темы: фон/текст/рамка */
  className: string;
}

const ORDER_STATUS_STYLES: Record<OrderStatus, StatusStyle> = {
  active: {
    label: STATUS_CONFIG.active.text,
    className:
      "border-transparent bg-info-soft text-pastel-sky-fg",
  },
  completed: {
    label: STATUS_CONFIG.completed.text,
    className:
      "border-border bg-secondary text-secondary-foreground",
  },
  overdue: {
    label: STATUS_CONFIG.overdue.text,
    className:
      "border-transparent bg-danger-soft text-destructive",
  },
  fulfilled: {
    label: STATUS_CONFIG.fulfilled.text,
    className:
      "border-transparent bg-success-soft text-success",
  },
  cancelled: {
    label: STATUS_CONFIG.cancelled.text,
    className:
      "border-border bg-muted text-muted-foreground",
  },
  completed_with_debt: {
    label: STATUS_CONFIG.completed_with_debt.text,
    className:
      "border-transparent bg-danger-soft text-destructive",
  },
};

const USER_STATUS_STYLES: Record<UserStatus, StatusStyle> = {
  [USER_STATUS.NEW]: {
    label: USER_STATUS.NEW,
    className:
      "border-border bg-muted text-muted-foreground",
  },
  [USER_STATUS.REGULAR]: {
    label: USER_STATUS.REGULAR,
    className:
      "border-transparent bg-info-soft text-pastel-sky-fg",
  },
  [USER_STATUS.VIP]: {
    label: USER_STATUS.VIP,
    className:
      "border-transparent bg-warning-soft text-warning",
  },
  [USER_STATUS.BLOCKED]: {
    label: USER_STATUS.BLOCKED,
    className:
      "border-transparent bg-danger-soft text-destructive",
  },
  [USER_STATUS.PERSONA_NON_GRATA]: {
    label: USER_STATUS.PERSONA_NON_GRATA,
    className:
      "border-destructive bg-destructive text-destructive-foreground",
  },
};

const STATUS_STYLES: Record<BadgeStatus, StatusStyle> = {
  ...ORDER_STATUS_STYLES,
  ...USER_STATUS_STYLES,
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Статус заказа (OrderStatus) или пользователя (UserStatus) */
  status: BadgeStatus;
  /** Показывать текст бейджа (иконка без текста не предусмотрена) */
  withLabel?: boolean;
}

export function StatusBadge({
  status,
  withLabel = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = STATUS_STYLES[status];

  // Неизвестный статус — нейтральный бейдж с исходной строкой
  if (!config) {
    return (
      <Badge
        variant="outline"
        className={cn("font-medium", className)}
        {...props}
      >
        {withLabel ? String(status) : null}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", config.className, className)}
      {...props}
    >
      {withLabel ? config.label : null}
    </Badge>
  );
}

export default StatusBadge;
