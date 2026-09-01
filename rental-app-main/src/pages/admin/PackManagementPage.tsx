// src/pages/admin/PackManagementPage.tsx

import AdminNavigation from "@/components/admin/AdminNavigation";
import PackTable from "@/components/admin/PackTable";

export default function PackManagementPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <AdminNavigation />
            
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Управление Пачками
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Создавайте и управляйте пачками оборудования для удобной аренды
                    </p>
                </div>
            </div>

            <PackTable />
        </div>
    );
}
