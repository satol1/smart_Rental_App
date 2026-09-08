import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/AccessoryManagementPage.tsx
import AdminNavigation from "@/components/admin/AdminNavigation";
// ✅ ИМПОРТИРУЕМ РЕАЛЬНЫЙ КОМПОНЕНТ
import AccessoryTable from "@/components/admin/AccessoryTable";
import { Button } from "@/components/ui/button";
import { Shield, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useProfile";
export default function AccessoryManagementPage() {
    const { data: currentUser } = useCurrentUser();
    const navigate = useNavigate();
    const isManager = currentUser?.role === "manager" || currentUser?.role === "admin";
    if (!isManager) {
        return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8 text-center", children: [_jsx(Shield, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" }), _jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: "\u0414\u043E\u0441\u0442\u0443\u043F \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D" }), _jsx("p", { className: "text-gray-600 mb-4", children: "\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u0430\u0432 \u0434\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u044D\u0442\u043E\u043C\u0443 \u0440\u0430\u0437\u0434\u0435\u043B\u0443." }), _jsx(Button, { onClick: () => navigate("/"), children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })] }));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Paperclip, { className: "w-8 h-8 text-purple-600" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u0430\u043C\u0438" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435, \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u043E\u0432." })] })] }), _jsx("div", { className: "bg-white rounded-lg border shadow-sm p-6", children: _jsx(AccessoryTable, {}) })] }));
}
