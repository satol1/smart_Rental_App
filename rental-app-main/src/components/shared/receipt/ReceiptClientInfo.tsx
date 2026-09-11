import { User, Phone, Mail } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptClientInfoProps {
    user: AdminRentalOut['user'];
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    isCompact?: boolean;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    useCard?: boolean;
}

export default function ReceiptClientInfo({ user }: ReceiptClientInfoProps) {
    return (
        <section className="receipt-section receipt-client-info">
            <h3 className="receipt-section-title mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <User className="h-4 w-4" />
                Информация о клиенте
            </h3>
            <div className="space-y-1.5">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">ФИО</p>
                    <p className="text-sm font-semibold text-foreground">{user.full_name}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{user.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{user.email}</span>
                </div>
            </div>
        </section>
    );
}
