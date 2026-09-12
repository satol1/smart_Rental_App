// src/components/admin/AdminRentalActionsBlock.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, RotateCcw, Trash2, PackagePlus } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface AdminRentalActionsBlockProps {
    rental: AdminRentalOut;
    isAdmin: boolean;
    canRevert: boolean;
    isDeleting: boolean;
    onEdit: () => void;
    onReturn: () => void;
    onDelete: () => void;
    onRevert: () => void;
    onAddEquipment?: () => void;
}

const AdminRentalActionsBlock = React.memo(({
    rental,
    isAdmin,
    canRevert,
    isDeleting,
    onEdit,
    onReturn,
    onDelete,
    onRevert,
    onAddEquipment,
}: AdminRentalActionsBlockProps) => {
    const isActiveRental = rental.status === 'active' || rental.status === 'overdue';

    return (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 xl:flex-col xl:items-stretch xl:border-t-0 xl:border-l xl:pl-5 xl:pt-0">
            <div className="flex flex-wrap gap-2 xl:flex-col">
                {canRevert && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onRevert}
                        className="text-warning border-border hover:bg-warning-soft hover:text-warning"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Отменить выдачу
                    </Button>
                )}
                {isActiveRental && onAddEquipment && (
                    <Button size="sm" variant="outline" onClick={onAddEquipment}>
                        <PackagePlus className="mr-2 h-4 w-4 text-primary" />
                        Добрать технику
                    </Button>
                )}
                <Button size="sm" variant="outline" onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Редактировать
                </Button>
                {isActiveRental && (
                    <Button size="sm" variant="default" onClick={onReturn}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Оформить возврат
                    </Button>
                )}
            </div>
            {isAdmin && (
                <Button onClick={onDelete} size="sm" variant="destructive" disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Удаление..." : "Удалить"}
                </Button>
            )}
        </div>
    );
});

AdminRentalActionsBlock.displayName = 'AdminRentalActionsBlock';

export default AdminRentalActionsBlock;
