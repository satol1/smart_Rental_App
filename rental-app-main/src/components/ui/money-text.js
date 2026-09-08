import { jsx as _jsx } from "react/jsx-runtime";
// src/components/ui/money-text.tsx
import { cn } from "@/lib/utils";
/** Форматтер суммы; переиспользуется, чтобы не создавать Intl на каждый рендер */
const rubFormatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
});
const rubFormatterWithKopecks = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
/**
 * Форматирует сумму в рубли для строк (тосты, подсказки, шаблоны).
 * null/undefined/NaN → "0 ₽" (как в balanceUtils.formatBalance).
 */
export function formatMoney(value, withKopecks = false) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) {
        return withKopecks
            ? rubFormatterWithKopecks.format(0)
            : rubFormatter.format(0);
    }
    return withKopecks
        ? rubFormatterWithKopecks.format(amount)
        : rubFormatter.format(amount);
}
export function MoneyText({ value, withKopecks = false, className, ...props }) {
    return (_jsx("span", { className: cn("whitespace-nowrap", className), ...props, children: formatMoney(value, withKopecks) }));
}
export default MoneyText;
