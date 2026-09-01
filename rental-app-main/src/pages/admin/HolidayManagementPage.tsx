// src/pages/admin/HolidayManagementPage.tsx

import AdminNavigation from "@/components/admin/AdminNavigation";
import HolidayManager from "@/components/admin/HolidayManager"; // Этот компонент мы создадим далее
import { CalendarDays } from "lucide-react";

export default function HolidayManagementPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <AdminNavigation />
            <div className="flex items-center gap-3">
                <CalendarDays className="w-8 h-8 text-cyan-600" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Управление выходными днями
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Назначьте праздничные и нерабочие дни, которые не будут тарифицироваться.
                    </p>
                </div>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <HolidayManager />
            </div>
        </div>
    );
}