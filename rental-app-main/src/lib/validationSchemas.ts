// src/lib/validationSchemas.ts

import { z } from "zod";
import { USER_ROLE_VALUES } from "@/constants/userConstants";
import { USER_STATUS } from "@/constants/userStatusConstants";

// Вспомогательная функция для валидации российского номера телефона
const validateRussianPhone = (phone: string): boolean => {
    if (!phone) return true; // Пустое значение разрешено для опциональных полей

    // Удаляем всё, что не является цифрой
    const cleanPhone = phone.replace(/[^\d]/g, '');

    // Проверяем, что номер имеет правильную длину и формат
    if (cleanPhone.length < 10) return false;

    // Российский номер должен начинаться с 7 или 8 и иметь 11 цифр
    return /^[78]\d{10}$/.test(cleanPhone);
};

// Вспомогательная функция для валидации Telegram username
const validateTelegramUsername = (username: string): boolean => {
    if (!username || username.trim() === '') return true; // Пустое значение разрешено для опциональных полей

    // Убираем @ если есть в начале
    const cleanUsername = username.replace(/^@/, '').trim();

    // Если после очистки строка пустая, это валидно
    if (!cleanUsername) return true;

    // Проверяем формат: 5-32 символа, только буквы, цифры и подчеркивания
    return /^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername);
};

// --- Аутентификация ---
// Схема для входа в систему (без полей согласия)
export const loginSchema = z.object({
    email: z.string().min(1, "Email обязателен").email("Некорректный email"),
    password: z.string().min(6, "Пароль должен быть не менее 6 символов"),
});

// Схема для регистрации (с полями согласия)
export const registerSchema = z.object({
    email: z.string().min(1, "Email обязателен").email("Некорректный email"),
    password: z.string()
        .min(8, "Пароль должен быть не менее 8 символов")
        .regex(/[a-z]/, "Пароль должен содержать строчные буквы")
        .regex(/[A-Z]/, "Пароль должен содержать заглавные буквы")
        .regex(/\d/, "Пароль должен содержать цифры"),
    fullName: z.string().min(2, "ФИО должно быть не короче 2 символов"),
    phone: z.string().optional().refine(val => !val || validateRussianPhone(val), {
        message: "Некорректный формат номера телефона. Используйте формат: +7 (XXX) XXX-XX-XX",
    }),
    telegram_username: z.string().optional().refine(val => !val || validateTelegramUsername(val), {
        message: "Формат: @username, 5-32 символа, только a-z, 0-9, _",
    }),
    privacyPolicyAccepted: z.boolean().refine(val => val === true, {
        message: "Необходимо принять политику конфиденциальности",
    }),
    termsAccepted: z.boolean().refine(val => val === true, {
        message: "Необходимо принять условия использования",
    }),
});

// Объединенная схема для совместимости (используется в AuthForm)
export const authSchema = z.union([loginSchema, registerSchema]);
export type AuthSchema = z.infer<typeof authSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;


// --- Резервы ---
// Эта Zod-схема теперь является ЕДИНСТВЕННЫМ источником правды для типа данных при создании резерва.
export const reservationCreateSchema = z.object({
    user_id: z.number().optional(), // Для создания резерва админом
    equipment_ids: z.array(z.number()).min(1, "Необходимо выбрать хотя бы одно оборудование для резерва."),
    start_date: z.string().refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime()), {
        message: "Некорректная дата начала.",
    }),
    end_date: z.string().refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime()), {
        message: "Некорректная дата окончания.",
    }),
    selected_accessories: z.record(z.array(z.number())).default({}),
    promo_code: z.string().optional(),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
    message: "Дата окончания должна быть позже даты начала.",
    path: ["end_date"],
});

// Экспортируем тип, созданный на основе Zod-схемы.
// Теперь этот тип будет использоваться в сервисах и хуках, гарантируя соответствие.
export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;


