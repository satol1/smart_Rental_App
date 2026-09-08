import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// path: rental-app-main/src/components/DiscountCalculator.tsx
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSandboxCalculatorStore } from '@/store/sandboxCalculatorStore';
import { combinedDiscountPercentage } from '@/constants/discount';
import { useDateStore } from '@/store/dateStore';
import { usePromoCodeStore } from '@/store/promoCodeStore';
import { useReserveStore } from '@/store/reserveStore';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { ChevronRight, Percent, Loader2 } from "lucide-react";
import PromoCodeInput from './PromoCodeInput';
import { toast } from 'sonner';
import { api } from '@/lib/api';
export default function DiscountCalculator() {
    const { dayCount } = useDateStore();
    const { setDaysFromSlider, isCalculatorVisible, toggleCalculator, isLoadingTiers, durationDiscountPercentage, durationDiscountTiers, syncWithDateStore } = useSandboxCalculatorStore();
    const { promoCodeInput, setPromoCodeInput, applyPromoCode, removePromoCode, promoCodePercentage, promoCodeMessage, setPromoCodeResult, } = usePromoCodeStore();
    const debounceTimeoutRef = useRef(null);
    useEffect(() => {
        syncWithDateStore();
    }, [dayCount, syncWithDateStore]);
    const [isApplyingPromoCode, setIsApplyingPromoCode] = useState(false);
    const handleApplyPromoCode = async () => {
        const currentItems = useReserveStore.getState().items;
        const currentDays = useDateStore.getState().dayCount;
        if (!promoCodeInput) {
            toast.info("Введите промокод");
            return;
        }
        const totalDailyRate = currentItems.reduce((sum, item) => sum + item.daily_rate, 0);
        // Аксессуары входят в сумму заказа: бэкенд проверяет min_order_amount
        // по полной стоимости (оборудование + аксессуары), без них промо с порогом
        // ложно отклонялся на фронте
        const selectedAccessoriesMap = useReserveStore.getState().selectedAccessories;
        const accessoriesDailyRate = currentItems.reduce((sum, item) => {
            const selectedIds = selectedAccessoriesMap[item.id] || [];
            const itemAccessoriesRate = (item.accessories || [])
                .filter(acc => selectedIds.includes(acc.id))
                .reduce((s, acc) => s + acc.price, 0);
            return sum + itemAccessoriesRate;
        }, 0);
        // Если сумма заказа 0 (нет товаров), бэкенд вернет ошибку о мин. сумме, если она есть у промокода.
        const orderAmount = (totalDailyRate + accessoriesDailyRate) * currentDays;
        setIsApplyingPromoCode(true);
        try {
            const response = await api.post("/promocodes/validate", {
                code: promoCodeInput,
                order_amount: orderAmount,
                equipment_ids: currentItems.map(item => item.id)
            });
            setPromoCodeResult(response.data.discount_percentage, response.data.message);
            // Фиксируем введенный код как примененный для всех расчетов
            applyPromoCode();
            toast.success(response.data.message);
        }
        catch (error) {
            const apiError = error;
            const errorMessage = apiError.response?.data?.detail || "Не удалось применить промокод";
            setPromoCodeResult(0, errorMessage);
            toast.error(errorMessage);
        }
        finally {
            setIsApplyingPromoCode(false);
        }
    };
    const handleSliderChange = useCallback((event) => {
        const newDays = Number(event.target.value);
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            setDaysFromSlider(newDays);
        }, 10);
    }, [setDaysFromSlider]);
    const totalDiscountPercentage = useMemo(() => combinedDiscountPercentage(durationDiscountPercentage, promoCodePercentage), [durationDiscountPercentage, promoCodePercentage]);
    // Вычисляем максимальное значение для бегунка на основе максимального min_days + 3 (рабочие дни)
    const maxSliderDays = useMemo(() => {
        if (durationDiscountTiers.length === 0)
            return 30; // fallback значение
        const maxMinDays = Math.max(...durationDiscountTiers.map(tier => tier.min_days));
        return maxMinDays + 3; // Это рабочие дни
    }, [durationDiscountTiers]);
    const getDiscountInfo = (percent) => {
        if (percent >= 25)
            return { label: "Максимум выгоды!", className: "text-amber-600 font-bold" };
        if (percent >= 20)
            return { label: "Отличная скидка!", className: "text-purple-600 font-bold" };
        if (percent >= 15)
            return { label: "Хорошая скидка", className: "text-green-600 font-bold" };
        if (percent > 0)
            return { label: "Небольшая скидка", className: "text-sky-600" };
        return { label: "Скидка зависит от дней", className: "text-gray-500" };
    };
    const discountInfo = getDiscountInfo(totalDiscountPercentage);
    if (!isCalculatorVisible) {
        return (_jsx(Card, { className: "my-4 bg-gray-50/50 hover:bg-gray-100 cursor-pointer transition", onClick: toggleCalculator, children: _jsx(CardContent, { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Percent, { className: "w-5 h-5 text-purple-500" }), _jsx("div", { className: "text-sm", children: _jsxs("p", { className: "text-gray-800", children: [_jsx("span", { className: "text-base font-bold text-purple-600", children: "\u0415\u0441\u0442\u044C \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434?" }), _jsx("span", { className: "font-medium", children: " \u0438\u043B\u0438 \u0445\u043E\u0442\u0438\u0442\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u0441\u043A\u0438\u0434\u043A\u0443?" })] }) })] }), _jsx(ChevronRight, { className: "w-5 h-5 text-gray-400" })] }) }) }));
    }
    return (_jsx(Card, { className: "my-4 bg-white border-sky-200 shadow-md", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex flex-col md:flex-row items-center justify-between gap-6 w-full", children: [_jsx("div", { className: "w-full md:flex-1", children: _jsx(PromoCodeInput, { promoCode: promoCodeInput, setPromoCode: setPromoCodeInput, applyPromoCode: handleApplyPromoCode, removePromoCode: removePromoCode, promoCodeMessage: promoCodeMessage, isLoading: isApplyingPromoCode }) }), _jsxs("div", { className: "w-full md:flex-1", children: [_jsxs(Label, { htmlFor: "days-slider", className: "mb-2 block text-sm text-gray-700", children: ["\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043D\u0435\u0439: ", _jsx("span", { className: "font-bold", children: dayCount }), _jsx("span", { className: "ml-2 text-xs text-gray-500", children: "(\u0434\u0432\u0438\u0433\u0430\u0439\u0442\u0435 \u043F\u043E\u043B\u0437\u0443\u043D\u043E\u043A \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0434\u0430\u0442)" }), _jsxs("span", { className: "ml-2 text-xs text-blue-500", children: ["Max: ", maxSliderDays] })] }), _jsx("input", { id: "days-slider", type: "range", min: "1", max: maxSliderDays, value: dayCount, onChange: handleSliderChange, className: "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-600" })] }), _jsx("div", { className: "flex-shrink-0 text-center bg-sky-50 py-2 px-4 rounded-lg border w-full md:w-auto min-w-[160px]", children: isLoadingTiers ? (_jsxs("div", { className: "flex items-center justify-center text-gray-500", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }), " \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..."] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: `text-2xl font-bold transition-colors duration-300 ${discountInfo.className}`, children: ["\u0421\u043A\u0438\u0434\u043A\u0430: ", totalDiscountPercentage, "%"] }), _jsx("p", { className: `text-xs mt-1 transition-colors duration-300 ${discountInfo.className}`, children: discountInfo.label })] })) })] }) }) }));
}
