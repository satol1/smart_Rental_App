interface ReceiptRulesProps {
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    isCompact?: boolean;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    useCard?: boolean;
}

const RULES = [
    "Клиент несет полную материальную ответственность за сохранность и комплектность оборудования с момента получения до момента возврата.",
    "Запрещается использовать оборудование в экстремальных погодных условиях (дождь, снег, сильный ветер, мороз ниже -10°C) без соответствующей защиты.",
    "Запрещается самостоятельно вскрывать, ремонтировать или модифицировать оборудование.",
    "Оборудование должно быть возвращено в том же состоянии и комплектации, в котором было получено, с учетом естественного износа.",
];

export default function ReceiptRules({ }: ReceiptRulesProps) {
    return (
        <section className="receipt-section receipt-rules">
            <h3 className="receipt-section-title mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Основные правила пользования оборудованием
            </h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-800">
                {RULES.map((rule, index) => (
                    <li key={index} className="pl-0.5">{rule}</li>
                ))}
            </ol>
        </section>
    );
}
