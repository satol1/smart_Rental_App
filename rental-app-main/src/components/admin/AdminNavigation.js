import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/AdminNavigation.tsx
import { useCurrentUser } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, Package, Shield, Home, Paperclip, ClipboardList, TicketPercent, CalendarDays, Tags, Truck, PackagePlus, Settings } from "lucide-react"; // <-- Добавлена иконка Settings
export default function AdminNavigation() {
    const { data: user } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = user?.role === "admin";
    const isManager = user?.role === "manager" || isAdmin;
    if (!isManager)
        return null;
    const navigationItems = [
        {
            path: "/admin",
            label: "Обзор",
            icon: _jsx(Shield, { className: "w-4 h-4" }),
            accessible: isManager
        },
        {
            path: "/admin/reservations",
            label: "Все резервы",
            icon: _jsx(ClipboardList, { className: "w-4 h-4" }),
            accessible: isManager
        },
        // +++ НОВЫЙ ПУНКТ МЕНЮ +++
        {
            path: "/admin/rentals",
            label: "Аренды",
            icon: _jsx(Truck, { className: "w-4 h-4" }),
            accessible: isManager
        },
        // ++++++++++++++++++++++++
        {
            path: "/admin/users",
            label: "Пользователи",
            icon: _jsx(Users, { className: "w-4 h-4" }),
            accessible: isManager,
        },
        {
            path: "/admin/equipment",
            label: "Оборудование",
            icon: _jsx(Package, { className: "w-4 h-4" }),
            accessible: isManager
        },
        {
            path: "/admin/accessories",
            label: "Аксессуары",
            icon: _jsx(Paperclip, { className: "w-4 h-4" }),
            accessible: isManager
        },
        {
            path: "/admin/associations",
            label: "Ассоциации",
            icon: _jsx(Tags, { className: "w-4 h-4" }),
            accessible: isManager
        },
        {
            path: "/admin/packs",
            label: "Управление пачками",
            icon: _jsx(PackagePlus, { className: "w-4 h-4" }),
            accessible: isManager
        },
        {
            path: "/admin/promocodes",
            label: "Промокоды и Скидки",
            icon: _jsx(TicketPercent, { className: "w-4 h-4" }),
            accessible: isManager
        },
        {
            path: "/admin/holidays",
            label: "Выходные дни",
            icon: _jsx(CalendarDays, { className: "w-4 h-4" }),
            accessible: isAdmin
        },
        {
            path: "/admin/settings",
            label: "Настройки",
            icon: _jsx(Settings, { className: "w-4 h-4" }),
            accessible: isAdmin
        }
    ];
    const isActive = (path) => {
        if (path === "/admin") {
            return location.pathname === "/admin";
        }
        return location.pathname.startsWith(path);
    };
    return (_jsxs("div", { className: "bg-white border rounded-lg shadow-sm p-4 mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\u041F\u0430\u043D\u0435\u043B\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F" }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate("/"), children: [_jsx(Home, { className: "w-4 h-4 mr-2", "aria-hidden": "true" }), "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E"] })] }), _jsxs("div", { className: "flex items-center text-sm text-gray-600 mb-4", children: [_jsx("span", { children: "\u0420\u043E\u043B\u044C: " }), _jsx("span", { className: `ml-1 font-medium ${isAdmin ? "text-red-600" : "text-blue-600"}`, children: user?.role === "admin" ? "Администратор" : "Менеджер" })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: navigationItems
                    .filter(item => item.accessible)
                    .map((item) => (_jsxs(Button, { variant: isActive(item.path) ? "default" : "outline", size: "sm", onClick: () => navigate(item.path), className: "flex items-center gap-2", children: [_jsx("span", { "aria-hidden": "true", children: item.icon }), _jsx("span", { children: item.label })] }, item.path))) })] }));
}
