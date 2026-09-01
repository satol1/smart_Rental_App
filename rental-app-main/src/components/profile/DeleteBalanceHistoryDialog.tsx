// src/components/profile/DeleteBalanceHistoryDialog.tsx

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteBalanceHistory } from "@/hooks/useDeleteBalanceHistory";
import { Loader2 } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    historyId: number;
    description: string;
    amount: number;
    userId?: number; // ID пользователя, для которого удаляется запись (для правильной инвалидации кэша)
}

export default function DeleteBalanceHistoryDialog({
    isOpen,
    onClose,
    historyId,
    description,
    amount,
    userId
}: Props) {
    const deleteMutation = useDeleteBalanceHistory();

    const handleDelete = () => {
        if (!userId) {
            console.error("❌ UserId is required for deleting balance history entry");
            return;
        }
        
        console.log(`🗑️ Attempting to delete balance history entry ${historyId} for user ${userId}`);
        deleteMutation.mutate({ historyId, userId }, {
            onSuccess: () => {
                console.log(`✅ Successfully deleted balance history entry ${historyId}, closing dialog`);
                onClose();
            },
            onError: (error) => {
                console.error(`❌ Failed to delete balance history entry ${historyId}:`, error);
            }
        });
    };

    const amountSign = amount > 0 ? '+' : '';
    const formattedAmount = `${amountSign} ${amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}`;

    const dialogDescription = (
        <div className="space-y-2">
            <p>Вы уверены, что хотите удалить эту запись? Это действие необратимо.</p>
            <div className="bg-gray-50 p-3 rounded-md">
                <p><strong>Описание:</strong> {description}</p>
                <p><strong>Сумма:</strong> {formattedAmount}</p>
            </div>
            <p className="text-red-600 font-medium">
                ⚠️ После удаления баланс пользователя будет автоматически пересчитан.
            </p>
        </div>
    );


    return (
        <ConfirmationDialog
            open={isOpen}
            onOpenChange={onClose}
            title="Удалить запись из истории баланса"
            description={
                <div className="space-y-4">
                    <p>Вы уверены, что хотите удалить эту запись? Это действие необратимо.</p>
                    <div className="bg-gray-50 p-3 rounded-md">
                        <p><strong>Описание:</strong> {description}</p>
                        <p><strong>Сумма:</strong> {formattedAmount}</p>
                    </div>
                    <p className="text-red-600 font-medium">
                        ⚠️ После удаления баланс пользователя будет автоматически пересчитан.
                    </p>
                </div>
            }
            variant="destructive"
            onConfirm={handleDelete}
            confirmText="Удалить"
            cancelText="Отмена"
        />
    );
}
