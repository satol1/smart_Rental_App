// src/components/equipment/EquipmentDetailsDialog.tsx
import { useState, useEffect } from "react"; // 1. Импортируем useEffect
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EquipmentDetailsView from "@/components/equipment/EquipmentDetailsView";
import EquipmentForm from "./EquipmentForm";
import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo } from "@/types/availability";
import { Button } from "@/components/ui/button";
import { useReserveStore } from "@/store/reserveStore";
import { useCurrentUser } from "@/hooks/useProfile";
import { Pencil, Check } from "lucide-react";
import { isEquipmentAvailableForReservation } from "@/lib/equipmentUtils";

type Props = {
    open: boolean;
    onClose: () => void;
    equipment: Equipment;
    availability?: AvailabilityInfo;
};

export default function EquipmentDetailsDialog({ open, onClose, equipment, availability }: Props) {
    const addWithAccessories = useReserveStore(state => state.addWithAccessories);
    const items = useReserveStore(state => state.items);
    const { data: currentUser } = useCurrentUser();

    const [isEditing, setIsEditing] = useState(false);
    const [stagedAccessoryIds, setStagedAccessoryIds] = useState<Set<number>>(new Set());

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

    const handleToggleStagedAccessory = (accessoryId: number) => {
        setStagedAccessoryIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accessoryId)) {
                newSet.delete(accessoryId);
            } else {
                newSet.add(accessoryId);
            }
            return newSet;
        });
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDialogCloseTrigger()}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-6 flex flex-col">
                <DialogHeader className="pb-4 flex-shrink-0">
                    <DialogTitle className="text-lg sm:text-xl">
                        {isEditing ? `Редактирование: ${equipment.name}` : "Детали оборудования"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {isEditing ? (
                        <EquipmentForm
                            mode="edit"
                            initialData={equipment}
                            onSuccess={() => { setIsEditing(false); onClose(); }}
                            onCancel={() => setIsEditing(false) }
                        />
                    ) : (
                        <EquipmentDetailsView
                            equipment={equipment}
                            canViewAdminInfo={canViewAdminInfo}
                            canToggleAccessories={isAvailableForReservation}
                            isMainSelected={selected}
                            stagedAccessoryIds={stagedAccessoryIds}
                            onToggleStagedAccessory={handleToggleStagedAccessory}
                        />
                    )}
                </div>

                {!isEditing && (
                    <DialogFooter className="pt-4 mt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2 flex-shrink-0">
                        {canEdit && (
                            <Button
                                variant="secondary"
                                onClick={handleEditClick}
                                className="w-full sm:w-auto order-last sm:order-none"
                            >
                                <Pencil size={15} className="mr-1.5" />
                                Редактировать
                            </Button>
                        )}
                        {isAvailableForReservation && (
                            <Button
                                onClick={handleMainActionClick}
                                variant="default"
                                className="w-full sm:w-auto"
                            >
                                {selected
                                    ? <><Check size={16} className="mr-1.5" />Готово</>
                                    : "➕ Добавить в резерв"
                                }
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}