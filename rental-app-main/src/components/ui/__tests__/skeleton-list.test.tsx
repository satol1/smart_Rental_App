// src/components/ui/__tests__/skeleton-list.test.tsx
// Тесты скелетонов списков и таблиц.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
    SkeletonList,
    SkeletonCard,
    SkeletonTable,
} from '@/components/ui/skeleton-list';

describe('SkeletonList', () => {
    it('рендерит 8 карточек по умолчанию', () => {
        render(<SkeletonList />);
        const list = screen.getByTestId('skeleton-list');
        expect(list.children).toHaveLength(8);
    });

    it('рендерит заданное количество карточек', () => {
        render(<SkeletonList count={3} />);
        expect(screen.getByTestId('skeleton-list').children).toHaveLength(3);
    });

    it('прокидывает testId в карточки', () => {
        render(<SkeletonList count={2} testId="catalog-skeleton" />);
        expect(screen.getAllByTestId('catalog-skeleton')).toHaveLength(2);
    });

    it('применяет кастомные классы сетки', () => {
        render(<SkeletonList className="grid-cols-1" />);
        expect(screen.getByTestId('skeleton-list')).toHaveClass('grid-cols-1');
    });
});

describe('SkeletonCard', () => {
    it('рендерит карточку с testid по умолчанию', () => {
        render(<SkeletonCard />);
        expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
    });

    it('компактная карточка применяет классы плотной сетки', () => {
        const { container } = render(<SkeletonCard compact />);
        expect(container.firstChild).toHaveClass('p-3');
    });
});

describe('SkeletonTable', () => {
    it('рендерит таблицу с заголовком и строками', () => {
        const { container } = render(<SkeletonTable rows={4} columns={3} />);
        expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
        // заголовок + 4 строки
        expect(container.querySelectorAll('.flex.items-center')).toHaveLength(5);
    });

    it('рендерит заданное количество колонок', () => {
        const { container } = render(<SkeletonTable rows={2} columns={6} />);
        const header = container.querySelector('.flex.items-center.border-b');
        expect(header?.children).toHaveLength(6);
    });
});
