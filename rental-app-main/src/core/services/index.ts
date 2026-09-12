// src/core/services/index.ts

// Экспорт всех сервисов
export { ReservationService } from './ReservationService';
export { EquipmentService } from './EquipmentService';
export { 
  getCookieConsent, 
  hasCookieConsent, 
  setCookieConsent, 
  shouldShowCookieBanner
} from './cookieConsentManager';
export { AvailabilityService } from './AvailabilityService';
export { UserService } from './UserService';
export { AccessoryService } from './AccessoryService';
export { CalendarService } from './CalendarService';
export { DateService } from './DateService';
export { BrandSystemService } from './BrandSystemService';
export { RentalService } from './RentalService';
export { AuthService } from './AuthService';

// Экспорт типов
export type {
    ReservationCreateInput,
    ReservationUpdateInput,
    PriceDetails
} from './ReservationService';

export type {
    EquipmentListResponse,
    EquipmentFilterParams
} from './EquipmentService';

export type {
    UserCreateInput,
    UserUpdateInput,
    UserFilterOptions,
    UserValidationResult
} from './UserService';

export type {
    AccessoryCreateInput,
    AccessoryUpdateInput,
    AccessoryFilterOptions,
    AccessoryValidationResult
} from './AccessoryService';


export type { CalendarGridData } from './CalendarService';

export type {
    DateRange,
    DateRangeValidationResult
} from './DateService';

export type {
    AvailabilityStatusParams,
    DailyStatusParams,
    ConflictCheckParams
} from './AvailabilityService';

export type {
    AdminRentalsParams,
    AdminRentalUpdateData,
    ConvertReservationPayload,
    ReturnRentalPayload,
    UpdateRentalPayload
} from './RentalService';

export type {
    LoginResponse,
    RegisterResponse,
    AuthError
} from './AuthService';