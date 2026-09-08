// src/store/__tests__/filterStore.test.ts
// Тесты filterStore: фильтры каталога и сброс.
import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/store/filterStore';
describe('filterStore', () => {
    beforeEach(() => {
        useFilterStore.getState().reset();
    });
    it('начальные значения фильтров пустые', () => {
        const s = useFilterStore.getState();
        expect(s.type).toBeNull();
        expect(s.brandSystemId).toBeNull();
        expect(s.associationId).toBeNull();
        expect(s.availableOnly).toBe(false);
    });
    it('groupSimilar по умолчанию включён', () => {
        expect(useFilterStore.getState().groupSimilar).toBe(true);
    });
    it('setType обновляет тип', () => {
        useFilterStore.getState().setType('Камеры');
        expect(useFilterStore.getState().type).toBe('Камеры');
    });
    it('setBrandSystemId обновляет брендовую систему', () => {
        useFilterStore.getState().setBrandSystemId(5);
        expect(useFilterStore.getState().brandSystemId).toBe(5);
    });
    it('setAssociationId обновляет ассоциацию', () => {
        useFilterStore.getState().setAssociationId(7);
        expect(useFilterStore.getState().associationId).toBe(7);
    });
    it('setAvailableOnly переключает флаг', () => {
        useFilterStore.getState().setAvailableOnly(true);
        expect(useFilterStore.getState().availableOnly).toBe(true);
    });
    it('setGroupSimilar переключает группировку', () => {
        useFilterStore.getState().setGroupSimilar(false);
        expect(useFilterStore.getState().groupSimilar).toBe(false);
    });
    it('reset возвращает всё к значениям по умолчанию', () => {
        const s = useFilterStore.getState();
        s.setType('X');
        s.setBrandSystemId(1);
        s.setAssociationId(2);
        s.setAvailableOnly(true);
        s.setGroupSimilar(false);
        useFilterStore.getState().reset();
        const after = useFilterStore.getState();
        expect(after.type).toBeNull();
        expect(after.brandSystemId).toBeNull();
        expect(after.associationId).toBeNull();
        expect(after.availableOnly).toBe(false);
        expect(after.groupSimilar).toBe(true);
    });
});
