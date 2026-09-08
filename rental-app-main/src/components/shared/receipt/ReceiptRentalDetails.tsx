import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptRentalDetailsProps {
    rentalData: Pick<AdminRentalOut, 'start_date' | 'end_date' | 'status'>;
    isCompact?: boolean;
    useCard?: boolean;
}

export default function ReceiptRentalDetails({ rentalData, isCompact = false, useCard = true }: ReceiptRentalDetailsProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'Активная';
            case 'overdue': return 'Просрочена';
            case 'completed': return 'Завершена';
            default: return status;
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active': return 'default';
            case 'overdue': return 'destructive';
            default: return 'secondary';
        }
    };

    const content = (
        <>
            <h3 className={`flex items-center gap-2 ${isCompact ? 'text-sm' : 'text-lg'} font-semibold ${!useCard ? 'mb-1' : ''}`}>
                <CalendarDays className={isCompact ? "w-3 h-3" : "w-5 h-5"} />
                Детали аренды
            </h3>
            {isCompact ? (
                <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className="text-xs font-medium text-gray-600">Начало</p>
                            <p className="text-sm font-semibold">{formatDate(rentalData.start_date)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-600">Окончание</p>
                            <p className="text-sm font-semibold">{formatDate(rentalData.end_date)}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-600">Статус</p>
                        <Badge 
                            variant={getStatusVariant(rentalData.status)}
                            className="text-xs px-2 py-0.5"
                        >
                            {getStatusText(rentalData.status)}
                        </Badge>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Дата начала</p>
                        <p className="text-base font-semibold">{formatDate(rentalData.start_date)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Дата окончания</p>
                        <p className="text-base font-semibold">{formatDate(rentalData.end_date)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Статус</p>
                        <Badge 
                            variant={getStatusVariant(rentalData.status)}
                        >
                            {getStatusText(rentalData.status)}
                        </Badge>
                    </div>
                </div>
            )}
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
        <Card>
            <CardHeader className={isCompact ? "pb-2" : "pb-3"}>
                {content}
            </CardHeader>
        </Card>
    );
}
