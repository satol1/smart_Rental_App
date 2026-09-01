// src/components/admin/AdminRentalActionsBlock.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, RotateCcw, Trash2 } from "lucide-react";
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
}

const AdminRentalActionsBlock = React.memo(({ 
    rental, 
    isAdmin, 
    canRevert, 
    isDeleting, 
    onEdit, 
    onReturn, 
    onDelete, 
    onRevert 
}: AdminRentalActionsBlockProps) => {
    return (
        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
            <div className="flex flex-col gap-2">
                {canRevert && (
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={onRevert} 
                        className="text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Отменить выдачу
                    </Button>
                )}
                <Button size="sm" variant="outline" onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Редактировать
                </Button>
                {rental.status !== 'completed' && (
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
