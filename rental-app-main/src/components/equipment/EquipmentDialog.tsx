// src/components/equipment/EquipmentDialog.tsx

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import EquipmentForm from "./EquipmentForm";
import type { Equipment } from "@/types/equipment";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    equipment?: Equipment;
}

export default function EquipmentDialog({ isOpen, onClose, mode, equipment }: Props) {
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // Смена редактируемой позиции сбрасывает признак несохранённых изменений
    useEffect(() => {
        setIsFormDirty(false);
        setShowCloseConfirm(false);
    }, [equipment?.id, isOpen]);

    const handleSuccess = () => {
        onClose();
    };

    // Закрытие (Esc / клик по фону / крестику) с несохранёнными правками требует подтверждения
    const requestClose = () => {
        if (isFormDirty) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };

    const getDialogTitle = () => {
        return mode === 'create' ? 'Создание оборудования' : 'Редактирование оборудования';
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) requestClose(); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{getDialogTitle()}</DialogTitle>
                    </DialogHeader>
                    <EquipmentForm
                        mode={mode}
                        initialData={equipment}
                        onSuccess={handleSuccess}
                        onCancel={requestClose}
                        onDirtyChange={setIsFormDirty}
                    />
                </DialogContent>
            </Dialog>
            <ConfirmationDialog
                open={showCloseConfirm}
                onOpenChange={setShowCloseConfirm}
                title="Есть несохранённые изменения"
                description="Если закрыть окно, правки будут потеряны. Закрыть без сохранения?"
                confirmText="Закрыть без сохранения"
                cancelText="Продолжить редактирование"
                variant="destructive"
                onConfirm={onClose}
            />
        </>
    );
}
