// src/types/equipment.ts

// ✅ ДОБАВЛЕН ИМПОРТ
import type { Accessory } from "./accessory";

export interface Equipment {
  id: number;
  entity_type?: "equipment"; // ✅ ДОБАВЛЕНО ПОЛЕ для консистентности с бэкендом
  equipment_type: string;
  brand: string;
  name: string;
  serial_number?: string;
  condition: string;
  daily_rate: number;
  notes?: string;
  description?: string;
  last_maintenance?: string;
  image_url?: string;
  image_urls?: string[];
  short_description?: string;
  // ✅ ДОБАВЛЕНО ПОЛЕ
  accessories: Accessory[];
}