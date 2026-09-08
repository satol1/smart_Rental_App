import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// src/components/admin/ReturnRentalDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRentalReturnForm } from "@/hooks/admin/useRentalReturnForm";
import ReturnFinancials from "./ReturnFinancials";
import ReturnAccessoriesChecklist from "./ReturnAccessoriesChecklist";
export default function ReturnRentalDialog({ rental, open, onClose }) {
    const { 
    // Состояния
    paymentAmount, setPaymentAmount, paymentDescription, setPaymentDescription, paymentApplied, checkedAccessories, dynamicRemainingAmount, 
    // Функции-обработчики
    handleApplyPayment, handleCancelPayment, handleToggleAccessory, handleAutoFillPayment, onSubmit, 
    // Состояния мутаций
    isSubmittingReturn, isApplyingPayment, 
    // Данные формы от react-hook-form
    register, handleSubmit, formState: { errors, isValid }, 
    // Другие вычисляемые значения
    accessoriesByEquipment, allAccessoriesChecked, totalAccessoriesCount, } = useRentalReturnForm({ rental, onClose });
    if (!rental)
        return null;
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: ["\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 \u0430\u0440\u0435\u043D\u0434\u044B #", rental.id] }), _jsxs(DialogDescription, { children: ["\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0442 \u043E\u0442 \u043A\u043B\u0438\u0435\u043D\u0442\u0430: ", _jsx("strong", { children: rental.user.full_name }), "."] })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "actual_return_date", children: "\u0424\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0434\u0430\u0442\u0430 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 *" }), _jsx(Input, { id: "actual_return_date", type: "date", ...register("actual_return_date") }), errors.actual_return_date && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.actual_return_date.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "notes_on_return", children: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438 \u043F\u0440\u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0435" }), _jsx(Textarea, { id: "notes_on_return", ...register("notes_on_return"), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0447\u0438\u0441\u0442\u043E\u0435, \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u044F \u043F\u043E\u043B\u043D\u0430\u044F..." })] }), _jsx(ReturnFinancials, { rental: rental, dynamicRemainingAmount: dynamicRemainingAmount, paymentAmount: paymentAmount, setPaymentAmount: setPaymentAmount, paymentDescription: paymentDescription, setPaymentDescription: setPaymentDescription, paymentApplied: paymentApplied, handleApplyPayment: handleApplyPayment, handleCancelPayment: handleCancelPayment, isApplyingPayment: isApplyingPayment, handleAutoFillPayment: handleAutoFillPayment, overdueSurcharge: rental.overdue_surcharge || undefined }), _jsx(ReturnAccessoriesChecklist, { rental: rental, accessoriesByEquipment: accessoriesByEquipment, checkedAccessories: checkedAccessories, handleToggleAccessory: handleToggleAccessory, totalAccessoriesCount: totalAccessoriesCount }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || isSubmittingReturn || (totalAccessoriesCount > 0 && !allAccessoriesChecked), children: isSubmittingReturn ? "Обработка..." : "Подтвердить возврат" })] })] })] }) }));
}
