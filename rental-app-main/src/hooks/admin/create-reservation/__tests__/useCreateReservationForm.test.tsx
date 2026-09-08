// src/hooks/admin/create-reservation/__tests__/useCreateReservationForm.test.tsx
// Тесты формы создания резерва: значения по умолчанию и валидация дат.

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateReservationForm } from '../useCreateReservationForm';

describe('useCreateReservationForm', () => {
    it('инициализирует форму значениями по умолчанию', () => {
        const { result } = renderHook(() => useCreateReservationForm());

        const values = result.current.form.getValues();
        expect(values.equipment_ids).toEqual([]);
        expect(values.selected_accessories).toEqual({});
        expect(values.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(values.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(values.deposit_amount).toBe(0);
        expect(values.prepayment_amount).toBe(0);
    });

    it('дата окончания позже даты начала по умолчанию', () => {
        const { result } = renderHook(() => useCreateReservationForm());
        const { start_date, end_date } = result.current.form.getValues();

        expect(new Date(end_date).getTime()).toBeGreaterThan(new Date(start_date).getTime());
    });

    it('валидация требует пользователя', async () => {
        const { result } = renderHook(() => useCreateReservationForm());

        let valid = true;
        await act(async () => {
            valid = await result.current.trigger(['user_id']);
        });

        expect(valid).toBe(false);
        // trigger() === false уже означает ошибку валидации поля
    });

    it('валидация требует оборудование', async () => {
        const { result } = renderHook(() => useCreateReservationForm());

        let valid = true;
        await act(async () => {
            valid = await result.current.trigger(['equipment_ids']);
        });

        expect(valid).toBe(false);
        // trigger() === false уже означает ошибку валидации поля
    });

    it('валидация отклоняет дату окончания раньше начала', async () => {
        const { result } = renderHook(() => useCreateReservationForm());

        act(() => {
            result.current.form.setValue('user_id', 1);
            result.current.form.setValue('start_date', '2026-09-20');
            result.current.form.setValue('end_date', '2026-09-10');
            result.current.form.setValue('equipment_ids', [5]);
        });

        // Кросс-полевая refine-валидация дат выполняется при валидации всей схемы
        let valid = true;
        await act(async () => {
            valid = await result.current.trigger();
        });

        expect(valid).toBe(false);
    });

    it('валидация проходит при корректных данных', async () => {
        const { result } = renderHook(() => useCreateReservationForm());

        act(() => {
            result.current.form.setValue('user_id', 1);
            result.current.form.setValue('start_date', '2026-09-10');
            result.current.form.setValue('end_date', '2026-09-12');
            result.current.form.setValue('equipment_ids', [5]);
        });

        let valid = false;
        await act(async () => {
            valid = await result.current.trigger();
        });

        expect(valid).toBe(true);
    });

    it('reset возвращает форму к значениям по умолчанию', () => {
        const { result } = renderHook(() => useCreateReservationForm());

        act(() => {
            result.current.form.setValue('equipment_ids', [1, 2, 3]);
            result.current.reset();
        });

        expect(result.current.form.getValues('equipment_ids')).toEqual([]);
    });
});
