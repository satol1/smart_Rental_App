// src/components/reservation/EditableDateRange.tsx

import { CalendarRange } from "lucide-react";
import { useDateRange } from "@/hooks/useDateRange";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import { formatDate, formatDateEuropean } from "@/lib/utils";

interface EditableDateRangeProps {
    startDate: Date;
    endDate: Date;
    onChange: (startDate: Date, endDate: Date, source?: 'calendar' | 'slider' | 'manual') => void;
    disabled?: boolean;
}

export default function EditableDateRange({
                                              startDate,
                                              endDate,
                                              onChange,
                                              disabled = false
                                          }: EditableDateRangeProps) {
    const {
        localStartDate,
        localEndDate,
        handleStartDateChange,
        handleEndDateChange
    } = useDateRange({
        // ✅ ИСПРАВЛЕНО: Меняем initialStartDate/initialEndDate на startDate/endDate
        startDate: startDate,
        endDate: endDate,
        onRangeChange: onChange
    });

    // ✅ НОВОЕ: Интеграция валидации выходных дней
    const { startDateError, endDateError } = useHolidayValidation(startDate, endDate);

    const today = formatDate(new Date());

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CalendarRange className="w-4 h-4" />
                Даты резерва:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label htmlFor="edit-start-date" className="block text-xs text-gray-600">
                        Начало:
                    </label>
                    <input
                        id="edit-start-date"
                        type="date"
                        value={localStartDate}
                        onChange={handleStartDateChange}
                        disabled={disabled}
                        min={today}
                        className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            disabled
                                ? 'bg-gray-100 cursor-not-allowed'
                                : 'bg-white hover:border-blue-300'
                        }`}
                    />
                    <div className="text-xs text-gray-500">
                        {formatDateEuropean(new Date(localStartDate))}
                    </div>
                    {startDateError && (
                        <div className="text-xs text-red-600 mt-1">
                            {startDateError}
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <label htmlFor="edit-end-date" className="block text-xs text-gray-600">
                        Окончание:
                    </label>
                    <input
                        id="edit-end-date"
                        type="date"
                        value={localEndDate}
                        onChange={handleEndDateChange}
                        disabled={disabled}
                        min={localStartDate}
                        className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            disabled
                                ? 'bg-gray-100 cursor-not-allowed'
                                : 'bg-white hover:border-blue-300'
                        }`}
                    />
                    <div className="text-xs text-gray-500">
                        {formatDateEuropean(new Date(localEndDate))}
                    </div>
                    {endDateError && (
                        <div className="text-xs text-red-600 mt-1">
                            {endDateError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}