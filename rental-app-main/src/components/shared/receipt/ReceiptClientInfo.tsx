import { Card, CardHeader } from "@/components/ui/card";
import { User, Phone, Mail } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptClientInfoProps {
    user: AdminRentalOut['user'];
    isCompact?: boolean;
    useCard?: boolean;
}

export default function ReceiptClientInfo({ user, isCompact = false, useCard = true }: ReceiptClientInfoProps) {
    const content = (
        <>
            <h3 className={`flex items-center gap-2 ${isCompact ? 'text-sm' : 'text-lg'} font-semibold ${!useCard ? 'mb-1' : ''}`}>
                <User className={isCompact ? "w-3 h-3" : "w-5 h-5"} />
                Информация о клиенте
            </h3>
            {isCompact ? (
                <div className="space-y-1">
                    <div>
                        <p className="text-xs font-medium text-gray-600">ФИО</p>
                        <p className="text-sm font-semibold">{user.full_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-600" />
                        <span className="text-sm">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-600" />
                        <span className="text-sm">{user.phone}</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-600">ФИО</p>
                        <p className="text-base font-semibold">{user.full_name}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email
                        </p>
                        <p className="text-base">{user.email}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Телефон
                        </p>
                        <p className="text-base">{user.phone}</p>
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
