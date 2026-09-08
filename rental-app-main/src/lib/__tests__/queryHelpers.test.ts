// src/lib/__tests__/queryHelpers.test.ts
// Тесты handleQueryError и getApiErrorMessage.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import {
    handleQueryError,
    getApiErrorMessage,
    isApiErrorLike,
} from '@/lib/queryHelpers';

vi.mock('sonner', () => ({
    toast: { error: vi.fn() },
}));

const toastError = vi.mocked(toast.error);

describe('handleQueryError', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('показывает сообщение Error', () => {
        handleQueryError(new Error('Сервер недоступен'));
        expect(toastError).toHaveBeenCalledWith('Сервер недоступен');
    });

    it('показывает строку как есть', () => {
        handleQueryError('Просто строка ошибки');
        expect(toastError).toHaveBeenCalledWith('Просто строка ошибки');
    });

    it('для неизвестного формата показывает стандартное сообщение', () => {
        handleQueryError({ weird: true });
        expect(toastError).toHaveBeenCalledWith('Неизвестная ошибка запроса');
    });

    it('логирует ошибку в консоль', () => {
        const logSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        handleQueryError(new Error('x'));
        expect(logSpy).toHaveBeenCalled();
    });
});

describe('isApiErrorLike', () => {
    it('распознаёт axios-подобную ошибку', () => {
        const err = { response: { status: 409, data: {} } };
        expect(isApiErrorLike(err)).toBe(true);
    });

    it('отклоняет Error без response', () => {
        expect(isApiErrorLike(new Error('nope'))).toBe(false);
    });

    it('отклоняет null и примитивы', () => {
        expect(isApiErrorLike(null)).toBe(false);
        expect(isApiErrorLike('string')).toBe(false);
        expect(isApiErrorLike(42)).toBe(false);
    });
});

describe('getApiErrorMessage', () => {
    it('возвращает detail-строку', () => {
        const err = { response: { data: { detail: 'Рейс не найден' } } };
        expect(getApiErrorMessage(err, 'fallback')).toBe('Рейс не найден');
    });

    it('склеивает массив ошибок валидации', () => {
        const err = {
            response: {
                data: {
                    detail: [
                        { msg: 'поле email обязательно', loc: ['body', 'email'] },
                        { msg: 'некорректный формат', loc: ['body', 'phone'] },
                    ],
                },
            },
        };
        expect(getApiErrorMessage(err, 'fallback')).toBe(
            'поле email обязательно, некорректный формат',
        );
    });

    it('возвращает message из объектного detail', () => {
        const err = {
            response: {
                data: { detail: { message: 'Конфликт дат', error_type: 'DATE_IS_HOLIDAY' } },
            },
        };
        expect(getApiErrorMessage(err, 'fallback')).toBe('Конфликт дат');
    });

    it('fallback при пустом массиве detail', () => {
        const err = { response: { data: { detail: [] } } };
        expect(getApiErrorMessage(err, 'fallback')).toBe('fallback');
    });

    it('fallback для не-ApiError', () => {
        expect(getApiErrorMessage(new Error('nope'), 'fallback')).toBe('fallback');
        expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
    });

    it('fallback если detail отсутствует', () => {
        const err = { response: { status: 500, data: {} } };
        expect(getApiErrorMessage(err, 'fallback')).toBe('fallback');
    });

    it('fallback если detail — пустая строка', () => {
        const err = { response: { data: { detail: '' } } };
        expect(getApiErrorMessage(err, 'fallback')).toBe('fallback');
    });
});
