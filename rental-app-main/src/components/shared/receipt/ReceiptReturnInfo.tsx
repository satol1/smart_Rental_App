import { Clock, AlertTriangle, Receipt } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptReturnInfoProps {
    rentalData: Pick<AdminRentalOut, 'end_date' | 'deposit_amount'>;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    isCompact?: boolean;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    useCard?: boolean;
}

export default function ReceiptReturnInfo({ rentalData }: ReceiptReturnInfoProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <section className="receipt-section receipt-return-info mb-5">
            <h3 className="receipt-section-title mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <Clock className="h-4 w-4" />
                Информация о возврате и штрафах
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="receipt-note receipt-return-date rounded-md border border-yellow-300 bg-yellow-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-700" />
                        <span className="text-sm font-medium text-yellow-900">Планируемая дата возврата</span>
                    </div>
                    <p className="text-sm text-yellow-800">
                        <strong>{formatDate(rentalData.end_date)} до 13:00</strong>
                    </p>
                </div>

                <div className="receipt-note receipt-overdue rounded-md border border-red-300 bg-red-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-700" />
                        <span className="text-sm font-medium text-red-900">Просрочка возврата</span>
                    </div>
                    <p className="text-sm text-red-800">
                        В случае задержки возврата без предварительного согласования с менеджером, взимается штраф в размере двойной суточной стоимости аренды за каждый день просрочки.
                    </p>
                </div>

                {rentalData.deposit_amount != null && Number(rentalData.deposit_amount) > 0 && (
                    <div className="receipt-note receipt-deposit rounded-md border border-green-300 bg-green-50 p-3 sm:col-span-2">
                        <div className="mb-1 flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-green-700" />
                            <span className="text-sm font-medium text-green-900">Залог</span>
                        </div>
                        <p className="text-sm text-green-800">
                            Внесенный залог в размере <strong>{rentalData.deposit_amount.toLocaleString()} ₽</strong> возвращается в полном объеме после проверки оборудования при возврате. В случае повреждений, из суммы залога удерживается стоимость ремонта.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
