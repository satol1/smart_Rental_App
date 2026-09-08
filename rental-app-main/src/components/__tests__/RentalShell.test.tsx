import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createRef } from 'react';
import Header from '@/components/layout/Header';
import DateRangeSelector from '@/components/DateRangeSelector';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import ReservationFooter from '@/components/ReservationFooter';
import { useDateStore } from '@/store/dateStore';
import { CalendarCell } from '@/components/calendar/CalendarCell';
import BrandLogo from '@/components/shared/BrandLogo';
import type { Equipment } from '@/types/equipment';
import type { DayStatus } from '@/types/availability';

const mocks = vi.hoisted(() => ({
  user: null as null | { role: string },
  resetHomePage: vi.fn(),
  syncWithDateStore: vi.fn(),
  refreshCalculator: vi.fn(),
  fetchHolidays: vi.fn(),
  holidays: [new Date(2030, 5, 12)],
}));

vi.mock('@/hooks/useProfile', () => ({ useCurrentUser: () => ({ data: mocks.user, isLoading: false }) }));
vi.mock('@/hooks/useHomePageReset', () => ({ useHomePageReset: () => ({ resetHomePage: mocks.resetHomePage }) }));
vi.mock('@/components/layout/UserNav', () => ({ default: () => <button>Личный кабинет</button> }));
vi.mock('@/components/layout/ThemeSwitcher', () => ({ default: () => <button>Тема оформления</button> }));
vi.mock('@/components/shared/ContactDialog', () => ({ ContactDialog: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="Контакты" /> : null }));
vi.mock('@/components/shared/AuthDialog', () => ({ default: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="Вход" /> : null }));
vi.mock('@/store/holidayStore', () => ({ useHolidayStore: () => ({ holidays: mocks.holidays, fetchHolidays: mocks.fetchHolidays }) }));
vi.mock('@/store/sandboxCalculatorStore', () => ({ useSandboxCalculatorStore: () => ({ isCalculatorVisible: false, syncWithDateStore: mocks.syncWithDateStore, refreshCalculator: mocks.refreshCalculator }) }));

function Location() { return <output aria-label="Маршрут">{useLocation().pathname}</output>; }

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  useDateStore.getState().setRange(new Date(2030, 5, 10), new Date(2030, 5, 11));
});

describe('rental navigation', () => {
  it('responds to a logo press and settles without intercepting its click action', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(<button onClick={onClick}><BrandLogo showText={false} /></button>);
    const mark = screen.getByRole('img', { name: 'Цифровой' });
    const shutter = container.querySelector('g')!;
    const outline = container.querySelector('svg > path')!;
    const originalOutline = outline.getAttribute('d');
    await user.pointer({ target: mark, keys: '[MouseLeft>]' });
    await waitFor(() => expect(shutter.style.transform).toContain('rotate('));
    await user.pointer({ keys: '[/MouseLeft]' });
    await waitFor(() => expect(shutter.style.transform).toBe('none'));
    expect(onClick).toHaveBeenCalledOnce();
    expect(outline).toHaveAttribute('d', originalOutline);
  });

  it('closes the mobile menu with Escape and returns keyboard focus', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Header /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: 'Открыть меню' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    expect(trigger).toHaveFocus();
  });

  it('preserves calendar and order navigation in the signed-in mobile menu', async () => {
    mocks.user = { role: 'client' };
    const user = userEvent.setup();
    render(<MemoryRouter><Header /><Location /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    const mobileNav = document.getElementById('mobile-navigation')!;
    expect(within(mobileNav).getByRole('link', { name: 'Календарь' })).toHaveAttribute('href', '/calendar');
    await user.click(within(mobileNav).getByRole('link', { name: 'Мои заказы' }));
    expect(screen.getByLabelText('Маршрут')).toHaveTextContent('/reservations/my');
    expect(screen.getByRole('button', { name: 'Открыть меню' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks the active route and preserves home reset and sign-in actions', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MemoryRouter initialEntries={['/rules']}><Header /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Наши правила' })).toHaveAttribute('aria-current', 'page');
    unmount();
    render(<MemoryRouter><Header /></MemoryRouter>);
    await user.click(screen.getByRole('link', { name: /сбросить фильтры/i }));
    expect(mocks.resetHomePage).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByRole('dialog', { name: 'Вход' })).toBeInTheDocument();
  });
});