// --- Управление пользователями (Админ-панель) ---
export const adminUserCreateFormSchema = z.object({
    full_name: z.string().min(2, "ФИО обязательно"),
    email: z.string().min(1, "Email обязателен").email("Некорректный email"),
    password: z.string()
        .min(8, "Пароль должен быть не менее 8 символов")
        .regex(/[a-z]/, "Пароль должен содержать строчные буквы")
        .regex(/[A-Z]/, "Пароль должен содержать заглавные буквы")
        .regex(/\d/, "Пароль должен содержать цифры"),
    phone: z.string().optional().refine(val => !val || validateRussianPhone(val), {
        message: "Некорректный формат номера. Используйте: +7 (XXX) XXX-XX-XX",
    }),
    telegram_username: z.string().optional().refine(val => !val || validateTelegramUsername(val), {
        message: "Формат: @username, 5-32 символа",
    }),
    role: z.enum(USER_ROLE_VALUES, {
        errorMap: () => ({ message: "Необходимо выбрать роль." })
    }),
    privacyPolicyAccepted: z.boolean(),
    termsAccepted: z.boolean(),
    emailVerified: z.boolean(),
});
export type AdminUserCreateFormSchema = z.infer<typeof adminUserCreateFormSchema>;

// Массив значений статусов для валидации через Enum
const USER_STATUS_VALUES = Object.values(USER_STATUS) as [string, ...string[]];

export const adminUserUpdateSchema = z.object({
    full_name: z.string().min(2, "ФИО обязательно").optional(),
    email: z.string().min(1, "Email обязателен").email("Некорректный email").optional(),
    phone: z.string().optional().refine(val => !val || validateRussianPhone(val), {
        message: "Некорректный формат номера. Используйте: +7 (XXX) XXX-XX-XX",
    }),
    telegram_username: z.string().optional().refine(val => !val || validateTelegramUsername(val), {
        message: "Формат: @username, 5-32 символа",
    }),
    status: z.enum(USER_STATUS_VALUES).optional(),
    notes: z.string().optional(),
    balance: z.coerce.number().optional(),
    role: z.enum(USER_ROLE_VALUES).optional()
});
export type AdminUserUpdateSchema = z.infer<typeof adminUserUpdateSchema>;

export const adminUserRoleUpdateSchema = z.object({
    role: z.enum(USER_ROLE_VALUES, {
        errorMap: () => ({ message: "Необходимо выбрать роль." })
    })
});
export type AdminUserRoleUpdateSchema = z.infer<typeof adminUserRoleUpdateSchema>;


// --- Управление оборудованием ---
export const equipmentCreateSchema = z.object({
    equipment_type: z.string().min(1, "Тип оборудования не должен быть пустым."),
    brand: z.string().min(1, "Бренд не должен быть пустым."),
    name: z.string().min(1, "Название не должно быть пустым."),
    serial_number: z.string().nullable().optional().transform(val => val === "" ? null : val),
    condition: z.string().optional(),
    daily_rate: z.preprocess(
        (val) => (val === "" || val === null || val === undefined) ? 0 : parseFloat(String(val)),
        z.number({ invalid_type_error: "Стоимость должна быть числом." })
            .min(0, "Стоимость не может быть отрицательной.")
    ),
    notes: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    last_maintenance: z.string().nullable().optional().refine(val => val === null || val === undefined || val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val), {
        message: "Дата последнего ТО должна быть в формате ГГГГ-ММ-ДД или отсутствовать.",
    }).transform(val => (val === "" ? undefined : val)),
    short_description: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    image_urls: z.array(z.string()).optional(),
    accessory_ids: z.array(z.number()).optional(),
});
export type EquipmentCreateSchema = z.infer<typeof equipmentCreateSchema>;

