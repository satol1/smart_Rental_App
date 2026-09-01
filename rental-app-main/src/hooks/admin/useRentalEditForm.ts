// hooks/admin/useRentalEditForm.ts

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/utils";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import type { AdminRentalOut } from "@/types/rental";

// Схема валидации для формы редактирования
const rentalEditSchema = z.object({
    // Поля для активных аренд
    end_date: z.string().optional(),
    prepayment_amount: z.coerce.number().min(0).optional(),
    promo_code: z.string().optional(),
    
    // Поля для завершенных аренд
    actual_return_date: z.string().nullable().optional(),
    status: z.string().optional(),
    final_cost: z.coerce.number().min(0).optional(),
    notes_on_return: z.string().optional(),
    
    // Общие поля
    deposit_amount: z.coerce.number().min(0).optional(),
    notes_on_issue: z.string().optional(),
});

export type RentalEditFormData = z.infer<typeof rentalEditSchema>;

interface UseRentalEditFormProps {
    rental: AdminRentalOut;
}

/**
 * Хук для управления формой редактирования аренды.
 * Отвечает только за управление состоянием формы и валидацию.
 */
export function useRentalEditForm({ rental }: UseRentalEditFormProps) {
    const form = useForm<RentalEditFormData>({
        resolver: zodResolver(rentalEditSchema),
        defaultValues: {
            end_date: formatDate(rental.end_date),
            prepayment_amount: rental.prepayment_amount, // Текущая предоплата
            promo_code: "", // Новый промокод
            actual_return_date: rental.actual_return_date ? formatDate(rental.actual_return_date) : null,
            status: rental.status,
            final_cost: rental.final_cost ?? undefined,
            notes_on_return: rental.notes_on_return ?? "",
            deposit_amount: rental.deposit_amount,
            notes_on_issue: rental.notes_on_issue ?? "",
        },
        mode: "onChange",
    });

    // Валидация выходных дней для даты окончания
    const watchedEndDate = form.watch("end_date");
    const endDateForValidation = watchedEndDate ? new Date(watchedEndDate) : new Date(rental.end_date);
    const startDateForValidation = new Date(rental.start_date);
    
    const { endDateError: holidayError, isHolidayValid } = useHolidayValidation(
        startDateForValidation, 
        endDateForValidation
    );

    return {
        form,
        register: form.register,
        handleSubmit: form.handleSubmit,
        watch: form.watch,
        setValue: form.setValue,
        formState: form.formState,
        // Дополнительные поля для валидации выходных
        holidayError,
        isHolidayValid,
    };
}
