import { useId } from "react";
import { Input } from "@/components/ui/input";
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
    const id = useId();
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
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarRange className="w-4 h-4" />
                Даты резерва:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label htmlFor={id + "-start"} className="block text-xs text-muted-foreground">
                        Начало:
                    </label>
                    <Input
                        id={id + "-start"}
                        aria-invalid={!!startDateError}
                        aria-describedby={startDateError ? id + "-start-error" : undefined}
                        type="date"
                        value={localStartDate}
                        onChange={handleStartDateChange}
                        disabled={disabled}
                        min={today}
                        className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-ring focus:border-primary/20 transition-colors ${
                            disabled
                                ? 'bg-muted cursor-not-allowed'
                                : 'bg-card hover:border-primary/20'
                        }`}
                    />
                    <div className="text-xs text-muted-foreground">
                        {formatDateEuropean(new Date(localStartDate))}
                    </div>
                    {startDateError && (
                        <div id={id + "-start-error"} className="text-xs text-destructive mt-1">
                            {startDateError}
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <label htmlFor={id + "-end"} className="block text-xs text-muted-foreground">
                        Окончание:
                    </label>
                    <Input
                        id={id + "-end"}
                        aria-invalid={!!endDateError}
                        aria-describedby={endDateError ? id + "-end-error" : undefined}
                        type="date"
                        value={localEndDate}
                        onChange={handleEndDateChange}
                        disabled={disabled}
                        min={localStartDate}
                        className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-ring focus:border-primary/20 transition-colors ${
                            disabled
                                ? 'bg-muted cursor-not-allowed'
                                : 'bg-card hover:border-primary/20'
                        }`}
                    />
                    <div className="text-xs text-muted-foreground">
                        {formatDateEuropean(new Date(localEndDate))}
                    </div>
                    {endDateError && (
                        <div id={id + "-end-error"} className="text-xs text-destructive mt-1">
                            {endDateError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
