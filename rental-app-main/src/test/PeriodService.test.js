/**
 * Тесты для PeriodService
 */
import { describe, it, expect } from 'vitest';
import { PeriodService } from '@/core/services/PeriodService';
describe('PeriodService', () => {
    describe('getPeriodDates', () => {
        it('должен вычислять даты для недельного периода', () => {
            const { startDate, endDate } = PeriodService.getPeriodDates('week', 0);
            // Проверяем, что это понедельник и воскресенье
            expect(startDate.getDay()).toBe(1); // Понедельник
            expect(endDate.getDay()).toBe(0); // Воскресенье
            expect(endDate.getTime() - startDate.getTime()).toBe(6 * 24 * 60 * 60 * 1000); // 6 дней
        });
        it('должен вычислять даты для месячного периода', () => {
            const { startDate, endDate } = PeriodService.getPeriodDates('month', 0);
            // Проверяем, что это первый и последний день месяца
            expect(startDate.getDate()).toBe(1);
            expect(startDate.getMonth()).toBe(endDate.getMonth());
            expect(startDate.getFullYear()).toBe(endDate.getFullYear());
        });
        it('должен вычислять даты для квартального периода', () => {
            const { startDate } = PeriodService.getPeriodDates('quarter', 0);
            // Проверяем, что это первый день квартала
            expect(startDate.getDate()).toBe(1);
            expect([0, 3, 6, 9]).toContain(startDate.getMonth()); // Январь, Апрель, Июль, Октябрь
        });
        it('должен вычислять даты для годового периода', () => {
            const { startDate, endDate } = PeriodService.getPeriodDates('year', 0);
            // Проверяем, что это первый и последний день года
            expect(startDate.getMonth()).toBe(0); // Январь
            expect(startDate.getDate()).toBe(1);
            expect(endDate.getMonth()).toBe(11); // Декабрь
            expect(endDate.getDate()).toBe(31);
            expect(startDate.getFullYear()).toBe(endDate.getFullYear());
        });
        it('должен обрабатывать смещения для недельного периода', () => {
            const { startDate: currentStart, endDate: currentEnd } = PeriodService.getPeriodDates('week', 0);
            const { startDate: prevStart, endDate: prevEnd } = PeriodService.getPeriodDates('week', -1);
            // Предыдущая неделя должна быть на 7 дней раньше
            expect(currentStart.getTime() - prevStart.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
            expect(currentEnd.getTime() - prevEnd.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
        });
        it('должен обрабатывать смещения для месячного периода', () => {
            const { startDate: currentStart } = PeriodService.getPeriodDates('month', 0);
            const { startDate: prevStart } = PeriodService.getPeriodDates('month', -1);
            // Предыдущий месяц должен быть раньше текущего
            if (currentStart.getMonth() === 0) {
                expect(prevStart.getMonth()).toBe(11);
                expect(prevStart.getFullYear()).toBe(currentStart.getFullYear() - 1);
            }
            else {
                expect(prevStart.getMonth()).toBe(currentStart.getMonth() - 1);
                expect(prevStart.getFullYear()).toBe(currentStart.getFullYear());
            }
        });
        it('должен выбрасывать ошибку для недопустимого типа периода', () => {
            expect(() => {
                PeriodService.getPeriodDates('invalid', 0);
            }).toThrow('Неподдерживаемый тип периода: invalid');
        });
    });
    describe('getPeriodLabel', () => {
        it('должен генерировать метку для недельного периода', () => {
            const label = PeriodService.getPeriodLabel('week', 0);
            expect(label).toContain(' - ');
            expect(label.length).toBeGreaterThan(0);
        });
        it('должен генерировать метку для месячного периода', () => {
            const label = PeriodService.getPeriodLabel('month', 0);
            expect(label.length).toBeGreaterThan(0);
        });
        it('должен генерировать метку для квартального периода', () => {
            const label = PeriodService.getPeriodLabel('quarter', 0);
            expect(label).toContain('Квартал');
            expect(label).toMatch(/\d/); // Должен содержать номер квартала
        });
        it('должен генерировать метку для годового периода', () => {
            const label = PeriodService.getPeriodLabel('year', 0);
            expect(label).toContain(new Date().getFullYear().toString());
        });
        it('должен возвращать "Все периоды" для null', () => {
            const label = PeriodService.getPeriodLabel(null, 0);
            expect(label).toBe('Все периоды');
        });
        it('должен обрабатывать ошибки gracefully', () => {
            const label = PeriodService.getPeriodLabel('invalid', 0);
            expect(label).toBe('Ошибка периода');
        });
    });
    describe('getPeriodOptions', () => {
        it('должен возвращать список опций периодов', () => {
            const options = PeriodService.getPeriodOptions();
            expect(options).toHaveLength(4);
            expect(options.map(opt => opt.value)).toEqual(['week', 'month', 'quarter', 'year']);
            expect(options.every(opt => opt.label && opt.description)).toBe(true);
        });
        it('должен содержать корректные значения и метки', () => {
            const options = PeriodService.getPeriodOptions();
            const weekOption = options.find(opt => opt.value === 'week');
            expect(weekOption?.label).toBe('Неделя');
            const monthOption = options.find(opt => opt.value === 'month');
            expect(monthOption?.label).toBe('Месяц');
            const quarterOption = options.find(opt => opt.value === 'quarter');
            expect(quarterOption?.label).toBe('Квартал');
            const yearOption = options.find(opt => opt.value === 'year');
            expect(yearOption?.label).toBe('Год');
        });
    });
    describe('getPeriodNavigation', () => {
        it('должен возвращать корректную навигацию для выбранного периода', () => {
            const navigation = PeriodService.getPeriodNavigation('week', 0);
            expect(navigation.canGoBack).toBe(true);
            expect(navigation.canGoForward).toBe(true);
            expect(navigation.currentOffset).toBe(0);
            expect(navigation.currentLabel).toBeTruthy();
        });
        it('должен возвращать корректную навигацию для null периода', () => {
            const navigation = PeriodService.getPeriodNavigation(null, 0);
            expect(navigation.canGoBack).toBe(false);
            expect(navigation.canGoForward).toBe(false);
            expect(navigation.currentOffset).toBe(0);
            expect(navigation.currentLabel).toBe('Все периоды');
        });
        it('должен обновлять offset в навигации', () => {
            const navigation = PeriodService.getPeriodNavigation('month', -2);
            expect(navigation.currentOffset).toBe(-2);
            expect(navigation.currentLabel).toBeTruthy();
        });
    });
    describe('граничные случаи', () => {
        it('должен корректно обрабатывать переход между годами', () => {
            const { startDate } = PeriodService.getPeriodDates('month', 1);
            const currentMonth = new Date().getMonth();
            if (currentMonth === 11) { // Декабрь
                expect(startDate.getMonth()).toBe(0); // Январь
                expect(startDate.getFullYear()).toBe(new Date().getFullYear() + 1);
            }
        });
        it('должен корректно обрабатывать переход между кварталами', () => {
            const { startDate } = PeriodService.getPeriodDates('quarter', 1);
            const currentMonth = new Date().getMonth();
            if (currentMonth >= 9) { // Q4 (Октябрь, Ноябрь, Декабрь)
                expect(startDate.getMonth()).toBe(0); // Январь
                expect(startDate.getFullYear()).toBe(new Date().getFullYear() + 1);
            }
        });
        it('должен обеспечивать согласованность периодов', () => {
            const periodTypes = ['week', 'month', 'quarter', 'year'];
            periodTypes.forEach(periodType => {
                const { startDate, endDate } = PeriodService.getPeriodDates(periodType, 0);
                // Период всегда должен начинаться раньше, чем заканчиваться
                expect(startDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
                // Проверяем разумную длительность
                const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
                if (periodType === 'week') {
                    expect(daysDiff).toBe(6);
                }
                else if (periodType === 'month') {
                    expect(daysDiff).toBeGreaterThanOrEqual(27);
                    expect(daysDiff).toBeLessThanOrEqual(31);
                }
                else if (periodType === 'quarter') {
                    expect(daysDiff).toBeGreaterThanOrEqual(89);
                    expect(daysDiff).toBeLessThanOrEqual(92);
                }
                else if (periodType === 'year') {
                    expect(daysDiff === 364 || daysDiff === 365).toBe(true);
                }
            });
        });
    });
});
