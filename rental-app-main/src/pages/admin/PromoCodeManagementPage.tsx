// src/pages/admin/PromoCodeManagementPage.tsx

import AdminNavigation from "@/components/admin/AdminNavigation";
import { TicketPercent } from "lucide-react";
import PromoCodeTable from "@/components/admin/PromoCodeTable";
import DurationDiscountManager from "@/components/admin/DurationDiscountManager";

export default function PromoCodeManagementPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <AdminNavigation />

            <div className="flex items-center gap-3">
                <TicketPercent className="w-8 h-8 text-purple-600" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Промокоды и скидки
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Создание, редактирование и просмотр промокодов и автоматических скидок.
                    </p>
                </div>
            </div>

            {/* Блок с промокодами (остается без изменений) */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <PromoCodeTable />
            </div>

            {/* 2. <-- ДОБАВЛЯЕМ НОВЫЙ БЛОК ДЛЯ УПРАВЛЕНИЯ СКИДКАМИ */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <DurationDiscountManager />
            </div>
        </div>
    );
}