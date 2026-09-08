// src/core/services/PromoCodeService.ts
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/queryHelpers";
export class PromoCodeService {
    /**
     * Получает все промокоды
     */
    static async getAllPromoCodes() {
        const response = await api.get("/promocodes/");
        return response.data;
    }
    /**
     * Получает промокод по ID
     */
    static async getPromoCodeById(id) {
        const response = await api.get(`/promocodes/${id}`);
        return response.data;
    }
    /**
     * Создает новый промокод
     */
    static async createPromoCode(input) {
        const response = await api.post("/promocodes/", input);
        return response.data;
    }
    /**
     * Обновляет промокод
     */
    static async updatePromoCode(id, input) {
        const response = await api.put(`/promocodes/${id}`, input);
        return response.data;
    }
    /**
     * Удаляет промокод
     */
    static async deletePromoCode(id) {
        await api.delete(`/promocodes/${id}`);
    }
    /**
     * Активирует/деактивирует промокод
     */
    static async togglePromoCodeStatus(id, isActive) {
        const response = await api.patch(`/promocodes/${id}/toggle-status`, { is_active: isActive });
        return response.data;
    }
    /**
     * Валидирует промокод для конкретного заказа
     */
    static async validatePromoCode(code, equipmentIds, totalAmount, userId) {
        try {
            const response = await api.post("/promocodes/validate", {
                code,
                equipment_ids: equipmentIds,
                total_amount: totalAmount,
                user_id: userId
            });
            return response.data;
        }
        catch (error) {
            return {
                isValid: false,
                message: getApiErrorMessage(error, "Промокод недействителен"),
                discountPercentage: 0
            };
        }
    }
    /**
     * Фильтрует промокоды по заданным критериям
     */
    static filterPromoCodes(promoCodes, filters) {
        return promoCodes.filter(promo => {
            // Фильтр по активности
            if (filters.isActive !== undefined && promo.is_active !== filters.isActive) {
                return false;
            }
            // Фильтр по поиску
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch = promo.code.toLowerCase().includes(searchLower) ||
                    (promo.description && promo.description.toLowerCase().includes(searchLower));
                if (!matchesSearch) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Валидирует данные промокода перед созданием/обновлением
     */
    static validatePromoCodeData(input) {
        const errors = [];
        if (!input.code?.trim()) {
            errors.push("Код промокода обязателен");
        }
        if (input.discount_percentage <= 0 || input.discount_percentage > 100) {
            errors.push("Процент скидки должен быть от 1 до 100");
        }
        if (input.valid_from && input.expires_at) {
            const validFrom = new Date(input.valid_from);
            const expiresAt = new Date(input.expires_at);
            if (validFrom >= expiresAt) {
                errors.push("Дата окончания должна быть позже даты начала");
            }
        }
        if (input.max_uses !== null && input.max_uses <= 0) {
            errors.push("Максимальное количество использований должно быть больше нуля");
        }
        if (input.max_uses_per_user !== null && input.max_uses_per_user <= 0) {
            errors.push("Максимальное количество использований на пользователя должно быть больше нуля");
        }
        if (input.min_order_amount !== null && input.min_order_amount <= 0) {
            errors.push("Минимальная сумма заказа должна быть больше нуля");
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Проверяет, активен ли промокод в данный момент
     */
    static isPromoCodeActive(promoCode) {
        if (!promoCode.is_active) {
            return false;
        }
        const now = new Date();
        // Проверка даты начала
        if (promoCode.valid_from) {
            const validFrom = new Date(promoCode.valid_from);
            if (now < validFrom) {
                return false;
            }
        }
        // Проверка даты окончания
        if (promoCode.expires_at) {
            const expiresAt = new Date(promoCode.expires_at);
            if (now > expiresAt) {
                return false;
            }
        }
        // Проверка максимального количества использований
        if (promoCode.max_uses !== null && promoCode.times_used >= promoCode.max_uses) {
            return false;
        }
        return true;
    }
    /**
     * Генерирует ключ для кэширования промокодов
     */
    static generatePromoCodesCacheKey(filters) {
        return JSON.stringify(["promo-codes", filters]);
    }
    /**
     * Генерирует ключ для кэширования валидации промокода
     */
    static generateValidationCacheKey(code, equipmentIds, totalAmount, userId) {
        return JSON.stringify([
            "promo-code-validation",
            code,
            equipmentIds.sort(),
            totalAmount,
            userId
        ]);
    }
}
