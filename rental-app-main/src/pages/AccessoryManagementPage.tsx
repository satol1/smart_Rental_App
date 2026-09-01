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
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Доступ ограничен</h1>
                <p className="text-gray-600 mb-4">
                    У вас нет прав для доступа к этому разделу.
                </p>
                <Button onClick={() => navigate("/")}>На главную</Button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <AdminNavigation />
            <div className="flex items-center gap-3">
                <Paperclip className="w-8 h-8 text-purple-600" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Управление аксессуарами
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Добавление, редактирование и удаление аксессуаров.
                    </p>
                </div>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-6">
                {/* ✅ ЗАМЕНЯЕМ ЗАГЛУШКУ НА КОМПОНЕНТ */}
                <AccessoryTable />
            </div>
        </div>
    );
}