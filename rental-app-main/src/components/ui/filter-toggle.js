// src/components/ui/filter-toggle.tsx
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
// Базовые стили для кнопок фильтра
export const filterToggleBaseClass = cva("capitalize px-2 py-1 rounded text-sm font-medium transition-colors");
// Итоговый класс со стилями по состоянию ToggleGroupItem
export function getFilterToggleClass(color = "sky") {
    const colorClasses = {
        sky: "data-[state=on]:bg-sky-600 data-[state=on]:text-white data-[state=off]:bg-sky-100 data-[state=off]:text-sky-600 data-[state=off]:hover:bg-sky-200",
        green: "data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=off]:bg-green-100 data-[state=off]:text-green-600 data-[state=off]:hover:bg-green-200",
        amber: "data-[state=on]:bg-amber-600 data-[state=on]:text-white data-[state=off]:bg-amber-100 data-[state=off]:text-amber-600 data-[state=off]:hover:bg-amber-200",
        purple: "data-[state=on]:bg-purple-600 data-[state=on]:text-white data-[state=off]:bg-purple-100 data-[state=off]:text-purple-600 data-[state=off]:hover:bg-purple-200",
        rose: "data-[state=on]:bg-rose-600 data-[state=on]:text-white data-[state=off]:bg-rose-100 data-[state=off]:text-rose-600 data-[state=off]:hover:bg-rose-200",
        indigo: "data-[state=on]:bg-indigo-600 data-[state=on]:text-white data-[state=off]:bg-indigo-100 data-[state=off]:text-indigo-600 data-[state=off]:hover:bg-indigo-200",
        emerald: "data-[state=on]:bg-emerald-600 data-[state=on]:text-white data-[state=off]:bg-emerald-100 data-[state=off]:text-emerald-600 data-[state=off]:hover:bg-emerald-200",
        orange: "data-[state=on]:bg-orange-600 data-[state=on]:text-white data-[state=off]:bg-orange-100 data-[state=off]:text-orange-600 data-[state=off]:hover:bg-orange-200",
        red: "data-[state=on]:bg-red-600 data-[state=on]:text-white data-[state=off]:bg-red-100 data-[state=off]:text-red-600 data-[state=off]:hover:bg-red-200",
        yellow: "data-[state=on]:bg-yellow-400 data-[state=on]:text-black data-[state=off]:bg-yellow-100 data-[state=off]:text-yellow-800 data-[state=off]:hover:bg-yellow-200",
        black: "data-[state=on]:bg-gray-900 data-[state=on]:text-white data-[state=off]:bg-gray-100 data-[state=off]:text-gray-900 data-[state=off]:hover:bg-gray-200",
        blue: "data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=off]:bg-blue-100 data-[state=off]:text-blue-600 data-[state=off]:hover:bg-blue-200",
        gray: "data-[state=on]:bg-gray-600 data-[state=on]:text-white data-[state=off]:bg-gray-100 data-[state=off]:text-gray-600 data-[state=off]:hover:bg-gray-200"
    };
    return cn(filterToggleBaseClass(), colorClasses[color] || colorClasses.sky);
}
