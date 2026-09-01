// src/types/pack.ts

import type { Equipment } from "./equipment";

export interface Pack {
  id: number;
  name: string;
  description?: string;
  equipment: Equipment[];
  created_at: string;
  updated_at: string;
}

export interface PackCreateData {
  name: string;
  description?: string;
  equipment_ids: number[];
}

export interface PackUpdateData {
  name?: string;
  description?: string;
  equipment_ids?: number[];
}

// Публичная схема пачки для каталога (соответствует PublicPackOut из бэкенда)
export interface PublicPackOut {
  id: number;
  entity_type: "pack";
  name: string;
  equipment_type: string;
  brand: string;
  image_url?: string;
  total_count: number;
  available_count: number;
  min_daily_rate: number;
  cheapest_available_id?: number;
  equipment_ids: number[];
}

// Типы-обертки для использования в едином массиве
export type CatalogEquipmentItem = Equipment & { entity_type: 'equipment' };
export type CatalogPackItem = PublicPackOut; // entity_type уже есть в PublicPackOut

// Главный тип-объединение для элемента каталога
export type CatalogItem = CatalogEquipmentItem | CatalogPackItem;