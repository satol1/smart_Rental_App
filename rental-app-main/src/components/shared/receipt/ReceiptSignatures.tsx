interface ReceiptSignaturesProps {
    isCompact?: boolean;
}

export default function ReceiptSignatures({ isCompact = false }: ReceiptSignaturesProps) {
    return (
        <div className={isCompact ? "mt-3" : "mt-8"}>
            <div className="flex justify-between items-end">
                <div>
                    <p className={isCompact ? "text-xs" : "text-sm"}>Клиент: _________________________</p>
                    <p className={`${isCompact ? 'text-xs' : 'text-xs'} text-gray-500`}>(подпись)</p>
                </div>
                <div>
                    <p className={isCompact ? "text-xs" : "text-sm"}>Менеджер: _________________________</p>
                    <p className={`${isCompact ? 'text-xs' : 'text-xs'} text-gray-500`}>(подпись)</p>
                </div>
            </div>
        </div>
    );
}
