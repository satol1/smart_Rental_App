/**
 * Экспорт всех DI компонентов.
 *
 * Внимание: Container.ts и hooks.ts экспортируют одноимённые хуки
 * (useEquipmentService и т.д.). Каноничные версии — контекстные, из
 * Container.ts; из hooks.ts дополнительно экспортируется только
 * уникальный useExternalDependencies (иначе TS2308 — неоднозначный
 * реэкспорт).
 */

export * from './Container';
export * from './providers';
export { useExternalDependencies } from './hooks';
