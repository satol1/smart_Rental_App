import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/pages/ReservePage.tsx
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import AuthForm from "@/components/AuthForm";
import CancelReservationDialog from "@/components/CancelReservationDialog";
import { Button } from "@/components/ui/button";
import { useReserveSubmission } from "@/hooks/reservation/submission/useReserveSubmission";
import { formatDate } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";
import ReservationItemsList from "@/components/reservation/ReservationItemsList";
import FinancialSummaryBlock from "@/components/shared/FinancialSummaryBlock";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import { mapLegacyUserStatus, EDIT_RESTRICTION_DAYS } from "@/constants/userStatusConstants";
import { daysUntilDate } from "@/utils/dates";
export default function ReservePage() {
    const navigate = useNavigate();
    const { items, user, startDate, endDate, setStartDate, setEndDate, availabilityMap, unavailableIdsFromAPI, invalidItems, reservationSuccess, clearReserveStore, removeItemFromStore, isAccessorySelected, toggleAccessory, isLoadingAvailability, isSubmitting, isApplyingPromoCode, priceDetails, accessoriesDailyTotal, promoCode, promoCodeMessage, applyPromoCode, setPromoCode, removePromoCode, handleSubmit, selectedAccessories, } = useReserveSubmission();
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showAuthForm, setShowAuthForm] = useState(true); // Показываем форму авторизации по умолчанию
    // Prefetch страницы «Мои заказы»: после успешного оформления происходит
    // редирект на неё, а lazy-чанк грузится первым разом именно в этот момент —
    // из-за этого переход казался «медленным». Прогреваем чанк заранее.
    useEffect(() => {
        void import("@/pages/MyReservationsPage");
    }, []);
    // Валидация выходных вынесена в переиспользуемый хук
    const { startDateError, endDateError, isHolidayValid } = useHolidayValidation(startDate, endDate);
    const handleConfirmCancel = () => {
        clearReserveStore();
        navigate("/");
    };
    // Обработчик успешной авторизации
    const handleAuthSuccess = () => {
        setShowAuthForm(false);
    };
    // Показываем форму авторизации, если пользователь не авторизован и форма должна быть показана
    const shouldShowAuthForm = !user && showAuthForm;
    // Автоматически управляем отображением формы авторизации
    useEffect(() => {
        if (user) {
            // Если пользователь авторизован, скрываем форму
            setShowAuthForm(false);
        }
        else {
            // Если пользователь не авторизован, показываем форму
            setShowAuthForm(true);
        }
    }, [user]);
    const isFormValid = useMemo(() => {
        return !!(user && invalidItems.length === 0 && unavailableIdsFromAPI.length === 0 && isHolidayValid);
    }, [user, invalidItems.length, unavailableIdsFromAPI.length, isHolidayValid]);
    // Понятная причина, почему кнопка подтверждения недоступна (Booking-паттерн:
    // не молча гасить кнопку, а объяснять, что нужно сделать)
    const formInvalidReason = useMemo(() => {
        if (!user)
            return null; // неавторизованным показываем форму входа выше
        if (invalidItems.length > 0)
            return "Устраните конфликты выбранных позиций.";
        if (unavailableIdsFromAPI.length > 0)
            return "Часть оборудования недоступна в выбранные даты — измените даты или состав.";
        if (!isHolidayValid)
            return "Даты резерва выпадают на выходной день — выберите рабочие даты.";
        return null;
    }, [user, invalidItems.length, unavailableIdsFromAPI.length, isHolidayValid]);
    // Правила отмены показываются ДО подтверждения (Booking/Airbnb-паттерн):
    // пользователь знает условия заранее, а не после оформления
    const cancellationPolicyNote = useMemo(() => {
        const userStatus = mapLegacyUserStatus(user?.status);
        if (!userStatus)
            return undefined;
        const needDays = EDIT_RESTRICTION_DAYS[userStatus] + 1;
        const startIn = daysUntilDate(startDate);
        const base = `Отмена/изменение самостоятельно — не позднее чем за ${needDays} дн. до начала (ваш статус: «${userStatus}»), позже — через менеджера. В течение 24 ч после создания резерв можно отменить бесплатно.`;
        if (startIn >= 0 && startIn < needDays) {
            return `${base} Внимание: до начала выбранного периода ${Math.max(startIn, 0)} дн. — самостоятельная отмена будет доступна только в первые 24 ч после оформления.`;
        }
        return base;
    }, [user?.status, startDate]);
    // ✅ ДОБАВЛЕНО: Расчет минимальной даты для поля "Конец"
    const minEndDate = useMemo(() => {
        const nextDay = new Date(startDate);
        nextDay.setDate(startDate.getDate() + 1);
        return formatDate(nextDay);
    }, [startDate]);
    if (items.length === 0 && !reservationSuccess) {
        return (_jsxs("div", { className: "text-center mt-12 p-4", children: [_jsx(ShoppingCart, { className: "mx-auto h-16 w-16 text-gray-300" }), _jsx("p", { className: "mt-4 text-lg text-gray-700", children: "\u0412\u0430\u0448\u0430 \u043A\u043E\u0440\u0437\u0438\u043D\u0430 \u043F\u0443\u0441\u0442\u0430." }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "\u0412\u044B \u0435\u0449\u0435 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043B\u0438 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u0440\u0435\u0437\u0435\u0440\u0432\u0430." }), _jsx(Button, { variant: "default", className: "mt-6", onClick: () => navigate("/", {
                        state: {
                            intent: "add_to_new_reservation",
                            startDate: startDate.toISOString(),
                            endDate: endDate.toISOString()
                        }
                    }), children: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0432\u044B\u0431\u043E\u0440\u0443 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" })] }));
    }
    // Блок успешного оформления удален: редирект и toast происходят в useReservations
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "max-w-3xl mx-auto px-4 py-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u0430" }), _jsx("button", { onClick: () => navigate("/", {
                                    state: {
                                        intent: "add_to_new_reservation",
                                        startDate: startDate.toISOString(),
                                        endDate: endDate.toISOString()
                                    }
                                }), className: "text-sm text-sky-600 hover:underline", children: "\u2190 \u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u0432\u044B\u0431\u043E\u0440\u0443" })] }), shouldShowAuthForm ? (_jsxs("div", { className: "p-4 border rounded-md shadow-sm bg-white", children: [_jsx("h2", { className: "text-lg font-semibold mb-3 text-gray-700", children: "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "\u0414\u043B\u044F \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044F \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0432\u043E\u0439\u0442\u0438 \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0438\u043B\u0438 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F." }), _jsx(AuthForm, { onSuccess: handleAuthSuccess })] })) : !user ? (_jsxs("div", { className: "p-4 border rounded-md shadow-sm bg-white text-center", children: [_jsx("p", { className: "text-sm text-gray-600 mb-4", children: "\u0414\u043B\u044F \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044F \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F." }), _jsx(Button, { onClick: () => setShowAuthForm(true), className: "w-full sm:w-auto", children: "\u0412\u043E\u0439\u0442\u0438 / \u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F" })] })) : null, _jsxs("div", { className: "p-4 border rounded-md shadow-sm bg-white", children: [_jsx("h2", { className: "text-lg font-semibold mb-3 text-gray-700", children: "\u0414\u0430\u0442\u044B \u0440\u0435\u0437\u0435\u0440\u0432\u0430:" }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-center items-center gap-4", children: [_jsxs("div", { className: "flex flex-col items-start w-full sm:w-auto", children: [_jsx("label", { htmlFor: "start-date", className: "text-sm text-gray-600 mb-1", children: "\u041D\u0430\u0447\u0430\u043B\u043E:" }), _jsx("input", { id: "start-date", type: "date", className: "border rounded px-3 py-1 text-sm shadow-sm w-full focus:ring-sky-500 focus:border-sky-500", value: formatDate(startDate), onChange: (e) => { const d = new Date(e.target.value); if (!isNaN(d.getTime()))
                                                    setStartDate(d); }, min: formatDate(new Date()) }), startDateError && _jsx("p", { className: "text-xs text-red-600 mt-1", children: startDateError })] }), _jsxs("div", { className: "flex flex-col items-start w-full sm:w-auto", children: [_jsx("label", { htmlFor: "end-date", className: "text-sm text-gray-600 mb-1", children: "\u041A\u043E\u043D\u0435\u0446:" }), _jsx("input", { id: "end-date", type: "date", className: "border rounded px-3 py-1 text-sm shadow-sm w-full focus:ring-sky-500 focus:border-sky-500", value: formatDate(endDate), onChange: (e) => { const d = new Date(e.target.value); if (!isNaN(d.getTime()))
                                                    setEndDate(d); }, 
                                                // ✅ ИЗМЕНЕНИЕ: Установлено минимальное значение для поля
                                                min: minEndDate }), endDateError && _jsx("p", { className: "text-xs text-red-600 mt-1", children: endDateError })] })] })] }), isLoadingAvailability && _jsx("p", { className: "text-center text-gray-500 py-3", children: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u0438..." }), _jsx(ReservationItemsList, { items: items, selectedAccessories: selectedAccessories, availabilityMap: availabilityMap, unavailableIdsFromAPI: unavailableIdsFromAPI, invalidItems: invalidItems, onRemoveItem: removeItemFromStore, onRemoveAccessory: toggleAccessory, isAccessorySelected: isAccessorySelected, onToggleAccessory: toggleAccessory }), _jsx(FinancialSummaryBlock, { priceDetails: priceDetails, accessoriesDailyTotal: accessoriesDailyTotal, promoCode: promoCode, setPromoCode: setPromoCode, applyPromoCode: applyPromoCode, removePromoCode: removePromoCode, promoCodeMessage: promoCodeMessage, isLoading: isLoadingAvailability, isApplyingPromoCode: isApplyingPromoCode, isSubmitting: isSubmitting, isFormValid: isFormValid, formInvalidReason: formInvalidReason, cancellationPolicyNote: cancellationPolicyNote, onCancel: () => setShowCancelDialog(true), onAddMore: () => navigate("/", {
                            state: {
                                intent: "add_to_new_reservation",
                                startDate: startDate.toISOString(),
                                endDate: endDate.toISOString()
                            }
                        }), onSubmit: handleSubmit, variant: "default", showActions: true })] }), _jsx(CancelReservationDialog, { open: showCancelDialog, onClose: () => setShowCancelDialog(false), onConfirm: handleConfirmCancel })] }));
}
