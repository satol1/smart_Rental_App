/**
 * DI контейнер для frontend приложения
 * Управляет всеми зависимостями и их жизненным циклом
 */

import React, { createContext, useContext, ReactNode } from 'react';

// Импорты сервисов
import { EquipmentService } from '../services/EquipmentService';
import { RentalService } from '../services/RentalService';
import { ReservationService } from '../services/ReservationService';
import { UserService } from '../services/UserService';
import { PromoCodeService } from '../services/PromoCodeService';
import { AccessoryService } from '../services/AccessoryService';
import { AvailabilityService } from '../services/AvailabilityService';
import { CalendarService } from '../services/CalendarService';
import { DateService } from '../services/DateService';
import { HolidayService } from '../services/HolidayService';
import { BrandSystemService } from '../services/BrandSystemService';

// Импорты внешних зависимостей
import { api } from '@/lib/api';

/**
 * Интерфейс для DI контейнера
 */
export interface DIContainer {
  // Сервисы
  equipmentService: EquipmentService;
  rentalService: RentalService;
  reservationService: ReservationService;
  userService: UserService;
  promoCodeService: PromoCodeService;
  accessoryService: AccessoryService;
  availabilityService: AvailabilityService;
  calendarService: CalendarService;
  dateService: DateService;
  holidayService: HolidayService;
  brandSystemService: BrandSystemService;
  
  // Внешние зависимости
  api: typeof api;
}

/**
 * Создание экземпляра DI контейнера
 */
export const createContainer = (): DIContainer => {
  // Создаем экземпляры сервисов с инъекцией зависимостей
  const equipmentService = new EquipmentService();
  const rentalService = new RentalService();
  const reservationService = new ReservationService();
  const userService = new UserService();
  const promoCodeService = new PromoCodeService();
  const accessoryService = new AccessoryService();
  const availabilityService = new AvailabilityService();
  const calendarService = new CalendarService();
  const dateService = new DateService();
  const holidayService = new HolidayService();
  const brandSystemService = new BrandSystemService();

  return {
    equipmentService,
    rentalService,
    reservationService,
    userService,
    promoCodeService,
    accessoryService,
    availabilityService,
    calendarService,
    dateService,
    holidayService,
    brandSystemService,
    api,
  };
};

/**
 * Контекст для DI контейнера
 */
export const DIContext = createContext<DIContainer | null>(null);

/**
 * Провайдер для DI контейнера
 */
export interface DIProviderProps {
  children: ReactNode;
  container?: DIContainer;
}

export const DIProvider = ({ children, container }: DIProviderProps) => {
  const defaultContainer = createContainer();
  const containerToUse = container || defaultContainer;

  return React.createElement(
    DIContext.Provider,
    { value: containerToUse },
    children
  );
};

/**
 * Хук для получения DI контейнера
 */
export const useDI = (): DIContainer => {
  const container = useContext(DIContext);
  
  if (!container) {
    throw new Error('useDI must be used within a DIProvider');
  }
  
  return container;
};

/**
 * Хуки для получения конкретных сервисов
 */
export const useEquipmentService = () => useDI().equipmentService;
export const useRentalService = () => useDI().rentalService;
export const useReservationService = () => useDI().reservationService;
export const useUserService = () => useDI().userService;
export const usePromoCodeService = () => useDI().promoCodeService;
export const useAccessoryService = () => useDI().accessoryService;
export const useAvailabilityService = () => useDI().availabilityService;
export const useCalendarService = () => useDI().calendarService;
export const useDateService = () => useDI().dateService;
export const useHolidayService = () => useDI().holidayService;
export const useBrandSystemService = () => useDI().brandSystemService;
export const useApi = () => useDI().api;
