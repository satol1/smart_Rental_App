import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ReceiptHeader, ReceiptClientInfo, ReceiptRentalDetails, ReceiptEquipmentList, ReceiptFinancials, ReceiptRules, ReceiptReturnInfo, ReceiptSignatures } from "@/components/shared/receipt";
export default function RentalReceipt({ rentalData }) {
    // Отладочная информация для проверки deposit_amount
    console.log('RentalReceipt - deposit_amount:', rentalData.deposit_amount, 'type:', typeof rentalData.deposit_amount);
    console.log('RentalReceipt - should show deposit block:', rentalData.deposit_amount != null && Number(rentalData.deposit_amount) > 0);
    return (_jsxs("div", { className: "max-w-4xl mx-auto bg-white print-container", children: [_jsx(ReceiptHeader, { rentalId: rentalData.id, createdAt: rentalData.created_at }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-6", children: [_jsx(ReceiptClientInfo, { user: rentalData.user }), _jsx(ReceiptRentalDetails, { rentalData: rentalData })] }), _jsx(ReceiptEquipmentList, { rentalData: rentalData }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-6", children: [_jsx(ReceiptFinancials, { rentalData: rentalData }), _jsx(ReceiptRules, {})] }), _jsx(ReceiptReturnInfo, { rentalData: rentalData }), _jsx(ReceiptSignatures, {})] }));
}
