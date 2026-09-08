import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/admin/HolidayManagementPage.tsx
import AdminNavigation from "@/components/admin/AdminNavigation";
import HolidayManager from "@/components/admin/HolidayManager"; // Этот компонент мы создадим далее
import { CalendarDays } from "lucide-react";
export default function HolidayManagementPage() {
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(CalendarDays, { className: "w-8 h-8 text-cyan-600" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u043C\u0438 \u0434\u043D\u044F\u043C\u0438" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\u041D\u0430\u0437\u043D\u0430\u0447\u044C\u0442\u0435 \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u0447\u043D\u044B\u0435 \u0438 \u043D\u0435\u0440\u0430\u0431\u043E\u0447\u0438\u0435 \u0434\u043D\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043D\u0435 \u0431\u0443\u0434\u0443\u0442 \u0442\u0430\u0440\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F." })] })] }), _jsx("div", { className: "bg-white rounded-lg border shadow-sm p-6", children: _jsx(HolidayManager, {}) })] }));
}
