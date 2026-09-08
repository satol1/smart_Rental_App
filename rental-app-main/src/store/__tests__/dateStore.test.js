// src/store/__tests__/dateStore.test.ts
// Тесты dateStore: диапазоны дат, счётчик дней, сброс.
import { describe, it, expect, beforeEach } from 'vitest';
import { useDateStore } from '@/store/dateStore';
describe('dateStore', () => {
    beforeEach(() => {
        useDateStore.getState().reset();
    });
    it('setRange устанавливает диапазон', () => {
        const start = new Date(2026, 8, 10);
        const end = new Date(2026, 8, 15);
        useDateStore.getState().setRange(start, end);
        const s = useDateStore.getState();
        expect(s.startDate.getDate()).toBe(10);
        expect(s.endDate.getDate()).toBe(15);
    });
    it('setRange нормализует время к полудню', () => {
        const start = new Date(2026, 8, 10, 3, 30);
        const end = new Date(2026, 8, 12, 22, 0);
        useDateStore.getState().setRange(start, end);
        const s = useDateStore.getState();
        expect(s.startDate.getHours()).toBe(12);
        expect(s.endDate.getHours()).toBe(12);
    });
    it('setRange с концом раньше начала расширяет конец на +1 день', () => {
        const start = new Date(2026, 8, 10);
        const end = new Date(2026, 8, 8);
        useDateStore.getState().setRange(start, end);
        const s = useDateStore.getState();
        expect(s.endDate.getTime()).toBeGreaterThan(s.startDate.getTime());
    });
    it('setRange пересчитывает dayCount', () => {
        useDateStore.getState().setRange(new Date(2026, 8, 10), new Date(2026, 8, 13));
        expect(useDateStore.getState().dayCount).toBeGreaterThan(0);
    });
    it('setStartDate сохраняет конец, если диапазон валиден', () => {
        useDateStore.getState().setRange(new Date(2026, 8, 10), new Date(2026, 8, 15));
        useDateStore.getState().setStartDate(new Date(2026, 8, 12));
        const s = useDateStore.getState();
        expect(s.startDate.getDate()).toBe(12);
        expect(s.endDate.getDate()).toBe(15);
    });
    it('setStartDate сдвигает конец при инверсии диапазона', () => {
        useDateStore.getState().setRange(new Date(2026, 8, 10), new Date(2026, 8, 15));
        useDateStore.getState().setStartDate(new Date(2026, 8, 20));
        const s = useDateStore.getState();
        expect(s.endDate.getTime()).toBeGreaterThan(s.startDate.getTime());
    });
    it('setEndDate игнорирует дату раньше начала', () => {
        useDateStore.getState().setRange(new Date(2026, 8, 10), new Date(2026, 8, 15));
        const before = useDateStore.getState().endDate;
        useDateStore.getState().setEndDate(new Date(2026, 8, 1));
        expect(useDateStore.getState().endDate.getTime()).toBe(before.getTime());
    });
    it('setDayCount увеличивает диапазон', () => {
        useDateStore.getState().setRange(new Date(2026, 8, 10), new Date(2026, 8, 11));
        const initialEnd = useDateStore.getState().endDate.getTime();
        useDateStore.getState().setDayCount(5);
        expect(useDateStore.getState().endDate.getTime()).toBeGreaterThan(initialEnd);
    });
    it('reset возвращает диапазон на сегодня/завтра', () => {
        useDateStore.getState().setRange(new Date(2026, 8, 10), new Date(2026, 8, 20));
        useDateStore.getState().reset();
        const s = useDateStore.getState();
        const today = new Date();
        expect(s.startDate.getDate()).toBe(today.getDate());
        expect(s.endDate.getTime()).toBeGreaterThan(s.startDate.getTime());
    });
    it('initializeDates задаёт валидный диапазон', () => {
        useDateStore.getState().initializeDates([]);
        const s = useDateStore.getState();
        expect(s.startDate.getTime()).toBeLessThan(s.endDate.getTime());
        expect(s.dayCount).toBeGreaterThan(0);
    });
});
