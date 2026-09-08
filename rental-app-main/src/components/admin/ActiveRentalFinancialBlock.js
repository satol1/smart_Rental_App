import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/admin/ActiveRentalFinancialBlock.tsx
import { ReceiptText, Loader2 } from "lucide-react";
import PromoCodeInput from "@/components/PromoCodeInput";
/**
 * Специализированный компонент для отображения финансовой информации активной аренды.
 * Показывает текущую стоимость, предоплату, остаток к оплате и позволяет управлять промокодами.
 */
export default function ActiveRentalFinancialBlock({ priceDetails, rental, promoCode, setPromoCode, applyPromoCode, removePromoCode, promoCodeMessage = "", isLoading = false, isApplyingPromoCode = false, className }) {
    // Извлекаем данные из priceDetails
    const dayCount = priceDetails?.day_count ?? 0;
    const fullTotal = priceDetails?.full_total ?? 0;
    const finalTotal = priceDetails?.final_total ?? 0;
    const discountAmount = priceDetails?.discount_amount ?? 0;
    const durationDiscountPercentage = priceDetails?.duration_discount_percentage ?? 0;
    const promoDiscountPercentage = priceDetails?.promo_discount_percentage ?? 0;
    const totalDiscountPercentage = durationDiscountPercentage + promoDiscountPercentage;
    const apiPromoCodeMessage = priceDetails?.promo_code_message ?? "";
    // Если промокод очищен, не показываем старое сообщение из API до пересчёта
    const displayPromoCodeMessage = (promoCode && promoCode.length > 0)
        ? (apiPromoCodeMessage || promoCodeMessage)
        : "";
    // Используем пересчитанные данные, если они есть, иначе текущие данные аренды
    const currentTotalCost = finalTotal > 0 ? finalTotal : rental.total_cost;
    const currentDiscountAmount = discountAmount > 0 ? discountAmount : rental.discount_amount;
    const currentDayCount = dayCount > 0 ? dayCount : 0;
    // Рассчитываем остаток к оплате
    const remainingAmount = currentTotalCost - rental.prepayment_amount;
    return (_jsxs("div", { className: `space-y-3 ${className}`, children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-medium text-gray-700", children: [_jsx(ReceiptText, { className: "w-4 h-4" }), "\u0424\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430"] }), isLoading ? (_jsxs("div", { className: "text-center py-4 text-gray-500 flex items-center justify-center gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "\u0420\u0430\u0441\u0447\u0435\u0442 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u0438..."] })) : (_jsxs("div", { className: "text-sm text-gray-700 space-y-2", children: [priceDetails && (_jsxs("div", { className: "p-2 bg-blue-50 rounded border border-blue-200", children: [_jsx("div", { className: "text-xs text-blue-700 font-medium mb-1", children: "\u041F\u0435\u0440\u0435\u0441\u0447\u0435\u0442 \u043F\u043E \u043D\u043E\u0432\u044B\u043C \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u043C:" }), _jsxs("div", { className: "text-xs text-blue-600", children: [currentDayCount, " \u0434\u043D. \u2022 ", fullTotal.toLocaleString('ru-RU'), " \u20BD", totalDiscountPercentage > 0 && (_jsxs("span", { children: [" \u2022 \u0441\u043A\u0438\u0434\u043A\u0430 ", totalDiscountPercentage, "%"] }))] })] })), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0430\u0440\u0435\u043D\u0434\u044B:" }), _jsxs("span", { className: "font-medium", children: [currentTotalCost.toLocaleString('ru-RU'), " \u20BD"] })] }), currentDiscountAmount > 0 && (_jsxs("div", { className: "flex justify-between text-green-600", children: [_jsx("span", { children: "\u0421\u043A\u0438\u0434\u043A\u0430:" }), _jsxs("span", { className: "font-medium", children: ["-", currentDiscountAmount.toLocaleString('ru-RU'), " \u20BD"] })] })), rental.promo_code && (_jsxs("div", { className: "flex justify-between text-purple-600", children: [_jsx("span", { children: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434:" }), _jsx("span", { className: "font-medium", children: rental.promo_code })] })), _jsxs("div", { className: "flex justify-between pt-1 border-t border-dashed", children: [_jsx("span", { children: "\u041F\u0440\u0435\u0434\u043E\u043F\u043B\u0430\u0442\u0430:" }), _jsxs("span", { className: "font-medium text-blue-600", children: [rental.prepayment_amount.toLocaleString('ru-RU'), " \u20BD"] })] }), _jsxs("div", { className: "flex justify-between text-base font-bold pt-1 border-t", children: [_jsx("span", { children: "\u041E\u0441\u0442\u0430\u0442\u043E\u043A \u043A \u043E\u043F\u043B\u0430\u0442\u0435:" }), _jsxs("span", { className: `ml-2 ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`, children: [remainingAmount.toLocaleString('ru-RU'), " \u20BD"] })] }), remainingAmount < 0 && (_jsxs("div", { className: "text-xs text-green-600 bg-green-50 p-2 rounded", children: ["\u041F\u0435\u0440\u0435\u043F\u043B\u0430\u0442\u0430: ", Math.abs(remainingAmount).toLocaleString('ru-RU'), " \u20BD"] }))] })] })), _jsx("div", { className: "pt-2", children: _jsx(PromoCodeInput, { promoCode: promoCode, setPromoCode: setPromoCode, applyPromoCode: applyPromoCode, removePromoCode: removePromoCode, promoCodeMessage: displayPromoCodeMessage, disabled: isLoading, isLoading: isApplyingPromoCode }) })] }));
}
