import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, startOfDay } from 'date-fns';
import AvailabilityStrip from '@/components/AvailabilityStrip';

describe('Календарь доступности карточки', () => {
  it('не предлагает резервировать дату при отсутствии данных', async () => {
    const user = userEvent.setup();
    const onSetStartDate = vi.fn();
    render(<AvailabilityStrip onSetStartDate={onSetStartDate} />);
    await user.click(screen.getByRole('button', { name: 'Календарь доступности' }));
    expect(screen.getByRole('button', { name: 'Выбрать дату и добавить в резерв' })).toBeDisabled();
    expect(screen.getByText(/Нет данных о доступности/)).toBeVisible();
    expect(onSetStartDate).not.toHaveBeenCalled();
  });

  it('доступная дата вызывает существующее действие только после явного выбора', async () => {
    const user = userEvent.setup();
    const onSetStartDate = vi.fn();
    const today = startOfDay(new Date());
    render(<AvailabilityStrip dailyStatus={{ [format(today, 'dd.MM.yyyy')]: { status: 'available', group_id: null, is_user_reservation: false } }} onSetStartDate={onSetStartDate} />);
    const trigger = screen.getByRole('button', { name: 'Календарь доступности' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(onSetStartDate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Выбрать дату и добавить в резерв' }));
    expect(onSetStartDate).toHaveBeenCalledOnce();
    expect(onSetStartDate).toHaveBeenCalledWith(today);
    expect(screen.queryByText('Ближайшие 30 дней')).not.toBeInTheDocument();
  });

  it('не разрешает добавление недоступной техники даже при свободном дне', async () => {
    const user = userEvent.setup();
    render(<AvailabilityStrip isUnavailable dailyStatus={{ [format(new Date(), 'dd.MM.yyyy')]: { status: 'available', group_id: null, is_user_reservation: false } }} onSetStartDate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Календарь доступности' }));
    expect(screen.getByRole('button', { name: 'Выбрать дату и добавить в резерв' })).toBeDisabled();
  });
});
