// src/types/api/schemas.ts

/**
 * Тонкий слой над сгенерированными типами API (schema.d.ts, openapi-typescript).
 * Новые сервисы/хуки должны импортировать типы отсюда, а не объявлять вручную —
 * это держит контракт фронт↔бэк честным (дрейф ловит CI drift-check).
 *
 * Регенерация: `npm run gen:api` (после изменений OpenAPI бэкенда).
 */
import type { components, paths } from "./schema";

export type ApiSchemas = components["schemas"];

// --- Auth ---
export type ApiToken = ApiSchemas["Token"];
export type ApiUserOut = ApiSchemas["UserOut"];

// --- Резервы ---
export type ApiReservationItem = ApiSchemas["ReservationItem"];
export type ApiReservationListResponse = ApiSchemas["ReservationListResponse"];
export type ApiAdminReservationOut = ApiSchemas["AdminReservationOut"];
export type ApiAdminReservationListResponse = ApiSchemas["AdminReservationListResponse"];

// --- Аренды ---
export type ApiRentalOut = ApiSchemas["RentalOut"];
export type ApiRentalListResponse = ApiSchemas["RentalListResponse"];

// --- Дашборд ---
export type ApiDashboardSummary = ApiSchemas["DashboardSummaryResponse"];
export type ApiKpiData = ApiSchemas["KpiData"];
export type ApiActivityFeedItem = ApiSchemas["ActivityFeedItem"];
export type ApiTodayFocusItem = ApiSchemas["TodayFocusItem"];
export type ApiPopularEquipmentItem = ApiSchemas["PopularEquipmentItem"];

/** Ответ POST /api/auth/register (inline-схема, безымянная в components) */
export type ApiRegisterResponse =
    paths["/api/auth/register"]["post"]["responses"]["201"]["content"]["application/json"];
