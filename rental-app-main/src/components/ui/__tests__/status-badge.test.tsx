// src/components/ui/__tests__/status-badge.test.tsx
// Тесты StatusBadge: все статусы заказов и пользователей + неизвестный статус.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/status-badge';
import { STATUS_CONFIG } from '@/constants/statusConstants';
import { USER_STATUS } from '@/constants/userStatusConstants';

describe('StatusBadge — статусы заказов', () => {
    it('отображает текст статуса active', () => {
        render(<StatusBadge status="active" />);
        expect(screen.getByText(STATUS_CONFIG.active.text)).toBeInTheDocument();
    });

    it('отображает текст статуса completed', () => {
        render(<StatusBadge status="completed" />);
        expect(screen.getByText(STATUS_CONFIG.completed.text)).toBeInTheDocument();
    });

    it('отображает текст статуса overdue', () => {
        render(<StatusBadge status="overdue" />);
        expect(screen.getByText(STATUS_CONFIG.overdue.text)).toBeInTheDocument();
    });

    it('отображает текст статуса fulfilled', () => {
        render(<StatusBadge status="fulfilled" />);
        expect(screen.getByText(STATUS_CONFIG.fulfilled.text)).toBeInTheDocument();
    });

    it('отображает текст статуса cancelled', () => {
        render(<StatusBadge status="cancelled" />);
        expect(screen.getByText(STATUS_CONFIG.cancelled.text)).toBeInTheDocument();
    });

    it.each([
        ['active', 'bg-info-soft'],
        ['overdue', 'bg-danger-soft'],
        ['fulfilled', 'bg-success-soft'],
    ] as const)('статус %s использует токен-класс %s', (status, tokenClass) => {
        const { container } = render(<StatusBadge status={status} />);
        expect(container.firstChild).toHaveClass(tokenClass);
    });
});

describe('StatusBadge — статусы пользователей', () => {
    it('отображает статус Новый', () => {
        render(<StatusBadge status={USER_STATUS.NEW} />);
        expect(screen.getByText(USER_STATUS.NEW)).toBeInTheDocument();
    });

    it('отображает статус Постоянный', () => {
        render(<StatusBadge status={USER_STATUS.REGULAR} />);
        expect(screen.getByText(USER_STATUS.REGULAR)).toBeInTheDocument();
    });

    it('отображает статус VIP', () => {
        render(<StatusBadge status={USER_STATUS.VIP} />);
        expect(screen.getByText(USER_STATUS.VIP)).toBeInTheDocument();
    });

    it('отображает статус Заблокирован', () => {
        render(<StatusBadge status={USER_STATUS.BLOCKED} />);
        expect(screen.getByText(USER_STATUS.BLOCKED)).toBeInTheDocument();
    });

    it('отображает статус Персона НонГрата', () => {
        render(<StatusBadge status={USER_STATUS.PERSONA_NON_GRATA} />);
        expect(screen.getByText(USER_STATUS.PERSONA_NON_GRATA)).toBeInTheDocument();
    });

    it('VIP использует жёлтый chart-токен', () => {
        const { container } = render(<StatusBadge status={USER_STATUS.VIP} />);
        expect(container.firstChild).toHaveClass('bg-warning-soft');
    });
});

describe('StatusBadge — прочее', () => {
    it('неизвестный статус рендерит нейтральный бейдж с исходной строкой', () => {
        const unknown = 'mystery-status' as never;
        const { container } = render(<StatusBadge status={unknown} />);
        expect(screen.getByText('mystery-status')).toBeInTheDocument();
        expect(container.firstChild).not.toHaveClass('bg-info-soft');
    });

    it('withLabel=false скрывает текст', () => {
        render(<StatusBadge status="active" withLabel={false} />);
        expect(screen.queryByText(STATUS_CONFIG.active.text)).not.toBeInTheDocument();
    });

    it('принимает дополнительный className', () => {
        const { container } = render(<StatusBadge status="active" className="text-xs" />);
        expect(container.firstChild).toHaveClass('text-xs');
    });
});
