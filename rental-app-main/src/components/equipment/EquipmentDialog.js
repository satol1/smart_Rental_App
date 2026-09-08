import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/equipment/EquipmentDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EquipmentForm from "./EquipmentForm";
export default function EquipmentDialog({ isOpen, onClose, mode, equipment }) {
    const handleSuccess = () => {
        onClose();
    };
    const getDialogTitle = () => {
        return mode === 'create' ? 'Создание оборудования' : 'Редактирование оборудования';
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, modal: false, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: getDialogTitle() }) }), _jsx(EquipmentForm, { mode: mode, initialData: equipment, onSuccess: handleSuccess, onCancel: onClose })] }) }));
}
