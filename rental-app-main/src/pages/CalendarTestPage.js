import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/CalendarTestPage.tsx
// Этот файл содержит полный код для страницы с кастомизированным календарём.
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { ru } from 'date-fns/locale'; // Импортируем русскую локаль для названий
export default function CalendarTestPage() {
    // Локальное состояние для хранения выбранного диапазона дат
    const [range, setRange] = useState();
    return (
    // Контейнер для центрирования календаря на странице
    _jsxs("div", { className: "p-10 bg-gray-100 min-h-screen flex flex-col items-center justify-center", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-800 text-center mb-6", children: "\u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u0441 \u043A\u0440\u0430\u0441\u043D\u044B\u043C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435\u043C" }), _jsx("div", { className: "bg-white p-4 rounded-lg shadow-lg border", children: _jsx(DayPicker, { mode: "range", locale: ru, selected: range, onSelect: setRange, numberOfMonths: 2, showOutsideDays: true, 
                    // Стили для основных элементов календаря, взятые из вашего проекта
                    classNames: {
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
                    }, 
                    // Стили для состояний дней (модификаторов)
                    modifiersClassNames: {
                        today: 'bg-accent text-accent-foreground',
                        // Синие цвета для выбранных дат
                        selected: 'bg-sky-600 text-white hover:bg-sky-600 hover:text-white focus:bg-sky-600 focus:text-white',
                        // Скругления для начала и конца диапазона
                        range_start: 'rounded-l-full',
                        range_end: 'rounded-r-full',
                        range_middle: 'aria-selected:bg-sky-100 aria-selected:text-sky-900',
                        outside: 'day-outside text-muted-foreground opacity-50',
                        disabled: 'text-muted-foreground opacity-50',
                    } }) }), _jsxs("div", { className: "mt-4 p-4 bg-white rounded-lg shadow-lg border text-sm text-gray-700", children: [_jsx("p", { children: "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D:" }), range?.from ? (_jsx("pre", { className: "mt-2 font-mono", children: JSON.stringify(range, null, 2) })) : (_jsx("p", { className: "text-gray-500 italic mt-1", children: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E" }))] })] }));
}
