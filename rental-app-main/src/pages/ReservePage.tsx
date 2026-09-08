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

    const {
        items,
        user,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        availabilityMap,
        unavailableIdsFromAPI,
        invalidItems,
        reservationSuccess,
        clearReserveStore,
        removeItemFromStore,
        isAccessorySelected,
        toggleAccessory,
        isLoadingAvailability,
        isSubmitting,
        isApplyingPromoCode,
        priceDetails,
        accessoriesDailyTotal,
        promoCode,
        promoCodeMessage,
        applyPromoCode,
        setPromoCode,
        removePromoCode,
        handleSubmit,
        selectedAccessories,
    } = useReserveSubmission();

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
        } else {
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
        if (!user) return null; // неавторизованным показываем форму входа выше
        if (invalidItems.length > 0) return "Устраните конфликты выбранных позиций.";
        if (unavailableIdsFromAPI.length > 0) return "Часть оборудования недоступна в выбранные даты — измените даты или состав.";
        if (!isHolidayValid) return "Даты резерва выпадают на выходной день — выберите рабочие даты.";
        return null;
    }, [user, invalidItems.length, unavailableIdsFromAPI.length, isHolidayValid]);

    // Правила отмены показываются ДО подтверждения (Booking/Airbnb-паттерн):
    // пользователь знает условия заранее, а не после оформления
    const cancellationPolicyNote = useMemo(() => {
        const userStatus = mapLegacyUserStatus(user?.status);
        if (!userStatus) return undefined;
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
        return (
            <div className="text-center mt-12 p-4">
                <ShoppingCart className="mx-auto h-16 w-16 text-gray-300" />
                <p className="mt-4 text-lg text-gray-700">Ваша корзина пуста.</p>
                <p className="mt-1 text-sm text-gray-500">Вы еще не выбрали оборудование для резерва.</p>
                <Button
                    variant="default"
                    className="mt-6"
                    onClick={() => navigate("/", { 
                        state: { 
                            intent: "add_to_new_reservation",
                            startDate: startDate.toISOString(),
                            endDate: endDate.toISOString()
                        } 
                    })}
                >
                    Перейти к выбору оборудования
                </Button>
            </div>
        );
    }

    // Блок успешного оформления удален: редирект и toast происходят в useReservations

    return (
        <>
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Оформление резерва</h1>
                    <button
                        onClick={() => navigate("/", { 
                            state: { 
                                intent: "add_to_new_reservation",
                                startDate: startDate.toISOString(),
                                endDate: endDate.toISOString()
                            } 
                        })}
                        className="text-sm text-sky-600 hover:underline"
                    >
                        ← Вернуться к выбору
                    </button>
                </div>

                {shouldShowAuthForm ? (
                    <div className="p-4 border rounded-md shadow-sm bg-white">
                        <h2 className="text-lg font-semibold mb-3 text-gray-700">Авторизация</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Для оформления резерва необходимо войти в аккаунт или зарегистрироваться.
                        </p>
                        <AuthForm onSuccess={handleAuthSuccess} />
                    </div>
                ) : !user ? (
                    <div className="p-4 border rounded-md shadow-sm bg-white text-center">
                        <p className="text-sm text-gray-600 mb-4">
                            Для оформления резерва необходимо авторизоваться.
                        </p>
                        <Button 
                            onClick={() => setShowAuthForm(true)}
                            className="w-full sm:w-auto"
                        >
                            Войти / Зарегистрироваться
                        </Button>
                    </div>
                ) : null}

                <div className="p-4 border rounded-md shadow-sm bg-white">
                    <h2 className="text-lg font-semibold mb-3 text-gray-700">Даты резерва:</h2>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <div className="flex flex-col items-start w-full sm:w-auto">
                            <label htmlFor="start-date" className="text-sm text-gray-600 mb-1">Начало:</label>
                            <input id="start-date" type="date" className="border rounded px-3 py-1 text-sm shadow-sm w-full focus:ring-sky-500 focus:border-sky-500"
                                   value={formatDate(startDate)}
                                   onChange={(e) => { const d = new Date(e.target.value); if(!isNaN(d.getTime())) setStartDate(d); }}
                                   min={formatDate(new Date())} />
                            {startDateError && <p className="text-xs text-red-600 mt-1">{startDateError}</p>}
                        </div>
                        <div className="flex flex-col items-start w-full sm:w-auto">
                            <label htmlFor="end-date" className="text-sm text-gray-600 mb-1">Конец:</label>
                            <input id="end-date" type="date" className="border rounded px-3 py-1 text-sm shadow-sm w-full focus:ring-sky-500 focus:border-sky-500"
                                   value={formatDate(endDate)}
                                   onChange={(e) => { const d = new Date(e.target.value); if(!isNaN(d.getTime())) setEndDate(d); }}
                                // ✅ ИЗМЕНЕНИЕ: Установлено минимальное значение для поля
                                   min={minEndDate} />
                            {endDateError && <p className="text-xs text-red-600 mt-1">{endDateError}</p>}
                        </div>
                    </div>
                </div>

                {isLoadingAvailability && <p className="text-center text-gray-500 py-3">Проверка доступности...</p>}

                <ReservationItemsList
                    items={items}
                    selectedAccessories={selectedAccessories}
                    availabilityMap={availabilityMap}
                    unavailableIdsFromAPI={unavailableIdsFromAPI}
                    invalidItems={invalidItems}
                    onRemoveItem={removeItemFromStore}
                    onRemoveAccessory={toggleAccessory}
                    isAccessorySelected={isAccessorySelected}
                    onToggleAccessory={toggleAccessory}
                />

                <FinancialSummaryBlock
                    priceDetails={priceDetails}
                    accessoriesDailyTotal={accessoriesDailyTotal}
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
                    applyPromoCode={applyPromoCode}
                    removePromoCode={removePromoCode}
                    promoCodeMessage={promoCodeMessage}
                    isLoading={isLoadingAvailability}
                    isApplyingPromoCode={isApplyingPromoCode}
                    isSubmitting={isSubmitting}
                    isFormValid={isFormValid}
                    formInvalidReason={formInvalidReason}
                    cancellationPolicyNote={cancellationPolicyNote}
                    onCancel={() => setShowCancelDialog(true)}
                    onAddMore={() => navigate("/", { 
                        state: { 
                            intent: "add_to_new_reservation",
                            startDate: startDate.toISOString(),
                            endDate: endDate.toISOString()
                        } 
                    })}
                    onSubmit={handleSubmit}
                    variant="default"
                    showActions={true}
                />
            </div>

            <CancelReservationDialog
                open={showCancelDialog}
                onClose={() => setShowCancelDialog(false)}
                onConfirm={handleConfirmCancel}
            />
        </>
    );
}
