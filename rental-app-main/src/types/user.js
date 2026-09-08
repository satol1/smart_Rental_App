// src/types/user.ts
import { z } from "zod";
import { USER_ROLE_VALUES } from "@/constants/userConstants";
import { USER_STATUS } from "@/constants/userStatusConstants";
// Массив значений статусов для валидации через Enum
const USER_STATUS_VALUES = Object.values(USER_STATUS);
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
// +++ КОНЕЦ: Тип для запроса +++
