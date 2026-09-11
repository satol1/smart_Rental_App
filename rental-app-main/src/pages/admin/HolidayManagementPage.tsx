// src/pages/admin/HolidayManagementPage.tsx

import HolidayManager from "@/components/admin/HolidayManager"; // Этот компонент мы создадим далее
import { CalendarDays } from "lucide-react";

export default function HolidayManagementPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <CalendarDays className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Управление выходными днями
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Назначьте праздничные и нерабочие дни, которые не будут тарифицироваться.
                    </p>
                </div>
            </div>
            <div className="bg-card rounded-lg border shadow-sm p-6">
                <HolidayManager />
            </div>
        </div>
    );
}