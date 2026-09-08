// src/store/filterStore.ts
import { create } from "zustand"

type FilterState = {
  brandSystemId: number | null
  /** Текстовый фильтр бренда (не используется UI, сохранён для совместимости потребителей хуков) */
  brand: string | null
  type: string | null
  associationId: number | null
  availableOnly: boolean
  groupSimilar: boolean
  setBrandSystemId: (id: number | null) => void
  setType: (type: string | null) => void
  setAssociationId: (id: number | null) => void
  setAvailableOnly: (value: boolean) => void
  setGroupSimilar: (value: boolean) => void
  reset: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  brandSystemId: null,        // По умолчанию показывать все системы брендов
  brand: null,
  type: null,                  // <-- По умолчанию показывать все типы
  associationId: null,
  availableOnly: false,
  groupSimilar: true,          // По умолчанию группировать одинаковые
  setBrandSystemId: (id) => set({ brandSystemId: id }),
  setType: (type) => set({ type }),
  setAssociationId: (id) => set({ associationId: id }),
  setAvailableOnly: (value) => set({ availableOnly: value }),
  setGroupSimilar: (value) => set({ groupSimilar: value }),
  reset: () => set({
    brandSystemId: null,
    brand: null,
    type: null,               // <-- Сброс должен тоже давать null
    associationId: null,
    availableOnly: false,
    groupSimilar: true,       // Сброс в группировку по умолчанию
  }),
}))
