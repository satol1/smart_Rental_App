import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// src/components/admin/RentalReceiptDialog.tsx
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RentalReceipt from "./RentalReceipt";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { useRentalReceiptStore } from "@/store/rentalReceiptStore";
export default function RentalReceiptDialog({ isOpen, onClose, rentalData }) {
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
        window.print();
    };
    if (!rentalData)
        return null;
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] flex flex-col rental-receipt-dialog", children: [_jsxs(DialogHeader, { className: "dialog-header", children: [_jsxs(DialogTitle, { children: ["\u0411\u043B\u0430\u043D\u043A \u0430\u0440\u0435\u043D\u0434\u044B #", rentalData.id] }), _jsx(DialogDescription, { children: "\u041F\u0435\u0447\u0430\u0442\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0431\u043B\u0430\u043D\u043A\u0430 \u0430\u0440\u0435\u043D\u0434\u044B \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" })] }), _jsx("div", { className: "flex-1 overflow-y-auto -mx-6 px-6 py-4 border-y rental-receipt-content", children: isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "text-sm text-gray-600", children: "\u0424\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0431\u043B\u0430\u043D\u043A\u0430..." })] }) })) : (_jsx(RentalReceipt, { rentalData: rentalData })) }), _jsxs(DialogFooter, { className: "flex-col sm:flex-row sm:justify-between sm:items-center dialog-footer", children: [_jsxs(Button, { variant: "outline", onClick: handlePrint, className: "w-full sm:w-auto", children: [_jsx(Printer, { className: "w-4 h-4 mr-2" }), "\u041F\u0435\u0447\u0430\u0442\u044C / \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C PDF"] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 w-full sm:w-auto", children: [_jsx(Button, { variant: "ghost", onClick: onClose, className: "w-full sm:w-auto", children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }), _jsxs(Button, { onClick: handleGoToRentals, className: "w-full sm:w-auto", children: [_jsx(ArrowLeft, { className: "w-4 h-4 mr-2" }), "\u041A \u0441\u043F\u0438\u0441\u043A\u0443 \u0430\u0440\u0435\u043D\u0434"] })] })] })] }) }));
}
