// src/types/catalog.ts
// Тип-гард для проверки типа элемента каталога
export function isPackItem(item) {
    return item.entity_type === 'pack';
}
export function isEquipmentItem(item) {
    return item.entity_type === 'equipment';
}
