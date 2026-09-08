/**
 * Тесты компонентов скелетонов (T033):
 * - SkeletonList рендерит ровно count карточек;
 * - SkeletonCard содержит шиммер-блоки;
 * - SkeletonTable рендерит строки и колонки;
 * - кастомный testId прокидывается.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
} from '@/components/ui/skeleton-list';

describe('SkeletonList / SkeletonCard / SkeletonTable', () => {
  it('SkeletonList рендерит count карточек', () => {
    render(<SkeletonList count={5} />);

    const list = screen.getByTestId('skeleton-list');
    expect(list).toBeInTheDocument();

    const cards = within(list).getAllByTestId('skeleton-card');
    expect(cards).toHaveLength(5);
  });

  it('SkeletonList по умолчанию рендерит 8 карточек', () => {
    render(<SkeletonList />);
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(8);
  });

  it('SkeletonCard содержит шиммер-блоки (animate-pulse)', () => {
    render(<SkeletonCard />);

    const card = screen.getByTestId('skeleton-card');
    const pulseBlocks = card.querySelectorAll('.animate-pulse');
    expect(pulseBlocks.length).toBeGreaterThanOrEqual(4);
  });

  it('SkeletonList прокидывает кастомный testId в карточки', () => {
    render(<SkeletonList count={2} testId="catalog-skeleton" />);

    expect(screen.getAllByTestId('catalog-skeleton')).toHaveLength(2);
  });

  it('SkeletonTable рендерит заголовок и ровно rows строк', () => {
    const rows = 4;
    const columns = 3;
    render(<SkeletonTable rows={rows} columns={columns} />);

    const table = screen.getByTestId('skeleton-table');
    expect(table).toBeInTheDocument();

    // Заголовочная строка: columns блоков; строки: rows * columns блоков
    const pulseBlocks = table.querySelectorAll('.animate-pulse');
    expect(pulseBlocks).toHaveLength(columns + rows * columns);
  });
});
