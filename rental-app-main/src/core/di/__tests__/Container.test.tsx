/**
 * Тесты для DI контейнера frontend
 */

import { render, screen } from '@testing-library/react';
import { DIProvider, useDI, useEquipmentService, createContainer, type DIContainer } from '../Container';
import { EquipmentService } from '../../services/EquipmentService';
import { RentalService } from '../../services/RentalService';
import { ReservationService } from '../../services/ReservationService';
import { UserService } from '../../services/UserService';
import { PromoCodeService } from '../../services/PromoCodeService';
import { AccessoryService } from '../../services/AccessoryService';
import { AvailabilityService } from '../../services/AvailabilityService';
import { CalendarService } from '../../services/CalendarService';
import { DateService } from '../../services/DateService';
import { HolidayService } from '../../services/HolidayService';
import { BrandSystemService } from '../../services/BrandSystemService';

import { describe, it, expect, vi } from 'vitest';

// Мок для API
vi.mock('../../api/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('DI Container', () => {
  describe('DIProvider', () => {
    it('should provide DI container to children', () => {
      const TestComponent = () => {
        const container = useDI();
        return <div data-testid="container">{container ? 'Container provided' : 'No container'}</div>;
      };

      render(
        <DIProvider>
          <TestComponent />
        </DIProvider>
      );

      expect(screen.getByTestId('container')).toHaveTextContent('Container provided');
    });

    it('should use custom container when provided', () => {
      // Пустые заглушки сервисов: контейнер нужен только для проверки подстановки
      const customContainer: DIContainer = {
        equipmentService: {} as EquipmentService,
        rentalService: {} as RentalService,
        reservationService: {} as ReservationService,
        userService: {} as UserService,
        promoCodeService: {} as PromoCodeService,
        accessoryService: {} as AccessoryService,
        availabilityService: {} as AvailabilityService,
        calendarService: {} as CalendarService,
        dateService: {} as DateService,
        holidayService: {} as HolidayService,
        brandSystemService: {} as BrandSystemService,
        api: {} as DIContainer['api'],
      };

      const TestComponent = () => {
        const container = useDI();
        return <div data-testid="custom-container">{container === customContainer ? 'Custom container' : 'Default container'}</div>;
      };

      render(
        <DIProvider container={customContainer}>
          <TestComponent />
        </DIProvider>
      );

      expect(screen.getByTestId('custom-container')).toHaveTextContent('Custom container');
    });
  });

  describe('useDI hook', () => {
    it('should throw error when used outside DIProvider', () => {
      const TestComponent = () => {
        try {
          useDI();
          return <div data-testid="error">No error</div>;
        } catch {
          return <div data-testid="error">Error caught</div>;
        }
      };

      render(<TestComponent />);

      expect(screen.getByTestId('error')).toHaveTextContent('Error caught');
    });

    it('should return container when used inside DIProvider', () => {
      const TestComponent = () => {
        const container = useDI();
        return <div data-testid="container">{container ? 'Container available' : 'No container'}</div>;
      };

      render(
        <DIProvider>
          <TestComponent />
        </DIProvider>
      );

      expect(screen.getByTestId('container')).toHaveTextContent('Container available');
    });
  });

  describe('Service hooks', () => {
    it('should provide equipment service', () => {
      const TestComponent = () => {
        const equipmentService = useEquipmentService();
        return <div data-testid="service">{equipmentService ? 'Service available' : 'No service'}</div>;
      };

      render(
        <DIProvider>
          <TestComponent />
        </DIProvider>
      );

      expect(screen.getByTestId('service')).toHaveTextContent('Service available');
    });
  });

  describe('Container creation', () => {
    it('should create container with all services', () => {
      const container = createContainer();

      expect(container.equipmentService).toBeDefined();
      expect(container.rentalService).toBeDefined();
      expect(container.reservationService).toBeDefined();
      expect(container.userService).toBeDefined();
      expect(container.promoCodeService).toBeDefined();
      expect(container.accessoryService).toBeDefined();
      expect(container.availabilityService).toBeDefined();
      expect(container.calendarService).toBeDefined();
      expect(container.dateService).toBeDefined();
      expect(container.holidayService).toBeDefined();
      expect(container.brandSystemService).toBeDefined();
      expect(container.api).toBeDefined();
    });
  });
});
