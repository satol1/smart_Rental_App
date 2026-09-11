// src/components/ui/money-text.tsx

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

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
