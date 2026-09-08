// src/core/services/UserService.ts
import { api } from "@/lib/api";
import { USER_STATUS } from "@/constants/userStatusConstants";
export class UserService {
    /**
     * Преобразует camelCase поля в snake_case для API
     */
    static toApiFormat(input) {
        const apiPayload = {};
        if (input.full_name !== undefined)
            apiPayload.full_name = input.full_name;
        if (input.email !== undefined)
            apiPayload.email = input.email;
        if (input.password !== undefined)
            apiPayload.password = input.password;
        if (input.role !== undefined)
            apiPayload.role = input.role;
        if (input.phone !== undefined)
            apiPayload.phone = input.phone;
        if (input.telegram_username !== undefined)
            apiPayload.telegram_username = input.telegram_username;
        if (input.privacyPolicyAccepted !== undefined)
            apiPayload.privacy_policy_accepted = input.privacyPolicyAccepted;
        if (input.termsAccepted !== undefined)
            apiPayload.terms_accepted = input.termsAccepted;
        if (input.emailVerified !== undefined)
            apiPayload.email_verified = input.emailVerified;
        return apiPayload;
    }
    /**
     * Получает всех пользователей с пагинацией
     */
    static async getAllUsers(skip = 0, limit = 15) {
        try {
            const response = await api.get("/admin/users/", {
                params: { skip, limit }
            });
            return response.data;
        }
        catch (error) {
            console.error("Ошибка при получении пользователей:", error);
            throw error;
        }
    }
    /**
     * Получает пользователя по ID
     */
    static async getUserById(id) {
        try {
            const response = await api.get(`/admin/users/${id}`);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка при получении пользователя с ID ${id}:`, error);
            throw error;
        }
    }
    /**
     * Создает нового пользователя
     */
    static async createUser(input) {
        try {
            const apiPayload = this.toApiFormat(input);
            const response = await api.post("/admin/users/", apiPayload);
            return response.data;
        }
        catch (error) {
            console.error("Ошибка при создании пользователя:", error);
            throw error;
        }
    }
    /**
     * Обновляет пользователя
     */
    static async updateUser(input) {
        try {
            const { id, ...updateData } = input;
            // Для админского обновления используем специальный метод, который обрабатывает все поля
            const apiPayload = this.toAdminUpdateFormat(updateData);
            const response = await api.put(`/admin/users/${id}`, apiPayload);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка при обновлении пользователя с ID ${input.id}:`, error);
            throw error;
        }
    }
    /**
     * Преобразует поля для админского обновления пользователя (включая status, balance, notes)
     */
    static toAdminUpdateFormat(input) {
        const apiPayload = {};
        // Базовые поля из toApiFormat
        if (input.full_name !== undefined)
            apiPayload.full_name = input.full_name;
        if (input.email !== undefined)
            apiPayload.email = input.email;
        if (input.password !== undefined)
            apiPayload.password = input.password;
        if (input.role !== undefined)
            apiPayload.role = input.role;
        if (input.phone !== undefined)
            apiPayload.phone = input.phone;
        if (input.telegram_username !== undefined)
            apiPayload.telegram_username = input.telegram_username;
        if (input.privacyPolicyAccepted !== undefined)
            apiPayload.privacy_policy_accepted = input.privacyPolicyAccepted;
        if (input.termsAccepted !== undefined)
            apiPayload.terms_accepted = input.termsAccepted;
        if (input.emailVerified !== undefined)
            apiPayload.email_verified = input.emailVerified;
        // Дополнительные поля для админского обновления
        if ('status' in input && input.status !== undefined)
            apiPayload.status = input.status;
        if ('balance' in input && input.balance !== undefined)
            apiPayload.balance = input.balance;
        if ('notes' in input && input.notes !== undefined)
            apiPayload.notes = input.notes;
        return apiPayload;
    }
    /**
     * Удаляет пользователя
     */
    static async deleteUser(id) {
        try {
            await api.delete(`/admin/users/${id}`);
        }
        catch (error) {
            console.error(`Ошибка при удалении пользователя с ID ${id}:`, error);
            throw error;
        }
    }
    /**
     * Активирует/деактивирует пользователя
     */
    static async toggleUserStatus(id, isActive) {
        try {
            const endpoint = isActive ? `/admin/users/${id}/unblock` : `/admin/users/${id}/block`;
            const response = await api.put(endpoint);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка при изменении статуса пользователя ${id}:`, error);
            throw error;
        }
    }
    /**
     * Получает профиль текущего пользователя
     */
    static async getCurrentUserProfile() {
        try {
            const response = await api.get("/user/");
            return response.data;
        }
        catch (error) {
            console.error("Ошибка при получении профиля пользователя:", error);
            throw error;
        }
    }
    /**
     * Обновляет профиль текущего пользователя
     */
    static async updateCurrentUserProfile(input) {
        try {
            const apiPayload = this.toApiFormat(input);
            const response = await api.put("/user/", apiPayload);
            return response.data;
        }
        catch (error) {
            console.error("Ошибка при обновлении профиля пользователя:", error);
            throw error;
        }
    }
    /**
     * Получает историю баланса для текущего пользователя с пагинацией.
     */
    static async getMyBalanceHistory(skip, limit) {
        try {
            const response = await api.get("/user/balance-history", {
                params: { skip, limit }
            });
            return response.data;
        }
        catch (error) {
            console.error("Ошибка при получении истории баланса:", error);
            throw error;
        }
    }
    /**
     * Получает историю баланса для любого пользователя по ID (для администраторов).
     */
    static async getUserBalanceHistory(userId, skip, limit) {
        try {
            const response = await api.get(`/admin/users/${userId}/balance-history`, {
                params: { skip, limit }
            });
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка при получении истории баланса пользователя ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Регистрирует платеж и пополняет баланс пользователя (для менеджеров/админов).
     */
    static async addUserPayment(userId, data) {
        try {
            const response = await api.post(`/admin/users/${userId}/add-payment`, data);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка при добавлении платежа для пользователя ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Выполняет ручную корректировку баланса пользователя (для менеджеров/админов).
     */
    static async adjustUserBalance(userId, data) {
        try {
            const response = await api.post(`/admin/users/${userId}/adjust-balance`, data);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка при корректировке баланса для пользователя ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Удаляет запись из истории баланса (только для администраторов).
     */
    static async deleteBalanceHistoryEntry(historyId) {
        try {
            await api.delete(`/admin/users/balance-history/${historyId}`);
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Фильтрует пользователей по заданным критериям
     */
    static filterUsers(users, filters) {
        return users.filter(user => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch = user.full_name.toLowerCase().includes(searchLower) ||
                    user.email.toLowerCase().includes(searchLower) ||
                    (user.phone && user.phone.toLowerCase().includes(searchLower));
                if (!matchesSearch)
                    return false;
            }
            if (filters.role && user.role !== filters.role)
                return false;
            if (filters.isActive !== undefined && user.is_active !== filters.isActive)
                return false;
            if (filters.status && user.status !== filters.status)
                return false;
            return true;
        });
    }
    /**
     * Валидирует данные пользователя
     */
    static validateUserData(input) {
        const errors = [];
        if (!input.full_name?.trim())
            errors.push("Полное имя обязательно");
        if (!input.email?.trim()) {
            errors.push("Email обязателен");
        }
        else if (!this.isValidEmail(input.email)) {
            errors.push("Некорректный формат email");
        }
        if (!input.role)
            errors.push("Роль пользователя обязательна");
        if (input.phone && !this.isValidPhone(input.phone))
            errors.push("Некорректный формат телефона");
        if (!input.privacyPolicyAccepted)
            errors.push("Необходимо принять политику конфиденциальности");
        if (!input.termsAccepted)
            errors.push("Необходимо принять условия использования");
        return { isValid: errors.length === 0, errors };
    }
    /**
     * Проверяет валидность email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Проверяет валидность телефона
     */
    static isValidPhone(phone) {
        const phoneRegex = /^[+]?[0-9\s-()]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
    /**
     * Сортирует пользователей по заданному критерию
     */
    static sortUsers(users, sortBy, sortOrder = 'asc') {
        return [...users].sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            if (aValue === null || aValue === undefined)
                aValue = '';
            if (bValue === null || bValue === undefined)
                bValue = '';
            if (sortBy === 'created_at') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }
            if (sortBy === 'balance') {
                aValue = Number(aValue) || 0;
                bValue = Number(bValue) || 0;
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            if (aValue < bValue)
                return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue)
                return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
    /**
     * Генерирует ключ для кэширования пользователей
     */
    static generateUsersCacheKey(filters) {
        return JSON.stringify(["users", filters]);
    }
    /**
     * Генерирует ключ для кэширования профиля пользователя
     */
    static generateUserProfileCacheKey() {
        return JSON.stringify(["user-profile"]);
    }
    /**
     * Проверяет, является ли статус пользователя "Персона НонГрата"
     */
    static isPersonaNonGrata(user) {
        return user?.status === USER_STATUS.PERSONA_NON_GRATA;
    }
    /**
     * Проверяет, является ли статус пользователя "Заблокирован"
     */
    static isBlocked(user) {
        return user?.status === USER_STATUS.BLOCKED;
    }
    /**
     * Проверяет, может ли пользователь создавать резервы самостоятельно
     */
    static canCreateReservations(user) {
        if (!user)
            return false;
        return user.status !== USER_STATUS.PERSONA_NON_GRATA && user.status !== USER_STATUS.BLOCKED;
    }
}
