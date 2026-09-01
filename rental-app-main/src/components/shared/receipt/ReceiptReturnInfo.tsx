import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, AlertTriangle, Receipt } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptReturnInfoProps {
    rentalData: Pick<AdminRentalOut, 'end_date' | 'deposit_amount'>;
    isCompact?: boolean;
    useCard?: boolean;
}

export default function ReceiptReturnInfo({ rentalData, isCompact = false, useCard = true }: ReceiptReturnInfoProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const content = (
        <>
            <h3 className={`flex items-center gap-2 ${isCompact ? 'text-base' : 'text-lg'} font-semibold ${!useCard ? 'mb-1' : ''}`}>
                <Clock className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
                Информация о возврате и штрафах
            </h3>
            <div className={isCompact ? "space-y-2" : "space-y-4"}>
                <div className={`bg-yellow-50 border border-yellow-200 rounded-lg ${isCompact ? 'p-2' : 'p-4'}`}>
                    <div className={`flex items-center gap-2 ${isCompact ? 'mb-1' : 'mb-2'}`}>
                        <Clock className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-yellow-600`} />
                        <span className={`${isCompact ? 'text-xs' : ''} font-medium text-yellow-800`}>Планируемая дата возврата</span>
                    </div>
                    <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-yellow-700`}>
                        <strong>{formatDate(rentalData.end_date)} до 13:00</strong>
                    </p>
                </div>
                
                <div className={`bg-red-50 border border-red-200 rounded-lg ${isCompact ? 'p-2' : 'p-4'}`}>
                    <div className={`flex items-center gap-2 ${isCompact ? 'mb-1' : 'mb-2'}`}>
                        <AlertTriangle className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-red-600`} />
                        <span className={`${isCompact ? 'text-xs' : ''} font-medium text-red-800`}>Просрочка возврата</span>
                    </div>
                    <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-red-700`}>
                        В случае задержки возврата без предварительного согласования с менеджером, взимается штраф в размере двойной суточной стоимости аренды за каждый день просрочки.
                    </p>
                </div>
                
                {rentalData.deposit_amount != null && Number(rentalData.deposit_amount) > 0 && (
                    <div className={`bg-green-50 border border-green-200 rounded-lg ${isCompact ? 'p-2' : 'p-4'}`}>
                        <div className={`flex items-center gap-2 ${isCompact ? 'mb-1' : 'mb-2'}`}>
                            <Receipt className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-green-600`} />
                            <span className={`${isCompact ? 'text-xs' : ''} font-medium text-green-800`}>Залог</span>
                        </div>
                        <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-green-700`}>
                            Внесенный залог в размере <strong>{rentalData.deposit_amount.toLocaleString()} ₽</strong> возвращается в полном объеме после проверки оборудования при возврате. В случае повреждений, из суммы залога удерживается стоимость ремонта.
                        </p>
                    </div>
                )}
            </div>
        </>
    );

    if (!useCard) {
        return (
            <div className="border-t pt-2 mt-2">
                {content}
            </div>
        );
    }

    return (
        <Card className={isCompact ? "mb-3" : "mb-6"}>
            <CardHeader className={isCompact ? "pb-2" : "pb-3"}>
                {content}
            </CardHeader>
        </Card>
    );
}
