// src/components/ConfirmItemRemovalDialog.tsx
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isConfirming: boolean;
    variant?: 'removeItem' | 'cancelReservation' | 'fullCancel';
    /** Переопределение текста описания (например, детали отменяемого резерва) */
    description?: string;
};

export default function ConfirmItemRemovalDialog({
                                                     open,
                                                     onClose,
                                                     onConfirm,
                                                     isConfirming,
                                                     variant = 'removeItem',
                                                     description,
                                                 }: Props) {

    const content = {
        removeItem: {
            title: "Подтвердите действие",
            description: "Вы уверены, что хотите удалить эту позицию из резерва?",
            cancelText: "Отмена",
            confirmText: "Удалить",
            confirmLoadingText: "Удаление..."
        },
        cancelReservation: {
            title: "Удаление последней позиции",
            description: "Вы удалили последнюю позицию. Хотите отменить резерв полностью?",
            cancelText: "Вернуться к редактированию",
            confirmText: "Отменить резерв",
            confirmLoadingText: "Отмена..."
        },
        fullCancel: {
            title: "Отмена резерва",
            description: "Резерв будет отменён полностью, оборудование станет доступно другим клиентам. Действие нельзя отменить.",
            cancelText: "Оставить резерв",
            confirmText: "Отменить резерв",
            confirmLoadingText: "Отмена..."
        }
    }[variant];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{content.title}</DialogTitle>
                </DialogHeader>
                <DialogDescription>{description || content.description}</DialogDescription>
                <DialogFooter className="pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={isConfirming}>
                        {content.cancelText}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming ? content.confirmLoadingText : content.confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}