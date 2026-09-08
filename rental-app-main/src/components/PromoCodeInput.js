import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// path: rental-app-main/src/components/PromoCodeInput.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TicketPercent, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
export default function PromoCodeInput({ promoCode, setPromoCode, applyPromoCode, removePromoCode, promoCodeMessage, disabled = false, isLoading = false, requirementMessage, }) {
    const handleApply = () => {
        if (!promoCode || !promoCode.trim()) {
            toast.info("Пожалуйста, введите промокод.");
            return;
        }
        applyPromoCode();
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleApply();
        }
    };
    const isApplied = promoCodeMessage && promoCodeMessage.length > 0;
    const isSuccess = isApplied && promoCodeMessage.includes("успешно");
    const isDisabledByRequirement = !!requirementMessage;
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx(Label, { htmlFor: "promo-code", className: "text-base md:text-lg font-semibold text-purple-600", children: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434" }), promoCode && removePromoCode && (_jsx("button", { onClick: removePromoCode, className: "text-[11px] text-gray-500 hover:text-red-600 hover:underline", children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C" }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative flex-grow", children: [_jsx(TicketPercent, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" }), _jsx(Input, { id: "promo-code", type: "text", placeholder: "SALE15", value: promoCode, onChange: (e) => setPromoCode(e.target.value), onKeyDown: handleKeyDown, disabled: disabled || isLoading || isSuccess || isDisabledByRequirement, className: "pl-8" }), isSuccess && promoCode && (_jsx(CheckCircle, { className: "absolute right-2.5 top-2.5 h-4 w-4 text-green-500" }))] }), _jsx(Button, { type: "button", variant: "outline", onClick: handleApply, disabled: disabled || isLoading || isSuccess || isDisabledByRequirement, children: isLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Применить" })] }), isDisabledByRequirement && (_jsxs("div", { className: "flex items-center gap-1.5 text-xs mt-1.5 text-orange-600", children: [_jsx(XCircle, { className: "h-3.5 w-3.5" }), _jsx("span", { children: requirementMessage })] })), !isDisabledByRequirement && isApplied && promoCode && (_jsxs("div", { className: `flex items-center gap-2 text-xs mt-1.5 ${isSuccess ? "text-green-600" : "text-red-600"}`, children: [!isSuccess && _jsx(XCircle, { className: "h-3.5 w-3.5" }), _jsx("span", { children: promoCodeMessage })] }))] }));
}
