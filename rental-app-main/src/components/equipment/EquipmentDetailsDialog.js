import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/equipment/EquipmentDetailsDialog.tsx
import { useState, useEffect } from "react"; // 1. Импортируем useEffect
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EquipmentDetailsView from "@/components/equipment/EquipmentDetailsView";
import EquipmentForm from "./EquipmentForm";
import { Button } from "@/components/ui/button";
import { useReserveStore } from "@/store/reserveStore";
import { useCurrentUser } from "@/hooks/useProfile";
import { Pencil, Check } from "lucide-react";
import { isEquipmentAvailableForReservation } from "@/lib/equipmentUtils";
export default function EquipmentDetailsDialog({ open, onClose, equipment, availability }) {
    const addWithAccessories = useReserveStore(state => state.addWithAccessories);
    const items = useReserveStore(state => state.items);
    const { data: currentUser } = useCurrentUser();
    const [isEditing, setIsEditing] = useState(false);
    const [stagedAccessoryIds, setStagedAccessoryIds] = useState(new Set());
    // 2. Добавляем этот блок useEffect
    useEffect(() => {
        if (!open) {
            document.body.style.overflow = '';
        }
    }, [open]);
    const selected = items.some(item => item.id === equipment.id);
    const isAvailableForReservation = availability?.status === "available" && isEquipmentAvailableForReservation(equipment);
    const userRole = currentUser?.role;
    const canEdit = userRole === "admin" || userRole === "manager";
    const canViewAdminInfo = canEdit;
    const handleMainActionClick = () => {
        if (!selected) {
            addWithAccessories(equipment, Array.from(stagedAccessoryIds));
        }
        onClose();
    };
    const handleEditClick = () => {
        setIsEditing(true);
    };
    const handleDialogCloseTrigger = () => {
        setIsEditing(false);
        setStagedAccessoryIds(new Set());
        onClose();
    };
    const handleToggleStagedAccessory = (accessoryId) => {
        setStagedAccessoryIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accessoryId)) {
                newSet.delete(accessoryId);
            }
            else {
                newSet.add(accessoryId);
            }
            return newSet;
        });
    };
    return (_jsx(Dialog, { open: open, onOpenChange: (isOpen) => !isOpen && handleDialogCloseTrigger(), children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] p-6 flex flex-col", children: [_jsx(DialogHeader, { className: "pb-4 flex-shrink-0", children: _jsx(DialogTitle, { className: "text-lg sm:text-xl", children: isEditing ? `Редактирование: ${equipment.name}` : "Детали оборудования" }) }), _jsx("div", { className: "flex-1 overflow-y-auto -mx-6 px-6", children: isEditing ? (_jsx(EquipmentForm, { mode: "edit", initialData: equipment, onSuccess: () => { setIsEditing(false); onClose(); }, onCancel: () => setIsEditing(false) })) : (_jsx(EquipmentDetailsView, { equipment: equipment, canViewAdminInfo: canViewAdminInfo, canToggleAccessories: isAvailableForReservation, isMainSelected: selected, stagedAccessoryIds: stagedAccessoryIds, onToggleStagedAccessory: handleToggleStagedAccessory })) }), !isEditing && (_jsxs(DialogFooter, { className: "pt-4 mt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2 flex-shrink-0", children: [canEdit && (_jsxs(Button, { variant: "secondary", onClick: handleEditClick, className: "w-full sm:w-auto order-last sm:order-none", children: [_jsx(Pencil, { size: 15, className: "mr-1.5" }), "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C"] })), isAvailableForReservation && (_jsx(Button, { onClick: handleMainActionClick, variant: "default", className: "w-full sm:w-auto", children: selected
                                ? _jsxs(_Fragment, { children: [_jsx(Check, { size: 16, className: "mr-1.5" }), "\u0413\u043E\u0442\u043E\u0432\u043E"] })
                                : "➕ Добавить в резерв" }))] }))] }) }));
}
