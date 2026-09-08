// src/types/user.ts

import { z } from "zod";
import { USER_ROLE_VALUES, type UserRole as UserRoleType } from "@/constants/userConstants";
import { USER_STATUS } from "@/constants/userStatusConstants";

export type UserRole = UserRoleType;

// Массив значений статусов для валидации через Enum
const USER_STATUS_VALUES = Object.values(USER_STATUS) as [string, ...string[]];

// Схема для валидации пользователя
export const userOutSchema = z.object({
    id: z.number(),
    full_name: z.string(),
    email: z.string().email(),
    telegram_username: z.string().nullable().optional(),
    role: z.enum(USER_ROLE_VALUES),
    is_active: z.boolean().nullable().transform((val) => val ?? false),
    phone: z.string().nullable().optional(),
    status: z.enum(USER_STATUS_VALUES).nullable().optional(),
    balance: z.number().optional(),
    notes: z.string().nullable().optional(),
    privacy_policy_accepted: z.boolean(),
    terms_accepted: z.boolean(),
    email_verified: z.boolean(),
    created_at: z.string().datetime(),
});

// Тип, который получается из схемы
export type UserOut = z.infer<typeof userOutSchema>;

// +++ ДОБАВЬТЕ ЭТОТ ИНТЕРФЕЙС +++
// Он описывает структуру ответа от /user/admin/users
export interface UserListResponse {
    items: UserOut[];
    total: number;
}

// +++ НАЧАЛО: Тип для запроса на пополнение баланса +++
export interface UserPaymentRequest {
    amount: number;
    payment_method: string;
    description?: string;
}
// +++ КОНЕЦ: Тип для запроса +++

// +++ НАЧАЛО: Тип для запроса на корректировку баланса +++
export interface AdminBalanceAdjustmentRequest {
    amount: number;
    description: string;
}
// +++ КОНЕЦ: Тип для запроса +++