import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/EquipmentStats.tsx
import { useMemo } from 'react';
export const EquipmentStats = ({ equipment }) => {
    const stats = useMemo(() => {
        const totalCount = equipment.length;
        if (totalCount === 0) {
            return { totalCount: 0, typesCount: 0, brandsCount: 0, avgRate: 0 };
        }
        return {
            totalCount,
            typesCount: new Set(equipment.map(item => item.equipment_type)).size,
            brandsCount: new Set(equipment.map(item => item.brand)).size,
            avgRate: Math.round(equipment.reduce((sum, item) => sum + item.daily_rate, 0) / totalCount),
        };
    }, [equipment]);
    return (_jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold", children: stats.totalCount }), _jsx("div", { className: "text-sm text-muted-foreground", children: "\u0412\u0441\u0435\u0433\u043E \u0435\u0434\u0438\u043D\u0438\u0446" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold", children: stats.typesCount }), _jsx("div", { className: "text-sm text-muted-foreground", children: "\u0422\u0438\u043F\u043E\u0432" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold", children: stats.brandsCount }), _jsx("div", { className: "text-sm text-muted-foreground", children: "\u0411\u0440\u0435\u043D\u0434\u043E\u0432" })] }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "text-2xl font-bold", children: [stats.avgRate.toLocaleString(), " \u20BD"] }), _jsx("div", { className: "text-sm text-muted-foreground", children: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0442\u0430\u0440\u0438\u0444" })] })] }));
};
