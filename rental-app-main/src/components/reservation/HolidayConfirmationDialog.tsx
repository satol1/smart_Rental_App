// src/components/reservation/HolidayConfirmationDialog.tsx
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = {
    open: boolean;
    message: string;
    suggestedDate: string;
    onConfirm: () => void;
    onCancel: () => void;
    isConfirming: boolean;
};

export default function HolidayConfirmationDialog({
                                                      open,
                                                      message,
                                                      suggestedDate,
                                                      onConfirm,
                                                      onCancel,
                                                      isConfirming,
                                                  }: Props) {
    return (
        <Dialog open={open} onOpenChange={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-warning" />
                        Дата окончания - выходной
                    </DialogTitle>
                </DialogHeader>
                <DialogDescription>
                    <p>{message}</p>
                    <p className="mt-2">
                        Вы хотите автоматически изменить дату окончания на ближайший рабочий день:
                        <strong className="text-foreground"> {suggestedDate}</strong>?
                    </p>
                </DialogDescription>
                <DialogFooter className="pt-4">
                    <Button variant="ghost" onClick={onCancel} disabled={isConfirming}>
                        Нет, я выберу другую дату
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming ? "Сохранение..." : "Да, изменить"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
