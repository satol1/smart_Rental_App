// hooks/admin/useRentalEditDataPreparation.ts

import { formatDate } from "@/lib/utils";
import type { AdminRentalOut } from "@/types/rental";
import type { RentalEditFormData } from "./useRentalEditForm";
import type { AdminRentalUpdateData } from "@/core/services/RentalService";

interface UseRentalEditDataPreparationProps {
    rental: AdminRentalOut;
}

/**
 * Хук для подготовки данных формы к отправке на сервер.
 * Отвечает только за логику подготовки данных в зависимости от статуса аренды.
 */
export function useRentalEditDataPreparation({ rental }: UseRentalEditDataPreparationProps) {
    const prepareUpdateData = (data: RentalEditFormData) => {
        const updateData: AdminRentalUpdateData = {};
        
        if (['active', 'overdue'].includes(rental.status)) {
            // Для активных аренд
            if (data.end_date && data.end_date !== formatDate(rental.end_date)) {
                updateData.end_date = data.end_date;
            }
            if (data.prepayment_amount !== undefined) {
                updateData.prepayment_amount = data.prepayment_amount;
            }
            if (data.promo_code !== undefined) {
                updateData.promo_code = data.promo_code || null;
            }
        } else if (rental.status === 'completed') {
            // Для завершенных аренд
            if (data.final_cost !== undefined) {
                updateData.final_cost = data.final_cost;
            }
            if (data.notes_on_return !== undefined) {
                updateData.notes_on_return = data.notes_on_return;
            }
        }
        
        // Общие поля
        if (data.deposit_amount !== undefined) {
            updateData.deposit_amount = data.deposit_amount;
        }
        if (data.notes_on_issue !== undefined) {
            updateData.notes_on_issue = data.notes_on_issue;
        }

        return updateData;
    };

    return {
        prepareUpdateData,
    };
}
