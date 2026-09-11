// src/pages/admin/PromoCodeManagementPage.tsx

import { TicketPercent } from "lucide-react";
import PromoCodeTable from "@/components/admin/PromoCodeTable";
import DurationDiscountManager from "@/components/admin/DurationDiscountManager";

export default function PromoCodeManagementPage() {
    return (
        <div className="space-y-6">

            <div className="flex items-center gap-3">
                <TicketPercent className="w-8 h-8 text-purple-600" />
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Промокоды и скидки
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Создание, редактирование и просмотр промокодов и автоматических скидок.
                    </p>
                </div>
            </div>

            {/* Блок с промокодами (остается без изменений) */}
            <div className="bg-card rounded-lg border shadow-sm p-6">
                <PromoCodeTable />
            </div>

            {/* 2. <-- ДОБАВЛЯЕМ НОВЫЙ БЛОК ДЛЯ УПРАВЛЕНИЯ СКИДКАМИ */}
            <div className="bg-card rounded-lg border shadow-sm p-6">
                <DurationDiscountManager />
            </div>
        </div>
    );
}