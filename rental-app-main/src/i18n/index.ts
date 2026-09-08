// src/i18n/index.ts
// Инфраструктура локализации. Русский — единственный язык (fallbackLng 'ru');
// словарь заложен как основа для будущей инкрементальной миграции текстов.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ru from "./locales/ru.json";
import { redesignCatalog } from './redesign-catalog';
import { redesignShell } from './redesign-shell';
import { redesignOrders } from './redesign-orders';

export const DEFAULT_LANGUAGE = "ru";

void i18n.use(initReactI18next).init({
  resources: {
    [DEFAULT_LANGUAGE]: {
      translation: { ...ru, catalogDesign: redesignCatalog, shell: redesignShell, ordersDesign: redesignOrders },
    },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  // React сам экранирует значения при рендере — двойное экранирование не нужно
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
