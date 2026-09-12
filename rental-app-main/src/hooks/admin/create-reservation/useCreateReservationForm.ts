// src/hooks/admin/create-reservation/useCreateReservationForm.ts

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/utils";

const createSchema = z.object({
    user_id: z.coerce.number().min(1, "Необходимо выбрать пользователя"),
    start_date: z.string().min(1, "Необходимо указать дату начала"),
    end_date: z.string().min(1, "Необходимо указать дату окончания"),
    equipment_ids: z.array(z.number()).min(1, "Выберите хотя бы одну позицию оборудования"),
    selected_accessories: z.record(z.array(z.number())).optional(),
    deposit_amount: z.number().min(0, "Сумма залога не может быть отрицательной").optional(),
    prepayment_amount: z.number().min(0, "Предоплата не может быть отрицательной").optional(),
    notes_on_issue: z.string().optional(),
}).refine(data => new Date(data.end_date) >= new Date(data.start_date), {
    message: "Дата окончания не может быть раньше даты начала",
    path: ["end_date"],
});

export type CreateReservationFormData = z.infer<typeof createSchema>;

/**
 * Даты по умолчанию для формы: сегодня/завтра на момент монтирования хука.
 * (Модульные константы застывали бы на дне загрузки модуля — после полуночи
 * долгоживущая вкладка предлагала вчерашний день; этап 5.6 аудита.)
 */
function getDefaultDateRange() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    return { today, tomorrow };
}

/**
 * Хук для управления формой создания резерва.
 * Содержит всю логику, связанную с react-hook-form.
 */
export const useCreateReservationForm = () => {
    const { today: todayDate, tomorrow: tomorrowDate } = getDefaultDateRange();
    const form = useForm<CreateReservationFormData>({
        resolver: zodResolver(createSchema), 
        mode: "onChange",
        defaultValues: {
            equipment_ids: [], 
            selected_accessories: {},
            start_date: formatDate(todayDate), 
            end_date: formatDate(tomorrowDate),
            deposit_amount: 0,
            prepayment_amount: 0,
            notes_on_issue: "",
        },
    });

    const { watch, trigger, handleSubmit, reset } = form;

    return {
        form,
        watch,
        trigger,
        handleSubmit,
        reset,
    };
};
