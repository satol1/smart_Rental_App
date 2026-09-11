// src/components/admin/AdminLayout.tsx
// Общий каркас админ-раздела: навигация монтируется ОДИН раз и не мигает
// при смене раздела (раньше AdminNavigation жила внутри каждой страницы и
// размонтировалась в состояниях загрузки/ошибки — «тряска» админки).
// Скелетон Suspense повторяет геометрию контентной области без навбара.

import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { Skeleton } from "@/components/ui/skeleton";

function AdminPageFallback() {
    return (
        <div
            data-testid="admin-page-fallback"
            className="space-y-6"
            role="status"
            aria-busy="true"
            aria-label="Раздел загружается"
        >
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-7 w-64 max-w-full" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    );
}

export default function AdminLayout() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <AdminNavigation />
            <Suspense fallback={<AdminPageFallback />}>
                <Outlet />
            </Suspense>
        </div>
    );
}
