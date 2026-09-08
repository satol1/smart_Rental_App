import { Card, CardHeader } from "@/components/ui/card";

interface ReceiptRulesProps {
    isCompact?: boolean;
    useCard?: boolean;
}

export default function ReceiptRules({ isCompact = false, useCard = true }: ReceiptRulesProps) {
    const content = (
        <>
            <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold ${!useCard ? 'mb-1' : ''}`}>
                Основные правила пользования оборудованием
            </h3>
            <ul className={`space-y-2 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">{isCompact ? "1." : "1."}</span>
                    <span>Клиент несет полную материальную ответственность за сохранность и комплектность оборудования с момента получения до момента возврата.</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">{isCompact ? "2." : "2."}</span>
                    <span>Запрещается использовать оборудование в экстремальных погодных условиях (дождь, снег, сильный ветер, мороз ниже -10°C) без соответствующей защиты.</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">{isCompact ? "3." : "3."}</span>
                    <span>Запрещается самостоятельно вскрывать, ремонтировать или модифицировать оборудование.</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">{isCompact ? "4." : "4."}</span>
                    <span>Оборудование должно быть возвращено в том же состоянии и комплектации, в котором было получено, с учетом естественного износа.</span>
                </li>
            </ul>
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
