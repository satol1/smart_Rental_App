/**
 * Типы для работы с временными периодами
 */

export type PeriodType = "week" | "month" | "quarter" | "year";

export interface PeriodFilter {
  type: PeriodType;
  offset: number;
  startDate: Date;
  endDate: Date;
}

export interface PeriodOption {
  value: PeriodType;
  label: string;
  description: string;
}

export interface PeriodServiceResult {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface PeriodNavigation {
  canGoBack: boolean;
  canGoForward: boolean;
  currentOffset: number;
  currentLabel: string;
}
