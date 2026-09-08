/**
 * Финансовые константы скидок.
 *
 * Значения обязаны дублировать бэкенд:
 * RentalApp_FASTAPI/shared/constants/constants.py → MAX_COMBINED_DISCOUNT.
 * Фронт показывает ровно то, что спишет бэкенд, иначе карточки и «песочница»
 * дезинформируют пользователя (цена «после скидки» ниже фактической).
 */

/** Потолок суммарной скидки (длительность + промокод), в процентах */
export const MAX_COMBINED_DISCOUNT_PERCENT = 75

/** Суммарная скидка с потолком как на бэкенде (validate_combined_discount) */
export function combinedDiscountPercentage(
  durationDiscountPercentage: number,
  promoDiscountPercentage: number
): number {
  return Math.min(
    durationDiscountPercentage + promoDiscountPercentage,
    MAX_COMBINED_DISCOUNT_PERCENT
  )
}
