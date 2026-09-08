import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// path: rental-app-main/src/components/calendar/CalendarTable.tsx
import { useMemo } from "react";
import { format } from "date-fns";
import { useCalendarGrid } from "@/hooks/useCalendarGrid";
import { useDateStore } from "@/store/dateStore";
import { isEquipmentUnderRepair } from "@/lib/equipmentUtils";
import { CalendarCell } from "./CalendarCell"; // Импортируем наш новый компонент
import { Button } from "@/components/ui/button";
const getDateRange = (start, end) => {
    const days = [];
    let d = new Date(start);
    while (d <= end) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return days;
};
const formatDateToDayMonthYear = (date) => format(date, "dd.MM.yyyy");
export default function CalendarTable({ equipment, equipmentIds, isLoading, selectedGroupId, onSelectGroup, onShowDetails, onNavigate, isUserActionAllowed }) {
    const { startDate, endDate } = useDateStore();
    const { data: calendarData, isLoading: isLoadingCalendarData, isError, refetch } = useCalendarGrid(equipmentIds);
    const dateRange = useMemo(() => (startDate && endDate ? getDateRange(startDate, endDate) : []), [startDate, endDate]);
    const todayStr = useMemo(() => formatDateToDayMonthYear(new Date()), []);
    if (isLoading || isLoadingCalendarData)
        return _jsx("p", { className: "text-center py-4", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F..." });
    if (isError) {
        return (_jsx("div", { className: "text-center py-8 text-red-600 bg-red-50 rounded-lg border border-red-200", children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-lg font-medium", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F" }), _jsx("p", { className: "text-sm text-red-500", children: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441." }), _jsx(Button, { onClick: () => refetch(), variant: "outline", className: "mt-2 border-red-300 text-red-700 hover:bg-red-100", children: "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430" })] }) }));
    }
    if (!equipment.length || !calendarData)
        return _jsx("p", { className: "text-center py-4 text-gray-500", children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F." });
    return (_jsx("div", { className: "overflow-x-auto rounded-xl border bg-white shadow", children: _jsxs("table", { className: "min-w-max table-auto border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "sticky left-0 z-20 bg-white border-b px-4 py-2 text-sm font-semibold min-w-[220px]", style: { boxShadow: "2px 0 6px -2px #e0e7ef" }, children: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435" }), dateRange.map((date) => {
                                const dateStr = formatDateToDayMonthYear(date);
                                return (_jsx("th", { className: `sticky top-0 z-10 border-b px-2 py-1 text-xs font-medium min-w-[90px] truncate ${dateStr === todayStr ? "bg-sky-100 text-sky-800 border-sky-400 border-b-2" : "bg-white"}`, children: dateStr }, dateStr));
                            })] }) }), _jsx("tbody", { children: equipment.map((item) => (_jsxs("tr", { children: [_jsx("td", { className: "sticky left-0 bg-white border-r px-3 py-1 z-10 min-w-[220px] text-xs text-gray-800 truncate", children: item.name }), dateRange.map((date) => {
                                const dateStr = formatDateToDayMonthYear(date);
                                const cellData = calendarData[item.id]?.[dateStr];
                                return (_jsx("td", { className: "p-[2px] border border-white", children: _jsx(CalendarCell, { cellData: cellData, equipment: item, isHighlighted: cellData?.group_id === selectedGroupId, isUnderRepair: isEquipmentUnderRepair(item), onSelect: onSelectGroup, onShowDetails: onShowDetails, onNavigate: onNavigate, isActionAllowed: isUserActionAllowed(cellData?.user_id ?? -1) }) }, dateStr));
                            })] }, item.id))) })] }) }));
}