describe('rental dates', () => {
  it('expands using keyboard and keeps holidays disabled in the existing calendar', async () => {
    const user = userEvent.setup();
    const { container } = render(<DateRangeSelector containerRef={createRef<HTMLDivElement>()} />);
    const expand = screen.getAllByRole('button', { name: 'Изменить даты' })[0];
    expand.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Свернуть календарь' })).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('[data-day="2030-06-12"] button')).toBeDisabled();
    expect(screen.getByLabelText('Начало аренды')).toHaveValue('2030-06-10');
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Следующий месяц' })).toBeInTheDocument();
    expect(screen.getAllByRole('grid')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /selected|Today|next month|previous month/i })).not.toBeInTheDocument();
    expect(mocks.fetchHolidays).toHaveBeenCalled();
  });

  it('switches between one and two months without resetting the viewed month or selected dates', async () => {
    const user = userEvent.setup();
    const originalMatchMedia = window.matchMedia;
    let onChange: (() => void) | undefined;
    const media = {
      matches: false,
      media: '(min-width: 640px)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, listener: () => void) => { onChange = listener; }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    };
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query) => query === media.media ? media : originalMatchMedia(query));
    try {
      const { unmount } = render(<DateRangeSelector containerRef={createRef<HTMLDivElement>()} />);
      await user.click(screen.getAllByRole('button', { name: 'Изменить даты' })[0]);
      expect(screen.getAllByRole('grid')).toHaveLength(1);
      await user.click(screen.getByRole('button', { name: 'Следующий месяц' }));
      const viewedMonth = screen.getByRole('grid').getAttribute('aria-label');
      act(() => { media.matches = true; onChange?.(); });
      expect(screen.getAllByRole('grid')).toHaveLength(2);
      expect(screen.getAllByRole('grid')[0]).toHaveAttribute('aria-label', viewedMonth);
      expect(screen.getByLabelText('Начало аренды')).toHaveValue('2030-06-10');
      act(() => { media.matches = false; onChange?.(); });
      expect(screen.getAllByRole('grid')).toHaveLength(1);
      expect(screen.getByRole('grid')).toHaveAttribute('aria-label', viewedMonth);
      unmount();
      expect(media.removeEventListener).toHaveBeenCalledWith('change', onChange);
    } finally {
      matchMediaSpy.mockRestore();
    }
  });

  it('syncs compact manual dates with the store and preserves holiday adjustment', () => {
    render(<CalendarDateInputRange compact />);
    fireEvent.change(screen.getByLabelText('Окончание аренды'), { target: { value: '2030-06-12' } });
    expect(useDateStore.getState().endDate.getDate()).toBe(13);
    expect(screen.getByLabelText('Окончание аренды')).toHaveValue('2030-06-13');
    expect(mocks.syncWithDateStore).toHaveBeenCalled();
  });
});

describe('fixed selection footer', () => {
  it('appears on selection outside transformed page content and keeps checkout and reset live', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onReset = vi.fn();
    const props = { selectedCount: 0, onClick, onReset, isEditingMode: false };
    const { rerender, container } = render(<div style={{ transform: 'translateY(8px)' }}><ReservationFooter {...props} /></div>);
    expect(screen.queryByRole('complementary', { name: 'Ваш выбор' })).not.toBeInTheDocument();
    rerender(<div style={{ transform: 'translateY(8px)' }}><ReservationFooter {...props} selectedCount={2} /></div>);
    const footer = screen.getByRole('complementary', { name: 'Ваш выбор' });
    expect(footer.parentElement).toBe(document.body);
    expect(container).not.toContainElement(footer);
    expect(footer).toHaveClass('fixed', 'bottom-0');
    expect(footer).toHaveTextContent('2 позиции');
    await user.click(within(footer).getByRole('button', { name: 'Оформить резерв' }));
    await user.click(within(footer).getByRole('button', { name: 'Сбросить выбор' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('preserves adding items to an existing reservation', () => {
    render(<ReservationFooter selectedCount={1} onClick={vi.fn()} onReset={vi.fn()} isEditingMode />);
    expect(screen.getByRole('button', { name: 'Добавить к резерву' })).toBeInTheDocument();
  });
});

describe('calendar event access', () => {
  const equipment: Equipment = { id: 1, name: 'Sony A7 IV', brand: 'Sony', equipment_type: 'Камера', condition: 'good', daily_rate: 2000, accessories: [] };
  const cellData: DayStatus = { status: 'reserved', group_id: 'reservation-42', user_id: 7, order_type: 'reservation', is_user_reservation: true };

  it('supports keyboard selection and exposes details for allowed orders', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onShowDetails = vi.fn();
    const onNavigate = vi.fn();
    render(<CalendarCell equipment={equipment} cellData={cellData} isHighlighted={false} isUnderRepair={false} isActionAllowed onSelect={onSelect} onShowDetails={onShowDetails} onNavigate={onNavigate} />);
    screen.getByRole('button', { name: 'Резерв №42, Ваш заказ' }).focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('reservation-42');
    await user.click(screen.getByRole('button', { name: 'Подробнее' }));
    expect(onShowDetails).toHaveBeenCalledWith({ orderType: 'reservation', orderId: 42, userId: 7, equipment });
    await user.click(screen.getByRole('button', { name: 'Перейти к заказу' }));
    expect(onNavigate).toHaveBeenCalledWith({ orderType: 'reservation', orderId: 42, userId: 7 });
  });

  it('keeps another user’s restricted event selectable without details or navigation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onShowDetails = vi.fn();
    const onNavigate = vi.fn();
    render(<CalendarCell equipment={equipment} cellData={{ ...cellData, is_user_reservation: false }} isHighlighted={false} isUnderRepair={false} isActionAllowed={false} onSelect={onSelect} onShowDetails={onShowDetails} onNavigate={onNavigate} />);
    const event = screen.getByRole('button', { name: 'Резерв №42' });
    await user.click(event);
    fireEvent.doubleClick(event);
    expect(onSelect).toHaveBeenCalledWith('reservation-42');
    expect(onShowDetails).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Подробнее' })).not.toBeInTheDocument();
  });
});
