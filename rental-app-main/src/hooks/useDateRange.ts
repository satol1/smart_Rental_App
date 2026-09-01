// src/hooks/useDateRange.ts

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { DateService } from '@/core/services';

interface UseDateRangeProps {
    startDate: Date;
    endDate: Date;
    onRangeChange: (startDate: Date, endDate: Date, source?: 'calendar' | 'slider' | 'manual', holidays?: Date[]) => void;
    holidays?: Date[];
}

interface UseDateRangeReturn {
    localStartDate: string;
    localEndDate: string;
    handleStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useDateRange({
                                 startDate,
                                 endDate,
                                 onRangeChange,
                                 holidays = [] // Устанавливаем значение по умолчанию
                             }: UseDateRangeProps): UseDateRangeReturn {
    // Локальное состояние для input'ов всегда в формате 'YYYY-MM-DD'
    const [localStartDate, setLocalStartDate] = useState<string>(formatDate(startDate));
    const [localEndDate, setLocalEndDate] = useState<string>(formatDate(endDate));

    // Синхронизируем локальное состояние, если пропсы изменились извне
    useEffect(() => {
        setLocalStartDate(formatDate(startDate));
        setLocalEndDate(formatDate(endDate));
    }, [startDate, endDate]);

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartDate = new Date(e.target.value);
        if (DateService.isValidDate(newStartDate)) {
            // Если дата окончания оказалась раньше новой даты начала, корректируем ее
            const adjustedRange = DateService.adjustDateRange(newStartDate, endDate);
            // Вызываем колбэк с объектами Date и передаем holidays
            onRangeChange(adjustedRange.startDate, adjustedRange.endDate, 'manual', holidays);
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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