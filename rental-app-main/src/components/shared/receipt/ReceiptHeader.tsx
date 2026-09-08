import BrandLogo from "@/components/shared/BrandLogo";

interface ReceiptHeaderProps {
    rentalId: number;
    createdAt: string;
    isCompact?: boolean;
}

export default function ReceiptHeader({ rentalId, createdAt, isCompact = false }: ReceiptHeaderProps) {
    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isCompact) {
        return (
            <div className="text-center mb-2">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <BrandLogo size={36} showText={false} animated={false} />
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">
                            Цифровой. Умная аренда техники
                        </h1>
                        <p className="text-xs text-gray-600">
                            ИП Садомцев Анатолий Юрьевич
                        </p>
                    </div>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-2">
                    <h2 className="text-base font-semibold text-sky-950">
                        БЛАНК АРЕНДЫ №{rentalId}
                    </h2>
                    <p className="text-xs text-sky-700">
                        Дата выдачи: {formatDateTime(createdAt)}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
                <BrandLogo size={56} showText={false} animated={false} />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Цифровой. Умная аренда техники
                    </h1>
                    <p className="text-sm text-gray-600">
                        ИП Садомцев Анатолий Юрьевич
                    </p>
                </div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <h2 className="text-xl font-semibold text-sky-950">
                    БЛАНК АРЕНДЫ №{rentalId}
                </h2>
                <p className="text-sm text-sky-700">
                    Дата выдачи: {formatDateTime(createdAt)}
                </p>
            </div>
        </div>
    );
}
