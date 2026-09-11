// src/components/admin/PrintableRentalReceipt.tsx

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

interface PrintableRentalReceiptProps {
    rentalData: AdminRentalOut;
}

export default function PrintableRentalReceipt({ rentalData }: PrintableRentalReceiptProps) {

    return (
        <div className="max-w-4xl mx-auto bg-card print-container">
            {/* Двухколоночная компоновка для печати */}
            <div className="grid grid-cols-2 gap-x-4">
                {/* Левая колонка */}
                <div className="space-y-2">
                    {/* Шапка - растягиваем на обе колонки */}
                    <div className="col-span-2">
                        <ReceiptHeader 
                            rentalId={rentalData.id} 
                            createdAt={rentalData.created_at} 
                            isCompact={true}
                        />
            </div>

                    {/* Информация о клиенте */}
                    <ReceiptClientInfo 
                        user={rentalData.user} 
                        isCompact={true} 
                        useCard={false} 
                    />

                    {/* Детали аренды */}
                    <ReceiptRentalDetails 
                        rentalData={rentalData} 
                        isCompact={true} 
                        useCard={false} 
                    />

                    {/* Список оборудования */}
                    <ReceiptEquipmentList 
                        rentalData={rentalData} 
                        isCompact={true} 
                        useCard={false} 
                    />

                    {/* Стоимость аренды */}
                    <ReceiptFinancials 
                        rentalData={rentalData} 
                        isCompact={true} 
                        useCard={false} 
                    />
            </div>

                {/* Правая колонка */}
                <div className="space-y-2">
                    {/* Правила пользования */}
                    <ReceiptRules 
                        isCompact={true} 
                        useCard={false} 
                    />

                    {/* Информация о возврате */}
                    <ReceiptReturnInfo 
                        rentalData={rentalData} 
                        isCompact={true} 
                        useCard={false} 
                    />
                </div>
            </div>

            {/* Подпись - растягиваем на обе колонки */}
            <div className="col-span-2 mt-4">
                <ReceiptSignatures isCompact={true} />
            </div>
        </div>
    );
}
