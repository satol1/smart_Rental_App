// src/constants/balanceOperationTypes.ts

/**
 * Маппинг типов операций баланса на понятные названия для пользователя
 */
export const BALANCE_OPERATION_TYPES = {
  // Операции с арендой
  rental_debit: "Списание за аренду",
  rental_revert_credit: "Возврат за отмену аренды",
  
  // Операции с авансом
  prepayment: "Пополнение аванса",
  prepayment_refund_on_revert: "Возврат аванса",
  
  // Операции с возвратом
  early_return_credit: "Возврат за досрочное завершение",
  partial_return_credit: "Возврат за часть техники",
  overdue_surcharge_debit: "Штраф за просрочку",
  
  // Операции с балансом
  balance_top_up: "Пополнение баланса",
  debt_repayment: "Погашение задолженности",
  
  // Ручные корректировки
  manual_credit: "Ручное начисление",
  manual_debit: "Ручное списание",
  
  // Резервные операции (если есть)
  reservation_payment: "Оплата резерва",
  reservation_cancellation_refund: "Возврат за отмену резерва",
} as const;

/**
 * Получить понятное название типа операции
 */
export function getOperationTypeLabel(operationType: string): string {
  return BALANCE_OPERATION_TYPES[operationType as keyof typeof BALANCE_OPERATION_TYPES] || operationType;
}

/**
 * Определить цвет для типа операции
 */
export function getOperationTypeColor(_operationType: string, amount: number): string {
  // Операции пополнения (положительные)
  if (amount > 0) {
    return "text-success";
  }

  // Операции списания (отрицательные)
  if (amount < 0) {
    return "text-destructive";
  }

  // Нейтральные операции
  return "text-muted-foreground";
}

/**
 * Определить иконку для типа операции
 */
export function getOperationTypeIcon(operationType: string): string {
  switch (operationType) {
    case "rental_debit":
      return "🏠"; // Дом для аренды
    case "rental_revert_credit":
      return "↩️"; // Стрелка возврата
    case "prepayment":
      return "💰"; // Деньги для аванса
    case "prepayment_refund_on_revert":
      return "💸"; // Деньги с стрелкой для возврата аванса
    case "early_return_credit":
      return "⏰"; // Часы для досрочного возврата
    case "partial_return_credit":
      return "📦"; // Коробка для частичного возврата
    case "overdue_surcharge_debit":
      return "⚠️"; // Предупреждение для штрафа
    case "balance_top_up":
      return "💳"; // Карта для пополнения
    case "debt_repayment":
      return "✅"; // Галочка для погашения долга
    case "manual_credit":
      return "➕"; // Плюс для ручного начисления
    case "manual_debit":
      return "➖"; // Минус для ручного списания
    default:
      return "💼"; // Портфель по умолчанию
  }
}
