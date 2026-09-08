import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/PageFallback.tsx
// Скелетон страницы для React.lazy + Suspense.
// Лого-плейсхолдер + шиммер-блоки вместо пустого div.
// Работает в обеих темах (токены bg-muted / bg-card).
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
export default function PageFallback({ className }) {
    return (_jsxs("div", { "data-testid": "page-fallback", className: cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6", className), role: "status", "aria-label": "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Skeleton, { className: "h-14 w-14 rounded-xl shrink-0" }), _jsxs("div", { className: "space-y-2 flex-1", children: [_jsx(Skeleton, { className: "h-6 w-64 max-w-full" }), _jsx(Skeleton, { className: "h-4 w-40 max-w-full" })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Skeleton, { className: "h-10 w-48 rounded-md" }), _jsx(Skeleton, { className: "h-10 w-32 rounded-md" }), _jsx(Skeleton, { className: "h-10 w-10 rounded-md ml-auto" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6", children: Array.from({ length: 8 }).map((_, index) => (_jsxs("div", { className: "rounded-lg border bg-card p-4 space-y-3 shadow-sm", children: [_jsx(Skeleton, { className: "h-40 w-full rounded-md" }), _jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-1/2" })] }), _jsxs("div", { className: "flex items-center justify-between pt-1", children: [_jsx(Skeleton, { className: "h-5 w-16" }), _jsx(Skeleton, { className: "h-9 w-24 rounded-md" })] })] }, index))) })] }));
}
