// src/components/admin/RentalReceipt.tsx

import type { AdminRentalOut } from "@/types/rental";
import {
    ReceiptHeader,
    ReceiptClientInfo,
    ReceiptRentalDetails,
    ReceiptEquipmentList,
    ReceiptFinancials,
    ReceiptRules,
    ReceiptReturnInfo,
    ReceiptSignatures
} from "@/components/shared/receipt";

interface RentalReceiptProps {
    rentalData: AdminRentalOut;
}

export default function RentalReceipt({ rentalData }: RentalReceiptProps) {
    // Отладочная информация для проверки deposit_amount
    console.log('RentalReceipt - deposit_amount:', rentalData.deposit_amount, 'type:', typeof rentalData.deposit_amount);
    console.log('RentalReceipt - should show deposit block:', rentalData.deposit_amount != null && Number(rentalData.deposit_amount) > 0);

    return (
        <div className="max-w-4xl mx-auto bg-white print-container">
            {/* Шапка */}
            <ReceiptHeader 
                rentalId={rentalData.id} 
                createdAt={rentalData.created_at} 
            />

            {/* Информация о клиенте и детали аренды - двухколоночная компоновка */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <ReceiptClientInfo user={rentalData.user} />
                <ReceiptRentalDetails rentalData={rentalData} />
            </div>

            {/* Список оборудования */}
            <ReceiptEquipmentList rentalData={rentalData} />

            {/* Стоимость аренды и правила пользования - двухколоночная компоновка */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <ReceiptFinancials rentalData={rentalData} />
                <ReceiptRules />
            </div>

            {/* Информация о возврате */}
            <ReceiptReturnInfo rentalData={rentalData} />

            {/* Подпись */}
            <ReceiptSignatures />
        </div>
    );
}
