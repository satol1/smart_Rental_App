import { jsx as _jsx } from "react/jsx-runtime";
// src/components/ui/role-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { USER_ROLES, USER_ROLE_LABELS, } from "@/constants/userConstants";
/**
 * Единый бейдж роли пользователя (client/user | manager | admin).
 * Цвета — на CSS-переменных-токенах темы, адаптируются к тёмной теме.
 */
const ROLE_STYLES = {
    [USER_ROLES.USER]: "border-border bg-muted text-muted-foreground",
    [USER_ROLES.MANAGER]: "border-primary/30 bg-primary/10 text-primary",
    [USER_ROLES.ADMIN]: "border-destructive/40 bg-destructive/10 text-destructive",
};
export function RoleBadge({ role, className, ...props }) {
    const roleStyle = ROLE_STYLES[role];
    if (!roleStyle) {
        return (_jsx(Badge, { variant: "outline", className: cn("font-medium", className), ...props, children: String(role) }));
    }
    return (_jsx(Badge, { variant: "outline", className: cn("font-medium", roleStyle, className), ...props, children: USER_ROLE_LABELS[role] }));
}
export default RoleBadge;
