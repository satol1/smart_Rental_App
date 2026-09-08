import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// path: rental-app-main/src/components/AvailabilityStrip.tsx
import { useState } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from './ui/button';
const cellColorMap = {
    available: 'bg-green-500 hover:bg-green-600',
    reserved: 'bg-yellow-500 hover:bg-yellow-600',
    rented: 'bg-red-500 hover:bg-red-600',
    default: 'bg-gray-400 hover:bg-gray-500'
};
const grayscaleColorMap = {
    available: 'bg-gray-300 hover:bg-gray-400',
    reserved: 'bg-gray-400 hover:bg-gray-500',
    rented: 'bg-gray-500 hover:bg-gray-600',
    default: 'bg-gray-200 hover:bg-gray-300'
};
export default function AvailabilityStrip({ dailyStatus = {}, isUnavailable = false, onSetStartDate }) {
    // 2. Вся логика, связанная с useDateStore и useHolidayStore, удалена
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const [popoverData, setPopoverData] = useState(null);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() + i);
        return date;
    });
    const handleCellClick = (date, status) => {
        setPopoverData({ date, status });
        setPopoverOpen(true);
    };
    // 3. Обработчик теперь просто вызывает функцию из пропсов
    const handleSetAsStartDate = () => {
        if (!popoverData)
            return;
        onSetStartDate(popoverData.date);
        setPopoverOpen(false);
    };
    const statusTextMap = {
        available: 'Свободно',
        reserved: 'В резерве',
        rented: 'В аренде',
        default: 'Нет данных'
    };
    return (_jsxs(Popover, { open: isPopoverOpen, onOpenChange: setPopoverOpen, children: [_jsx(PopoverAnchor, { asChild: true, children: _jsx("div", { className: "w-full h-3 mt-auto flex rounded-sm overflow-hidden border border-gray-400 cursor-pointer", title: "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u044C \u0438 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0430\u0442\u044B", children: dates.map(date => {
                        const dateStr = format(date, 'dd.MM.yyyy');
                        const status = dailyStatus[dateStr]?.status ?? 'available';
                        const colorMap = isUnavailable ? grayscaleColorMap : cellColorMap;
                        const color = colorMap[status] ?? colorMap.default;
                        return (_jsx("button", { className: `flex-1 h-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 z-10 ${color}`, onClick: () => handleCellClick(date, status), "aria-label": `Статус на ${dateStr}: ${statusTextMap[status]}` }, dateStr));
                    }) }) }), _jsx(PopoverContent, { className: "w-auto p-3 bg-white border rounded-md shadow-lg text-sm", side: "bottom", align: "center", onCloseAutoFocus: (e) => e.preventDefault(), sideOffset: 5, children: popoverData && (_jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: [_jsx("strong", { children: "\u0414\u0430\u0442\u0430:" }), " ", format(popoverData.date, "PPP", { locale: ru })] }), _jsxs("p", { children: [_jsx("strong", { children: "\u0421\u0442\u0430\u0442\u0443\u0441:" }), " ", statusTextMap[popoverData.status] ?? 'Неизвестно'] }), popoverData.status === 'available' && (_jsx(Button, { size: "sm", className: "mt-2 w-full", onClick: handleSetAsStartDate, children: "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0434\u0430\u0442\u043E\u0439 \u043D\u0430\u0447\u0430\u043B\u0430 \u0438 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0440\u0435\u0437\u0435\u0440\u0432" }))] })) })] }));
}
