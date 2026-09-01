// src/components/CancelReservationDialog.tsx
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle, // Импортируем DialogTitle
    DialogDescription, // Импортируем DialogDescription
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export default function CancelReservationDialog({ open, onClose, onConfirm }: Props) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    {/* 👇 ИСПОЛЬЗУЕМ DialogTitle вместо h2 */}
                    <DialogTitle className="text-lg font-semibold">Отменить оформление?</DialogTitle>
                </DialogHeader>
                {/* 👇 ИСПОЛЬЗУЕМ DialogDescription вместо p */}
                <DialogDescription className="text-sm text-gray-600">
                    Все выбранные позиции будут удалены, а вы вернётесь на главную страницу.
                </DialogDescription>
                <DialogFooter className="pt-4">
                    <Button variant="ghost" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button
                        className="bg-red-700 hover:bg-red-800 text-white"
                        onClick={onConfirm}
                    >
                        Подтвердить отмену
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}