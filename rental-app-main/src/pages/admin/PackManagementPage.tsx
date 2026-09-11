// src/pages/admin/PackManagementPage.tsx

import PackTable from "@/components/admin/PackTable";

export default function PackManagementPage() {
    return (
        <div className="space-y-6">
            
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Управление Пачками
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Создавайте и управляйте пачками оборудования для удобной аренды
                    </p>
                </div>
            </div>

            <PackTable />
        </div>
    );
}
