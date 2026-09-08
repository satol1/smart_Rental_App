import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from '@/components/FilterPanel';
import { CuratedCollections } from '@/components/catalog/CuratedCollections';
import { useFilterStore } from '@/store/filterStore';
import { useSearchStore } from '@/store/searchStore';
import { useDateStore } from '@/store/dateStore';
import type { Association } from '@/types/association';
import type { Equipment } from '@/types/equipment';

const associations: Association[] = [{ id: 12, name: 'Портретная съёмка', sort_order: 1, equipment_ids: [42] }];
vi.mock('@/hooks/useAssociations', () => ({ useAssociations: () => ({ data: associations }) }));

const equipment: Equipment[] = [{ id: 42, name: 'Портретный объектив', brand: 'Canon', equipment_type: 'Объективы', condition: 'Хорошее', daily_rate: 1000, accessories: [], image_url: '/portrait.jpg' }];
const filters = { availableTypes: ['Фотокамеры', 'Объективы', 'Студийный свет'], availableBrands: [{ id: 1, name: 'Canon' }, { id: 2, name: 'Sony' }], availableAssociations: associations, hasActiveFilters: false };

beforeEach(() => { useFilterStore.getState().reset(); useSearchStore.getState().setQuery(''); });

describe('Профессиональные фильтры каталога', () => {
  it('сразу показывает все категории, бренды и подборки; сочетает фильтры с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...filters} />);
    const categories = screen.getByRole('group', { name: 'Категория' });
    const brands = screen.getByRole('group', { name: 'Бренд' });
    expect(within(categories).getByRole('button', { name: 'Студийный свет' })).toBeVisible();
    expect(within(brands).getByRole('button', { name: 'Sony' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Портретная съёмка' })).toBeVisible();
    await user.click(within(categories).getByRole('button', { name: 'Объективы' }));
    within(brands).getByRole('button', { name: 'Canon' }).focus();
    await user.keyboard('{Enter}');
    expect(useFilterStore.getState()).toMatchObject({ type: 'Объективы', brandSystemId: 1 });
  });

  it('сбрасывает поиск и фильтры вместе, не меняя срок аренды', async () => {
    const user = userEvent.setup();
    const dates = { start: useDateStore.getState().startDate, end: useDateStore.getState().endDate };
    useSearchStore.getState().setQuery('Canon');
    useFilterStore.getState().setType('Объективы');
    render(<FilterPanel {...filters} />);
    await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    expect(useSearchStore.getState().query).toBe('');
    expect(useFilterStore.getState().type).toBeNull();
    expect(useDateStore.getState().startDate).toEqual(dates.start);
    expect(useDateStore.getState().endDate).toEqual(dates.end);
  });
});

describe('Кураторские подборки', () => {
  it('открывает реальную подборку, убирает конфликтующий поиск и переводит фокус в каталог', async () => {
    const user = userEvent.setup();
    useFilterStore.setState({ type: 'Фотокамеры', brandSystemId: 2, availableOnly: true });
    useSearchStore.getState().setQuery('Sony');
    render(<><CuratedCollections equipment={equipment} /><section id="equipment-catalog" tabIndex={-1}>Каталог</section></>);
    const collection = screen.getByRole('button', { name: /Портретная съёмка/ });
    collection.focus();
    await user.keyboard('{Enter}');
    expect(useFilterStore.getState()).toMatchObject({ associationId: 12, type: null, brandSystemId: null, availableOnly: true });
    expect(useSearchStore.getState().query).toBe('');
    expect(document.getElementById('equipment-catalog')).toHaveFocus();
    expect(collection).toHaveAttribute('aria-pressed', 'true');
  });
});
