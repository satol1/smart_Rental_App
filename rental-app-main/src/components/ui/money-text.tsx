// src/components/ui/money-text.tsx

import { cn } from "@/lib/utils";

/**
 * Единое отображение денежных сумм.
 *
 * Формат — Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).
 * По умолчанию копейки отбрасываются (в приложении все суммы — целые рубли:
 * ранее они отображались как `value.toLocaleString('ru-RU') + ' ₽'`).
 * Это сохраняет привычный вид "1 234 ₽" и стандартизирует его во всех разделах.
 */

export interface MoneyTextProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Сумма в рублях */
  value: number | null | undefined;
  /** Показывать копейки ("1 234,50 ₽") */
  withKopecks?: boolean;
}

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
export function formatMoney(
  value: number | null | undefined,
  withKopecks = false,
): string {
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

export function MoneyText({
  value,
  withKopecks = false,
  className,
  ...props
}: MoneyTextProps) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)} {...props}>
      {formatMoney(value, withKopecks)}
    </span>
  );
}

export default MoneyText;
