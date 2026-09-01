import { useState } from "react";
import AdminNavigation from "@/components/admin/AdminNavigation";
import AssociationTable from "@/components/admin/AssociationTable";
import BrandSystemTable from "@/components/admin/BrandSystemTable";
import { Button } from "@/components/ui/button";
import { Tags, ShieldCheck } from "lucide-react";

export default function AssociationManagementPage() {
    const [activeTab, setActiveTab] = useState<"associations" | "brand-systems">("associations");

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <AdminNavigation />
            <div className="flex items-center gap-3">
                <Tags className="w-8 h-8 text-green-600" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Группировка
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Управление подборками (Ассоциации) и совместимостью (Системы Бренда).
                    </p>
                </div>
            </div>

            {/* Навигация по вкладкам */}
            <div className="flex gap-2 border-b">
                <Button
                    variant={activeTab === "associations" ? "default" : "ghost"}
                    onClick={() => setActiveTab("associations")}
                    className="rounded-b-none"
                >
                    <Tags className="mr-2 h-4 w-4" />
                    Ассоциации (Подборки)
                </Button>
                <Button
                    variant={activeTab === "brand-systems" ? "default" : "ghost"}
                    onClick={() => setActiveTab("brand-systems")}
                    className="rounded-b-none"
                >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Системы Брендов
                </Button>
            </div>

            {/* Контент вкладок */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                {activeTab === "associations" && <AssociationTable />}
                {activeTab === "brand-systems" && <BrandSystemTable />}
            </div>
        </div>
    );
}

