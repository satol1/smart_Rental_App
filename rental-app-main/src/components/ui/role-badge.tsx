// src/components/ui/role-badge.tsx

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  type UserRole,
} from "@/constants/userConstants";

/**
 * Единый бейдж роли пользователя (client/user | manager | admin).
 * Цвета — на CSS-переменных-токенах темы, адаптируются к тёмной теме.
 */

const ROLE_STYLES: Record<UserRole, string> = {
  [USER_ROLES.USER]: "border-border bg-muted text-muted-foreground",
  [USER_ROLES.MANAGER]: "border-border bg-secondary text-secondary-foreground",
  [USER_ROLES.ADMIN]: "border-border bg-secondary text-foreground",
};

export interface RoleBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Системное имя роли: user | manager | admin */
  role: UserRole;
}

export function RoleBadge({ role, className, ...props }: RoleBadgeProps) {
  const roleStyle = ROLE_STYLES[role];

  if (!roleStyle) {
    return (
      <Badge variant="outline" className={cn("font-medium", className)} {...props}>
        {String(role)}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", roleStyle, className)}
      {...props}
    >
      {USER_ROLE_LABELS[role]}
    </Badge>
  );
}

export default RoleBadge;
