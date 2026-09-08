import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Тесты для DI контейнера frontend
 */
import { render, screen } from '@testing-library/react';
import { DIProvider, useDI, useEquipmentService, createContainer } from '../Container';
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
                return _jsx("div", { "data-testid": "container", children: container ? 'Container provided' : 'No container' });
            };
            render(_jsx(DIProvider, { children: _jsx(TestComponent, {}) }));
            expect(screen.getByTestId('container')).toHaveTextContent('Container provided');
        });
        it('should use custom container when provided', () => {
            const customContainer = {
                equipmentService: {},
                rentalService: {},
                reservationService: {},
                userService: {},
                promoCodeService: {},
                accessoryService: {},
                availabilityService: {},
                calendarService: {},
                dateService: {},
                holidayService: {},
                brandSystemService: {},
                api: {},
            };
            const TestComponent = () => {
                const container = useDI();
                return _jsx("div", { "data-testid": "custom-container", children: container === customContainer ? 'Custom container' : 'Default container' });
            };
            render(_jsx(DIProvider, { container: customContainer, children: _jsx(TestComponent, {}) }));
            expect(screen.getByTestId('custom-container')).toHaveTextContent('Custom container');
        });
    });
    describe('useDI hook', () => {
        it('should throw error when used outside DIProvider', () => {
            const TestComponent = () => {
                try {
                    useDI();
                    return _jsx("div", { "data-testid": "error", children: "No error" });
                }
                catch (error) {
                    return _jsx("div", { "data-testid": "error", children: "Error caught" });
                }
            };
            render(_jsx(TestComponent, {}));
            expect(screen.getByTestId('error')).toHaveTextContent('Error caught');
        });
        it('should return container when used inside DIProvider', () => {
            const TestComponent = () => {
                const container = useDI();
                return _jsx("div", { "data-testid": "container", children: container ? 'Container available' : 'No container' });
            };
            render(_jsx(DIProvider, { children: _jsx(TestComponent, {}) }));
            expect(screen.getByTestId('container')).toHaveTextContent('Container available');
        });
    });
    describe('Service hooks', () => {
        it('should provide equipment service', () => {
            const TestComponent = () => {
                const equipmentService = useEquipmentService();
                return _jsx("div", { "data-testid": "service", children: equipmentService ? 'Service available' : 'No service' });
            };
            render(_jsx(DIProvider, { children: _jsx(TestComponent, {}) }));
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
