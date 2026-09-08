import logo from "@/assets/logo.webp";

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
                    <img 
                        src={logo} 
                        alt="Логотип" 
                        className="w-10 h-10"
                    />
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">
                            Цифровой. Умная аренда техники
                        </h1>
                        <p className="text-xs text-gray-600">
                            ИП Садомцев Анатолий Юрьевич
                        </p>
                    </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <h2 className="text-base font-semibold text-blue-900">
                        БЛАНК АРЕНДЫ №{rentalId}
                    </h2>
                    <p className="text-xs text-blue-700">
                        Дата выдачи: {formatDateTime(createdAt)}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
                <img 
                    src={logo} 
                    alt="Логотип" 
                    className="w-16 h-16"
                />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Цифровой. Умная аренда техники
                    </h1>
                    <p className="text-sm text-gray-600">
                        ИП Садомцев Анатолий Юрьевич
                    </p>
                </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-blue-900">
                    БЛАНК АРЕНДЫ №{rentalId}
                </h2>
                <p className="text-sm text-blue-700">
                    Дата выдачи: {formatDateTime(createdAt)}
                </p>
            </div>
        </div>
    );
}
