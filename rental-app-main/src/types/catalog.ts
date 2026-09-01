// src/types/catalog.ts

import type { Equipment } from './equipment';
import type { PublicPackOut } from './pack';

// Типы для элементов каталога
export type CatalogEquipmentItem = Equipment & { entity_type: 'equipment' };
export type CatalogPackItem = PublicPackOut & { entity_type: 'pack' };
export type CatalogItem = CatalogEquipmentItem | CatalogPackItem;

// Тип-гард для проверки типа элемента каталога
export function isPackItem(item: CatalogItem): item is CatalogPackItem {
  return item.entity_type === 'pack';
}

export function isEquipmentItem(item: CatalogItem): item is CatalogEquipmentItem {
  return item.entity_type === 'equipment';
}