export const equipmentUpdateExtendedSchema = z.object({
    equipment_type: z.string().min(1, "Тип оборудования не должен быть пустым."),
    brand: z.string().min(1, "Бренд не должен быть пустым."),
    name: z.string().min(1, "Название не должно быть пустым."),
    serial_number: z.string().nullable().optional(),
    condition: z.string().optional(),
    daily_rate: z.preprocess(
        (val) => {
            if (val === "" || val === null || val === undefined) return undefined;
            const parsed = parseFloat(String(val));
            return isNaN(parsed) ? undefined : parsed;
        },
        z.number({ invalid_type_error: "Стоимость должна быть числом." })
            .positive("Стоимость должна быть положительным числом.")
            .optional()
    ),
    notes: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    last_maintenance: z.string().nullable().optional().refine(val => val === null || val === undefined || val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val), {
        message: "Дата последнего ТО должна быть в формате ГГГГ-ММ-ДД или отсутствовать.",
    }).transform(val => (val === "" ? undefined : val)),
    short_description: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    image_urls: z.array(z.string()).optional(),
    accessory_ids: z.array(z.number()).optional(),
});
export type EquipmentUpdateExtendedSchema = z.infer<typeof equipmentUpdateExtendedSchema>;


// --- Управление аксессуарами ---
export const accessorySchema = z.object({
    name: z.string().min(2, { message: "Название должно содержать минимум 2 символа." }),
    accessory_type: z.string().optional(),
    price: z.preprocess(
        (value) => (value === "" ? undefined : value),
        z.coerce.number({ invalid_type_error: "Цена должна быть числом." })
            .min(0, { message: "Цена не может быть отрицательной." })
            .optional()
    ),
    description: z.string().optional(),
});
export type AccessorySchema = z.infer<typeof accessorySchema>;


// --- Управление промокодами ---
export const promoCodeFormSchema = z.object({
    code: z.string().min(3, "Код должен содержать минимум 3 символа").max(50),
    description: z.string().optional(),
    discount_percentage: z.coerce.number({ invalid_type_error: "Скидка должна быть числом" })
        .min(1, "Скидка должна быть больше 0")
        .max(50, "Максимальная скидка 50%"),
    is_active: z.boolean().default(true),
    valid_from: z.date().optional(),
    expires_at: z.date().optional(),
    max_uses: z.preprocess(
        (val) => (val === "" || val === null || val === undefined) ? undefined : parseInt(String(val), 10),
        z.number().positive("Значение должно быть больше 0").optional()
    ),
    max_uses_per_user: z.preprocess(
        (val) => (val === "" || val === null || val === undefined) ? undefined : parseInt(String(val), 10),
        z.number().positive("Значение должно быть больше 0").optional()
    ),
    min_order_amount: z.preprocess(
        (val) => (val === "" || val === null || val === undefined) ? undefined : parseFloat(String(val)),
        z.number().positive("Значение должно быть больше 0").optional()
    ),
    applicable_to_equipment_ids: z.array(z.number()).optional(),
    applicable_to_equipment_types: z.array(z.string()).optional(),
    specific_to_user_id: z.coerce.number().optional(),
}).refine(data => {
    if (data.valid_from && data.expires_at) {
        return data.expires_at >= data.valid_from;
    }
    return true;
}, {
    message: "Дата окончания не может быть раньше даты начала",
    path: ["expires_at"],
});
export type PromoCodeFormData = z.infer<typeof promoCodeFormSchema>;

// +++ НАЧАЛО: Новая схема для формы пополнения баланса +++
export const userPaymentSchema = z.object({
    amount: z.coerce
        .number({ invalid_type_error: "Сумма должна быть числом" })
        .positive("Сумма должна быть больше нуля"),
    payment_method: z.string().min(1, "Необходимо выбрать метод оплаты"),
    description: z.string().optional(),
});
export type UserPaymentSchema = z.infer<typeof userPaymentSchema>;
// +++ КОНЕЦ: Новая схема +++

// +++ НАЧАЛО: Схема для корректировки баланса +++
export const adminBalanceAdjustmentSchema = z.object({
    amount: z.coerce
        .number({ invalid_type_error: "Сумма должна быть числом" })
        .refine(val => val !== 0, "Сумма не может быть нулевой"),
    description: z.string()
        .min(1, "Описание обязательно")
        .max(500, "Описание не должно превышать 500 символов"),
});
export type AdminBalanceAdjustmentSchema = z.infer<typeof adminBalanceAdjustmentSchema>;
// +++ КОНЕЦ: Схема для корректировки баланса +++
