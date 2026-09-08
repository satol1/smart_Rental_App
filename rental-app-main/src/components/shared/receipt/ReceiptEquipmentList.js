import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt } from "lucide-react";
export default function ReceiptEquipmentList({ rentalData, isCompact = false, useCard = true }) {
    const equipmentWithAccessories = useMemo(() => {
        const equipmentMap = new Map();
        // Добавляем оборудование
        rentalData.equipment.forEach(equipment => {
            equipmentMap.set(equipment.id, {
                ...equipment,
                accessories: []
            });
        });
        // Добавляем аксессуары к соответствующему оборудованию
        rentalData.accessory_links.forEach(link => {
            const equipment = equipmentMap.get(link.equipment_id);
            if (equipment) {
                equipment.accessories.push(link.accessory);
            }
        });
        return Array.from(equipmentMap.values());
    }, [rentalData.equipment, rentalData.accessory_links]);
    const content = (_jsxs(_Fragment, { children: [_jsxs("h3", { className: `flex items-center gap-2 ${isCompact ? 'text-base' : 'text-lg'} font-semibold ${!useCard ? 'mb-1' : ''}`, children: [_jsx(Receipt, { className: isCompact ? "w-4 h-4" : "w-5 h-5" }), "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B"] }), _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: isCompact ? "text-xs" : "", children: "\u2116" }), _jsx(TableHead, { className: isCompact ? "text-xs" : "", children: "\u041D\u0430\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { className: isCompact ? "text-xs" : "", children: "\u0421\u0435\u0440\u0438\u0439\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440" }), _jsx(TableHead, { className: isCompact ? "text-xs" : "", children: "\u0410\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B" })] }) }), _jsx(TableBody, { children: equipmentWithAccessories.map((equipment, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: isCompact ? "text-xs" : "", children: index + 1 }), _jsx(TableCell, { className: isCompact ? "text-xs" : "", children: _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: equipment.name }), _jsx("p", { className: `${isCompact ? 'text-xs' : 'text-sm'} text-gray-600`, children: equipment.brand })] }) }), _jsx(TableCell, { className: isCompact ? "text-xs" : "", children: equipment.serial_number || 'Не указан' }), _jsx(TableCell, { className: isCompact ? "text-xs" : "", children: equipment.accessories.length > 0 ? (_jsx("ul", { className: `${isCompact ? 'text-xs space-y-0' : 'text-sm space-y-1'}`, children: equipment.accessories.map((accessory) => (_jsxs("li", { className: "text-gray-600", children: ["\u2022 ", accessory.name] }, accessory.id))) })) : (_jsx("span", { className: "text-gray-400", children: "\u041D\u0435\u0442" })) })] }, equipment.id))) })] })] }));
    if (!useCard) {
        return (_jsx("div", { className: "border-t pt-2 mt-2", children: content }));
    }
    return (_jsx(Card, { className: isCompact ? "mb-3" : "mb-6", children: _jsx(CardHeader, { className: isCompact ? "pb-2" : "pb-3", children: content }) }));
}
