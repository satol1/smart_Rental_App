import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import EditableEquipmentItem from "@/components/reservation/EditableEquipmentItem";
export default function EquipmentListForFinalization({ equipmentWithAccessories, newlyAddedIds, availabilityMap, selectedAccessories, onToggleAccessory, disabled = false }) {
    if (equipmentWithAccessories.length === 0) {
        return (_jsx("div", { className: "p-4 text-center text-gray-500 bg-gray-50 rounded-lg", children: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E" }));
    }
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("h4", { className: "text-sm font-semibold text-gray-800 mb-3", children: ["\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 (", equipmentWithAccessories.length, " \u043F\u043E\u0437\u0438\u0446\u0438\u0439)"] }), _jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: equipmentWithAccessories.map((equipment) => {
                    const availability = availabilityMap[equipment.id];
                    const hasConflict = !!availability && (availability.status === "reserved" || availability.status === "rented");
                    const isNew = newlyAddedIds.has(equipment.id);
                    const selectedAccessoryIds = selectedAccessories[equipment.id] || [];
                    return (_jsx(EditableEquipmentItem, { itemDetail: {
                            id: equipment.id,
                            label: `${equipment.brand} ${equipment.name}`
                        }, fullEquipmentItem: equipment, isNew: isNew, hasConflict: hasConflict, availability: availability, selectedAccessoryIds: selectedAccessoryIds, onRemove: () => { }, onToggleAccessory: onToggleAccessory, disabled: disabled }, equipment.id));
                }) })] }));
}
