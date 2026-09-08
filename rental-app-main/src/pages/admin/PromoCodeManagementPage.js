import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/admin/PromoCodeManagementPage.tsx
import AdminNavigation from "@/components/admin/AdminNavigation";
import { TicketPercent } from "lucide-react";
import PromoCodeTable from "@/components/admin/PromoCodeTable";
import DurationDiscountManager from "@/components/admin/DurationDiscountManager";
export default function PromoCodeManagementPage() {
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(TicketPercent, { className: "w-8 h-8 text-purple-600" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u044B \u0438 \u0441\u043A\u0438\u0434\u043A\u0438" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435, \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u043E\u0432 \u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u0441\u043A\u0438\u0434\u043E\u043A." })] })] }), _jsx("div", { className: "bg-white rounded-lg border shadow-sm p-6", children: _jsx(PromoCodeTable, {}) }), _jsx("div", { className: "bg-white rounded-lg border shadow-sm p-6", children: _jsx(DurationDiscountManager, {}) })] }));
}
