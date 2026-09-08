/**
 * Тесты для PeriodFilter компонента
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PeriodFilter, PeriodFilterCompact } from '@/components/admin/PeriodFilter';
import { useOrderFilterStore } from '@/store/orderFilterStore';

// Мокаем store
vi.mock('@/store/orderFilterStore', () => ({
  useOrderFilterStore: vi.fn()
}));

// Мокаем PeriodService
vi.mock('@/core/services/PeriodService', () => ({
  PeriodService: {
    getPeriodOptions: vi.fn(() => [
      { value: 'week', label: 'Неделя', description: 'Текущая неделя' },
      { value: 'month', label: 'Месяц', description: 'Текущий месяц' },
      { value: 'quarter', label: 'Квартал', description: 'Текущий квартал' },
      { value: 'year', label: 'Год', description: 'Текущий год' }
    ]),
    getPeriodNavigation: vi.fn(() => ({
      canGoBack: true,
      canGoForward: true,
      currentOffset: 0,
      currentLabel: 'Текущий период'
    }))
  }
}));

describe('PeriodFilter', () => {
  const mockStore = {
    periodType: null,
    periodOffset: 0,
    setPeriodType: vi.fn(),
    setPeriodOffset: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useOrderFilterStore as any).mockReturnValue(mockStore);
  });

  it('должен рендериться без ошибок', () => {
    render(<PeriodFilter />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Все периоды')).toBeInTheDocument();
  });

  it('должен отображать выбранный тип периода', () => {
    (useOrderFilterStore as any).mockReturnValue({
      ...mockStore,
      periodType: 'week'
    });

    render(<PeriodFilter />);

    expect(screen.getByText('Неделя')).toBeInTheDocument();
  });

  it('должен вызывать setPeriodType при изменении типа периода', async () => {
    render(<PeriodFilter />);

    const select = screen.getByRole('combobox');
    fireEvent.click(select);

    await waitFor(() => {
      const weekOption = screen.getByText('Неделя');
      fireEvent.click(weekOption);
    });

    expect(mockStore.setPeriodType).toHaveBeenCalledWith('week');
    expect(mockStore.setPeriodOffset).toHaveBeenCalledWith(0);
  });

  it('должен сбрасывать период при выборе "Все периоды"', async () => {
    (useOrderFilterStore as any).mockReturnValue({
      ...mockStore,
      periodType: 'week'
    });

    render(<PeriodFilter />);

    const select = screen.getByRole('combobox');
    fireEvent.click(select);

    await waitFor(() => {
      const allOptions = screen.getAllByText('Все периоды');
      // Опция в выпадающем списке обычно последняя
      fireEvent.click(allOptions[allOptions.length - 1]);
    });

    expect(mockStore.setPeriodType).toHaveBeenCalledWith(null);
    expect(mockStore.setPeriodOffset).toHaveBeenCalledWith(0);
  });

  it('должен отображать кнопки навигации только при выбранном периоде', () => {
    // Без выбранного периода
    render(<PeriodFilter />);

    expect(screen.queryByRole('button', { name: /предыдущий/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /следующий/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /текущий/i })).not.toBeInTheDocument();
  });

  it('должен отображать кнопки навигации при выбранном периоде', () => {
    (useOrderFilterStore as any).mockReturnValue({
      ...mockStore,
      periodType: 'week'
    });

    render(<PeriodFilter />);

    expect(screen.getByRole('button', { name: /предыдущий/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /следующий/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /текущий/i })).toBeInTheDocument();
  });

  it('должен вызывать setPeriodOffset при навигации', () => {
    (useOrderFilterStore as any).mockReturnValue({
      ...mockStore,
      periodType: 'week',
      periodOffset: 0
    });

    render(<PeriodFilter />);

    const prevButton = screen.getByRole('button', { name: /предыдущий/i });
    fireEvent.click(prevButton);

    expect(mockStore.setPeriodOffset).toHaveBeenCalledWith(-1);

    const nextButton = screen.getByRole('button', { name: /следующий/i });
    fireEvent.click(nextButton);

    expect(mockStore.setPeriodOffset).toHaveBeenCalledWith(1);
  });

  it('должен сбрасывать offset при нажатии на "Текущий период"', () => {
    (useOrderFilterStore as any).mockReturnValue({
      ...mockStore,
      periodType: 'week',
      periodOffset: 2
    });

    render(<PeriodFilter />);

    const currentButton = screen.getByRole('button', { name: /текущий/i });
    fireEvent.click(currentButton);

    expect(mockStore.setPeriodOffset).toHaveBeenCalledWith(0);
  });

  it('должен отображать текущую метку периода', () => {
    (useOrderFilterStore as any).mockReturnValue({
      ...mockStore,
      periodType: 'week'
    });

    render(<PeriodFilter />);

    expect(screen.getByText('Текущий период')).toBeInTheDocument();
  });

  it('должен применять переданный className', () => {
    const { container } = render(<PeriodFilter className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('PeriodFilterCompact', () => {
  const mockStore = {
    periodType: null,
    periodOffset: 0,
    setPeriodType: vi.fn(),
    setPeriodOffset: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useOrderFilterStore as any).mockReturnValue(mockStore);
  });

  it('должен рендериться без ошибок', () => {
    render(<PeriodFilterCompact />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Все')).toBeInTheDocument();
  });

  it('должен отображать кнопки навигации при выбранном периоде', () => {
    (useOrderFilterStore as any).mockReturnValue({
      ...mockStore,
      periodType: 'week'
    });

    render(<PeriodFilterCompact />);

    expect(screen.getByRole('button', { name: /предыдущий/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /следующий/i })).toBeInTheDocument();
  });

  it('должен иметь компактный размер', () => {
    render(<PeriodFilterCompact />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('w-[100px]', 'h-8');
  });

  it('должен применять переданный className', () => {
    const { container } = render(<PeriodFilterCompact className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('Интеграционные тесты PeriodFilter', () => {
  it('должен корректно работать с полным циклом выбора периода', async () => {
    const mockSetPeriodType = vi.fn();
    const mockSetPeriodOffset = vi.fn();

    // Статичный mockReturnValue не обновлял periodType — навигационные кнопки
    // (рендерятся только при выбранном periodType) не появлялись и тест падал.
    // Делаем мок "живым": store отражает применённый setPeriodType.
    let mockPeriodType: string | null = null;
    mockSetPeriodType.mockImplementation((value: string | null) => { mockPeriodType = value; });
    (useOrderFilterStore as any).mockImplementation(() => ({
      periodType: mockPeriodType,
      periodOffset: 0,
      setPeriodType: mockSetPeriodType,
      setPeriodOffset: mockSetPeriodOffset
    }));

    const { rerender } = render(<PeriodFilter />);

    // Выбираем тип периода
    const select = screen.getByRole('combobox');
    fireEvent.click(select);

    await waitFor(() => {
      const weekOptions = screen.getAllByText('Неделя');
      fireEvent.click(weekOptions[weekOptions.length - 1]);
    });

    expect(mockSetPeriodType).toHaveBeenCalledWith('week');
    expect(mockSetPeriodOffset).toHaveBeenCalledWith(0);

    // Мок-стор не уведомляет React об изменении (это делает настоящий zustand),
    // поэтому ре-рендерим компонент вручную — с уже применённым periodType
    rerender(<PeriodFilter />);

    // Навигируемся по периодам
    const nextButton = screen.getByRole('button', { name: /следующий/i });
    fireEvent.click(nextButton);

    expect(mockSetPeriodOffset).toHaveBeenCalledWith(1);

    // Возвращаемся к текущему периоду
    const currentButton = screen.getByRole('button', { name: /текущий/i });
    fireEvent.click(currentButton);

    expect(mockSetPeriodOffset).toHaveBeenCalledWith(0);
  });

  it('должен корректно обрабатывать смену типа периода', async () => {
    const mockSetPeriodType = vi.fn();
    const mockSetPeriodOffset = vi.fn();

    (useOrderFilterStore as any).mockReturnValue({
      periodType: 'week',
      periodOffset: 2,
      setPeriodType: mockSetPeriodType,
      setPeriodOffset: mockSetPeriodOffset
    });

    render(<PeriodFilter />);

    // Меняем тип периода
    const select = screen.getByRole('combobox');
    fireEvent.click(select);

    await waitFor(() => {
      const monthOptions = screen.getAllByText('Месяц');
      fireEvent.click(monthOptions[monthOptions.length - 1]);
    });

    expect(mockSetPeriodType).toHaveBeenCalledWith('month');
    expect(mockSetPeriodOffset).toHaveBeenCalledWith(0); // Offset должен сброситься
  });
});
