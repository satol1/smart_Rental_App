// src/pages/CalendarTestPage.tsx
// Этот файл содержит полный код для страницы с кастомизированным календарём.

import { useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ru } from 'date-fns/locale'; // Импортируем русскую локаль для названий

export default function CalendarTestPage() {
    // Локальное состояние для хранения выбранного диапазона дат
    const [range, setRange] = useState<DateRange | undefined>();

    return (
        // Контейнер для центрирования календаря на странице
        <div className="p-10 bg-gray-100 min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
                Тестовый календарь с красным выделением
            </h1>

            <div className="bg-white p-4 rounded-lg shadow-lg border">
                <DayPicker
                    mode="range"
                    locale={ru} // Используем русскую локаль
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={2}
                    showOutsideDays
                    // Стили для основных элементов календаря, взятые из вашего проекта
                    classNames={{
                        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                        month: 'space-y-4',
                        table: 'w-full border-collapse space-y-1',
                        head_row: 'flex',
                        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                        row: 'flex w-full mt-2',
                        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                        day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                        nav: 'space-x-1 flex items-center',
                        caption: 'flex justify-center pt-1 relative items-center',
                        caption_label: 'text-sm font-medium',
                        nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
                    }}
                    // Стили для состояний дней (модификаторов)
                    modifiersClassNames={{
                        today: 'bg-accent text-accent-foreground',
                        // Синие цвета для выбранных дат
                        selected: 'bg-sky-600 text-white hover:bg-sky-600 hover:text-white focus:bg-sky-600 focus:text-white',
                        // Скругления для начала и конца диапазона
                        range_start: 'rounded-l-full',
                        range_end: 'rounded-r-full',
                        range_middle: 'aria-selected:bg-sky-100 aria-selected:text-sky-900',
                        outside: 'day-outside text-muted-foreground opacity-50',
                        disabled: 'text-muted-foreground opacity-50',
                    }}
                />
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg shadow-lg border text-sm text-gray-700">
                <p>Выбранный диапазон:</p>
                {range?.from ? (
                    <pre className="mt-2 font-mono">{JSON.stringify(range, null, 2)}</pre>
                ) : (
                    <p className="text-gray-500 italic mt-1">Ничего не выбрано</p>
                )}
            </div>
        </div>
    );
}