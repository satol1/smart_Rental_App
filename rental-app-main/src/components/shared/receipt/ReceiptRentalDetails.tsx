import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptRentalDetailsProps {
    rentalData: Pick<AdminRentalOut, 'start_date' | 'end_date' | 'status'>;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    isCompact?: boolean;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    useCard?: boolean;
}

export default function ReceiptRentalDetails({ rentalData }: ReceiptRentalDetailsProps) {
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

    return (
        <section className="receipt-section receipt-details">
            <h3 className="receipt-section-title mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Детали аренды
            </h3>
            <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Дата начала</p>
                        <p className="text-sm font-semibold text-foreground">{formatDate(rentalData.start_date)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Дата окончания</p>
                        <p className="text-sm font-semibold text-foreground">{formatDate(rentalData.end_date)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Статус</p>
                    <Badge
                        variant={getStatusVariant(rentalData.status)}
                        className="receipt-status-badge px-2 py-0.5 text-xs"
                    >
                        {getStatusText(rentalData.status)}
                    </Badge>
                </div>
            </div>
        </section>
    );
}
