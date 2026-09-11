// src/core/services/AccessoryService.ts

import { api } from "@/lib/api";
import type { Accessory, AccessoryListResponse } from "@/types/accessory"; // Убедитесь, что AccessoryListResponse импортирован

export interface AccessoryCreateInput {
    name: string;
    accessory_type: string;
    price: number;
    description?: string;
}

export interface AccessoryUpdateInput extends AccessoryCreateInput {
    id: number;
}

export interface AccessoryFilterOptions {
    search?: string;
    accessoryType?: string;
    minPrice?: number;
    maxPrice?: number;
}

export interface AccessoryValidationResult {
    isValid: boolean;
    errors: string[];
}

export class AccessoryService {
    /**
     * Получает все аксессуары с пагинацией
     */
    static async getAllAccessories(skip: number, limit: number): Promise<AccessoryListResponse> {
        const response = await api.get("/accessories/", {
            params: { skip, limit }
        });
        // ВАЖНО: API возвращает объект { items: [], total: 0 },
        // и теперь наш сервис корректно его обрабатывает.
        return response.data;
    }

    /**
     * Получает аксессуар по ID
     */
    static async getAccessoryById(id: number): Promise<Accessory> {
        const response = await api.get(`/accessories/${id}`);
        return response.data;
    }

    /**
     * Создает новый аксессуар
     */
    static async createAccessory(input: AccessoryCreateInput): Promise<Accessory> {
        const response = await api.post("/accessories/", input);
        return response.data;
    }

    /**
     * Обновляет аксессуар
     */
    static async updateAccessory(input: AccessoryUpdateInput): Promise<Accessory> {
        const response = await api.put(`/accessories/${input.id}`, input);
        return response.data;
    }

    /**
     * Удаляет аксессуар
     */
    static async deleteAccessory(id: number): Promise<void> {
        await api.delete(`/accessories/${id}`);
    }

    /**
     * Фильтрует аксессуары по заданным критериям
     */
    static filterAccessories(
        accessories: Accessory[],
        filters: AccessoryFilterOptions
    ): Accessory[] {
        return accessories.filter(accessory => {
            // Фильтр по поиску
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    accessory.name.toLowerCase().includes(searchLower) ||
                    accessory.accessory_type.toLowerCase().includes(searchLower) ||
                    (accessory.description && accessory.description.toLowerCase().includes(searchLower));

                if (!matchesSearch) {
                    return false;
                }
            }

            // Фильтр по типу аксессуара
            if (filters.accessoryType && accessory.accessory_type !== filters.accessoryType) {
                return false;
            }

            // Фильтр по минимальной цене
            if (filters.minPrice !== undefined && accessory.price < filters.minPrice) {
                return false;
            }

            // Фильтр по максимальной цене
            if (filters.maxPrice !== undefined && accessory.price > filters.maxPrice) {
                return false;
            }

            return true;
        });
    }

    /**
     * Группирует аксессуары по типу
     */
    static groupAccessoriesByType(accessories: Accessory[]): Record<string, Accessory[]> {
        return accessories.reduce((acc, accessory) => {
            const type = accessory.accessory_type;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(accessory);
            return acc;
        }, {} as Record<string, Accessory[]>);
    }

    /**
     * Сортирует аксессуары по заданному критерию
     */
    static sortAccessories(
        accessories: Accessory[],
        sortBy: 'name' | 'accessory_type' | 'price',
        sortOrder: 'asc' | 'desc' = 'asc'
    ): Accessory[] {
        return [...accessories].sort((a, b) => {
            let aValue: string | number = a[sortBy];
            let bValue: string | number = b[sortBy];

            // Для чисел (price)
            if (sortBy === 'price') {
                aValue = Number(aValue) || 0;
                bValue = Number(bValue) || 0;
            }

            // Строковое сравнение
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) {
                return sortOrder === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    /**
     * Валидирует данные аксессуара
     */
    static validateAccessoryData(input: AccessoryCreateInput): AccessoryValidationResult {
        const errors: string[] = [];

        if (!input.name?.trim()) {
            errors.push("Название аксессуара обязательно");
        }

        if (!input.accessory_type?.trim()) {
            errors.push("Тип аксессуара обязателен");
        }

        if (input.price <= 0) {
            errors.push("Цена должна быть больше нуля");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Рассчитывает общую стоимость выбранных аксессуаров
     */
    static calculateAccessoriesTotal(
        selectedAccessories: Record<number, number[]>,
        allAccessories: Accessory[]
    ): number {
        let total = 0;

        Object.entries(selectedAccessories).forEach(([, accessoryIds]) => {
            accessoryIds.forEach(accessoryId => {
                const accessory = allAccessories.find(acc => acc.id === accessoryId);
                if (accessory) {
                    total += accessory.price;
                }
            });
        });

        return total;
    }

    /**
     * Получает аксессуары по их ID
     */
    static getAccessoriesByIds(
        accessoryIds: number[],
        allAccessories: Accessory[]
    ): Accessory[] {
        return allAccessories.filter(accessory => accessoryIds.includes(accessory.id));
    }

    /**
     * Генерирует ключ для кэширования аксессуаров
     */
    static generateAccessoriesCacheKey(filters?: AccessoryFilterOptions): string {
        return JSON.stringify(["accessories", filters]);
    }

    /**
     * Генерирует ключ для кэширования аксессуаров оборудования
     */
    static generateEquipmentAccessoriesCacheKey(equipmentId: number): string {
        return JSON.stringify(["equipment-accessories", equipmentId]);
    }
}