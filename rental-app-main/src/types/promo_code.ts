// src/types/promo_code.ts

// Тип для данных, которые мы получаем от API при запросе списка промокодов
export interface PromoCodeOut {
    id: number;
    code: string;
    description: string | null;
    discount_percentage: number;
    is_active: boolean;
    valid_from: string | null; // Даты приходят как строки в формате ISO
    expires_at: string | null;
    max_uses: number | null;
    times_used: number;
    max_uses_per_user: number | null;
    min_order_amount: number | null;
    specific_to_user_id: number | null;
    applicable_to_equipment_ids: number[] | null;
    applicable_to_equipment_types: string[] | null;
    created_at: string;
    created_by_id: number;
    creator_email?: string; // Опциональное поле для удобства
}

// Тип для данных, которые мы отправляем на API для создания промокода
// Поля, которые генерируются сервером (id, times_used, created_at и т.д.), здесь отсутствуют.
export type PromoCodeCreate = Omit<PromoCodeOut, 'id' | 'times_used' | 'created_at' | 'created_by_id' | 'creator_email'>;

// Тип для обновления. Все поля опциональны, так как мы можем обновлять их по одному.
export type PromoCodeUpdate = Partial<PromoCodeCreate>;

// +++ НАЧАЛО ИЗМЕНЕНИЙ: Добавьте этот интерфейс +++
// Он описывает структуру ответа API с пагинацией
export interface PromoCodeListResponse {
    items: PromoCodeOut[];
    total: number;
}
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++