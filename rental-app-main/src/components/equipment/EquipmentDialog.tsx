// src/components/equipment/EquipmentDialog.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EquipmentForm from "./EquipmentForm";
import type { Equipment } from "@/types/equipment";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    equipment?: Equipment;
}

export default function EquipmentDialog({ isOpen, onClose, mode, equipment }: Props) {
    const handleSuccess = () => {
        onClose();
    };

    const getDialogTitle = () => {
        return mode === 'create' ? 'Создание оборудования' : 'Редактирование оборудования';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{getDialogTitle()}</DialogTitle>
                </DialogHeader>
                <EquipmentForm
                    mode={mode}
                    initialData={equipment}
                    onSuccess={handleSuccess}
                    onCancel={onClose}
                />
            </DialogContent>
        </Dialog>
    );
}
