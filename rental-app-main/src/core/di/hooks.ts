/**
 * Хуки для инъекции зависимостей
 * Позволяют компонентам получать зависимости через DI контейнер
 */

import { useDI } from './Container';

/**
 * Хук для получения API клиента
 */
export const useApi = () => {
  const container = useDI();
  return container.api;
};

/**
 * Хук для получения сервиса оборудования
 */
export const useEquipmentService = () => {
  const container = useDI();
  return container.equipmentService;
};

/**
 * Хук для получения сервиса аренд
 */
export const useRentalService = () => {
  const container = useDI();
  return container.rentalService;
};

/**
 * Хук для получения сервиса резерваций
 */
export const useReservationService = () => {
  const container = useDI();
  return container.reservationService;
};

/**
 * Хук для получения сервиса пользователей
 */
export const useUserService = () => {
  const container = useDI();
  return container.userService;
};

/**
 * Хук для получения сервиса промокодов
 */
export const usePromoCodeService = () => {
  const container = useDI();
  return container.promoCodeService;
};

/**
 * Хук для получения сервиса аксессуаров
 */
export const useAccessoryService = () => {
  const container = useDI();
  return container.accessoryService;
};

/**
 * Хук для получения сервиса доступности
 */
export const useAvailabilityService = () => {
  const container = useDI();
  return container.availabilityService;
};

/**
 * Хук для получения сервиса календаря
 */
export const useCalendarService = () => {
  const container = useDI();
  return container.calendarService;
};

/**
 * Хук для получения сервиса дат
 */
export const useDateService = () => {
  const container = useDI();
  return container.dateService;
};

/**
 * Хук для получения сервиса праздников
 */
export const useHolidayService = () => {
  const container = useDI();
  return container.holidayService;
};

/**
 * Хук для получения сервиса систем брендов
 */
export const useBrandSystemService = () => {
  const container = useDI();
  return container.brandSystemService;
};

/**
 * Хук для получения внешних зависимостей
 */
export const useExternalDependencies = () => {
  const container = useDI();
  
  return {
    // API
    api: container.api,
    
    // Встроенные объекты
    URLSearchParams,
    Date,
    localStorage,
    sessionStorage,
    window,
    document,
    navigator,
    location,
    history,
    console,
    
    // Таймеры
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    
    // Fetch API
    fetch,
    AbortController,
    FormData,
    Blob,
    File,
    FileReader,
    URL,
    Headers,
    Request,
    Response,
  };
};
