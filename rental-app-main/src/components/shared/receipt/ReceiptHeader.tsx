import BrandLogo from "@/components/shared/BrandLogo";
import { COMPANY_INFO } from "@/lib/companyInfo";

interface ReceiptHeaderProps {
    rentalId: number;
    createdAt: string;
    /** @deprecated Kept for backward compatibility; the header uses a single responsive design. */
    isCompact?: boolean;
}

export default function ReceiptHeader({ rentalId, createdAt }: ReceiptHeaderProps) {
    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <header className="receipt-header mb-5">
            <div className="receipt-header-top flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
                <div className="flex items-center gap-3">
                    <BrandLogo size={44} showText={false} animated={false} />
                    <div>
                        <p className="receipt-company-name text-lg font-bold leading-tight text-foreground">
                            {COMPANY_INFO.name}
                        </p>
                        <p className="receipt-company-legal text-xs text-muted-foreground">
                            {COMPANY_INFO.legalEntity}
                        </p>
                    </div>
                </div>
                <div className="receipt-contacts text-right text-xs leading-snug text-foreground">
                    {COMPANY_INFO.phones.map((phone) => (
                        <p key={phone}>{phone}</p>
                    ))}
                    {COMPANY_INFO.emails.map((email) => (
                        <p key={email}>{email}</p>
                    ))}
                </div>
            </div>
            <div className="receipt-title mt-3 rounded-md bg-primary px-4 py-2 text-center text-primary-foreground">
                <h1 className="text-lg font-bold tracking-wide">
                    БЛАНК АРЕНДЫ №{rentalId}
                </h1>
                <p className="text-xs opacity-90">
                    Дата выдачи: {formatDateTime(createdAt)}
                </p>
            </div>
        </header>
    );
}
