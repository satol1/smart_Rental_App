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

    if (!isManager) return null;

    const navigationItems = [
        {
            path: "/admin",
            label: "Обзор",
            icon: <Shield className="w-4 h-4" />,
            accessible: isManager
        },
        {
            path: "/admin/reservations",
            label: "Все резервы",
            icon: <ClipboardList className="w-4 h-4" />,
            accessible: isManager
        },
        // +++ НОВЫЙ ПУНКТ МЕНЮ +++
        {
            path: "/admin/rentals",
            label: "Аренды",
            icon: <Truck className="w-4 h-4" />,
            accessible: isManager
        },
        // ++++++++++++++++++++++++
        {
            path: "/admin/users",
            label: "Пользователи",
            icon: <Users className="w-4 h-4" />,
            accessible: isManager,
        },
        {
            path: "/admin/equipment",
            label: "Оборудование",
            icon: <Package className="w-4 h-4" />,
            accessible: isManager
        },
        {
            path: "/admin/accessories",
            label: "Аксессуары",
            icon: <Paperclip className="w-4 h-4" />,
            accessible: isManager
        },
        {
            path: "/admin/associations",
            label: "Ассоциации",
            icon: <Tags className="w-4 h-4" />,
            accessible: isManager
        },
        {
            path: "/admin/packs",
            label: "Управление пачками",
            icon: <PackagePlus className="w-4 h-4" />,
            accessible: isManager
        },
        {
            path: "/admin/promocodes",
            label: "Промокоды и Скидки",
            icon: <TicketPercent className="w-4 h-4" />,
            accessible: isManager
        },
        {
            path: "/admin/holidays",
            label: "Выходные дни",
            icon: <CalendarDays className="w-4 h-4" />,
            accessible: isAdmin
        },
        {
            path: "/admin/settings",
            label: "Настройки",
            icon: <Settings className="w-4 h-4" />,
            accessible: isAdmin
        }
    ];

    const isActive = (path: string) => {
        if (path === "/admin") {
            return location.pathname === "/admin";
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="bg-white border rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                    Панель управления
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/")}
                >
                    <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                    На главную
                </Button>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-4">
                <span>Роль: </span>
                <span className={`ml-1 font-medium ${
                    isAdmin ? "text-red-600" : "text-blue-600"
                }`}>
                    {user?.role === "admin" ? "Администратор" : "Менеджер"}
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {navigationItems
                    .filter(item => item.accessible)
                    .map((item) => (
                        <Button
                            key={item.path}
                            variant={isActive(item.path) ? "default" : "outline"}
                            size="sm"
                            onClick={() => navigate(item.path)}
                            className="flex items-center gap-2"
                        >
                            <span aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </Button>
                    ))
                }
            </div>
        </div>
    );
}