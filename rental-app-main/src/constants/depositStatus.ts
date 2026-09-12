// src/constants/depositStatus.ts

export type DepositStatus = 'held' | 'refunded' | 'partially_retained' | 'retained_for_damage';

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  held: 'Удерживается',
  refunded: 'Возвращен клиенту',
  partially_retained: 'Частично удержан',
  retained_for_damage: 'Удержан за ущерб',
};

export const DEPOSIT_ACTION_OPTIONS = [
  { value: 'refund', label: 'Вернуть залог клиенту' },
  { value: 'retain', label: 'Удержать залог полностью' },
  { value: 'partial_retain', label: 'Удержать частично' },
] as const;
