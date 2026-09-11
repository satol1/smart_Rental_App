// src/components/admin/RentalReceiptDialog.tsx

import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RentalReceipt from "./RentalReceipt";
import type { AdminRentalOut } from "@/types/rental";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { useRentalReceiptStore } from "@/store/rentalReceiptStore";

interface RentalReceiptDialogProps {
    isOpen: boolean;
    onClose: () => void;
    rentalData: AdminRentalOut | null;
}

export default function RentalReceiptDialog({ isOpen, onClose, rentalData }: RentalReceiptDialogProps) {
    const navigate = useNavigate();
    const { isLoading } = useRentalReceiptStore();

    const handleGoToRentals = () => {
        onClose();
        if (rentalData) {
            navigate('/admin/rentals', { 
                state: { 
                    highlightId: rentalData.id,
                    statusFilterOverride: 'all' // Показываем все аренды для поиска
                } 
            });
        }
    };

    const handlePrint = () => {
        if (!rentalData) {
            window.print();
            return;
        }
        // Временно меняем заголовок документа, чтобы при сохранении в PDF
        // файл получал осмысленное имя вида «Бланк_аренды_123.pdf»
        const previousTitle = document.title;
        document.title = `Бланк_аренды_${rentalData.id}`;
        const restoreTitle = () => {
            document.title = previousTitle;
            window.removeEventListener('afterprint', restoreTitle);
        };
        window.addEventListener('afterprint', restoreTitle);
        window.print();
        // Фолбэк для браузеров без события afterprint
        window.setTimeout(restoreTitle, 1000);
    };

    if (!rentalData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 rental-receipt-dialog">
                <DialogHeader className="dialog-header pb-3">
                    <DialogTitle>Бланк аренды №{rentalData.id}</DialogTitle>
                    <DialogDescription>
                        Проверьте данные перед печатью — документ формируется в формате A4
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 border-y rental-receipt-content">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-sm text-muted-foreground">Формирование бланка...</span>
                            </div>
                        </div>
                    ) : (
                        <RentalReceipt rentalData={rentalData} />
                    )}
                </div>

                <DialogFooter className="flex-col pt-3 sm:flex-row sm:justify-between sm:items-center dialog-footer">
                    <Button 
                        variant="outline" 
                        onClick={handlePrint}
                        className="w-full sm:w-auto"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Печать / Сохранить PDF
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="w-full sm:w-auto"
                        >
                            Закрыть
                        </Button>
                        <Button 
                            onClick={handleGoToRentals}
                            className="w-full sm:w-auto"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            К списку аренд
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}