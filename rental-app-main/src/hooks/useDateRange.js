// src/hooks/useDateRange.ts
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { DateService } from '@/core/services';
export function useDateRange({ startDate, endDate, onRangeChange, holidays = [] // Устанавливаем значение по умолчанию
 }) {
    // Локальное состояние для input'ов всегда в формате 'YYYY-MM-DD'
    const [localStartDate, setLocalStartDate] = useState(formatDate(startDate));
    const [localEndDate, setLocalEndDate] = useState(formatDate(endDate));
    // Синхронизируем локальное состояние, если пропсы изменились извне
    useEffect(() => {
        setLocalStartDate(formatDate(startDate));
        setLocalEndDate(formatDate(endDate));
    }, [startDate, endDate]);
    const handleStartDateChange = (e) => {
        const newStartDate = new Date(e.target.value);
        if (DateService.isValidDate(newStartDate)) {
            // Если дата окончания оказалась раньше новой даты начала, корректируем ее
            const adjustedRange = DateService.adjustDateRange(newStartDate, endDate);
            // Вызываем колбэк с объектами Date и передаем holidays
            onRangeChange(adjustedRange.startDate, adjustedRange.endDate, 'manual', holidays);
        }
    };
    const handleEndDateChange = (e) => {
        const newEndDate = new Date(e.target.value);
        if (DateService.isValidDate(newEndDate)) {
            // Если дата окончания оказалась раньше даты начала, корректируем ее
            const adjustedRange = DateService.adjustDateRange(startDate, newEndDate);
            // Вызываем колбэк с объектами Date и передаем holidays
            onRangeChange(adjustedRange.startDate, adjustedRange.endDate, 'manual', holidays);
        }
    };
    return {
        localStartDate,
        localEndDate,
        handleStartDateChange,
        handleEndDateChange,
    };
}
