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
    return (
        <div className="print-container mx-auto max-w-4xl bg-card text-foreground">
            {/* Брендированная шапка с контактами и заголовком документа */}
            <ReceiptHeader
                rentalId={rentalData.id}
                createdAt={rentalData.created_at}
            />

            {/* Клиент и детали аренды — две колонки */}
            <div className="receipt-pair mb-5 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
                <ReceiptClientInfo user={rentalData.user} />
                <ReceiptRentalDetails rentalData={rentalData} />
            </div>

            {/* Список оборудования */}
            <ReceiptEquipmentList rentalData={rentalData} />

            {/* Стоимость и правила — две колонки */}
            <div className="receipt-pair mb-5 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
                <ReceiptFinancials rentalData={rentalData} />
                <ReceiptRules />
            </div>

            {/* Информация о возврате */}
            <ReceiptReturnInfo rentalData={rentalData} />

            {/* Подписи сторон */}
            <ReceiptSignatures />
        </div>
    );
}
