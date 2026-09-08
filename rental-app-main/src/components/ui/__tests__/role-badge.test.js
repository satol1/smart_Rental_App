import { jsx as _jsx } from "react/jsx-runtime";
// src/components/ui/__tests__/role-badge.test.tsx
// Тесты RoleBadge: все роли + неизвестная.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleBadge } from '@/components/ui/role-badge';
import { USER_ROLES, USER_ROLE_LABELS } from '@/constants/userConstants';
describe('RoleBadge', () => {
    it('отображает роль пользователя (client)', () => {
        render(_jsx(RoleBadge, { role: USER_ROLES.USER }));
        expect(screen.getByText(USER_ROLE_LABELS[USER_ROLES.USER])).toBeInTheDocument();
    });
    it('отображает роль менеджера', () => {
        render(_jsx(RoleBadge, { role: USER_ROLES.MANAGER }));
        expect(screen.getByText(USER_ROLE_LABELS[USER_ROLES.MANAGER])).toBeInTheDocument();
    });
    it('отображает роль админа', () => {
        render(_jsx(RoleBadge, { role: USER_ROLES.ADMIN }));
        expect(screen.getByText(USER_ROLE_LABELS[USER_ROLES.ADMIN])).toBeInTheDocument();
    });
    it('админ использует destructive-токен', () => {
        const { container } = render(_jsx(RoleBadge, { role: USER_ROLES.ADMIN }));
        expect(container.firstChild).toHaveClass('bg-destructive/10');
    });
    it('менеджер использует primary-токен', () => {
        const { container } = render(_jsx(RoleBadge, { role: USER_ROLES.MANAGER }));
        expect(container.firstChild).toHaveClass('bg-primary/10');
    });
    it('неизвестная роль рендерит нейтральный бейдж с исходной строкой', () => {
        const unknown = 'superuser';
        render(_jsx(RoleBadge, { role: unknown }));
        expect(screen.getByText('superuser')).toBeInTheDocument();
    });
    it('принимает дополнительный className', () => {
        const { container } = render(_jsx(RoleBadge, { role: USER_ROLES.USER, className: "ml-2" }));
        expect(container.firstChild).toHaveClass('ml-2');
    });
});
