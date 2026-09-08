import '@testing-library/jest-dom';
// Инициализация i18n для компонентов, использующих useTranslation
import '@/i18n';

// Заглушки браузерных API, отсутствующих в jsdom (нужны Radix UI)
class ResizeObserverStub {
    observe() { /* noop */ }
    unobserve() { /* noop */ }
    disconnect() { /* noop */
    }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof globalThis.DOMRectReadOnly === 'undefined') {
    class DOMRectReadOnlyStub {
        x = 0; y = 0; top = 0; left = 0; bottom = 0; right = 0;
        width = 0; height = 0;
        toJSON() { return {}; }
    }
    globalThis.DOMRectReadOnly = DOMRectReadOnlyStub as unknown as typeof DOMRectReadOnly;
}

// Pointer capture API отсутствует в jsdom (нужно для Radix Select)
if (typeof Element !== 'undefined') {
    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = () => false as never;
    }
    if (!Element.prototype.setPointerCapture) {
        Element.prototype.setPointerCapture = () => undefined as never;
    }
    if (!Element.prototype.releasePointerCapture) {
        Element.prototype.releasePointerCapture = () => undefined as never;
    }
    if (!Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = () => undefined as never;
    }
    // jsdom не реализует scrollTo с опциями (ScrollToTop в App) — убираем
    // «not implemented»-предупреждение в каждом тесте
    window.scrollTo = (() => undefined) as never;
}

// PointerEvent отсутствует в jsdom: framer-motion диспатчит его при
// клавиатурном нажатии (Enter) на элементы с whileTap — подменяем MouseEvent'ом.
if (typeof globalThis.PointerEvent === 'undefined') {
    class PointerEventStub extends MouseEvent {
        pointerId = 0;
        pointerType = '';
        isPrimary = false;
        constructor(type: string, params: PointerEventInit = {}) {
            super(type, params);
            this.isPrimary = params.isPrimary ?? false;
        }
    }
    globalThis.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => { },
            removeListener: () => { },
            addEventListener: () => { },
            removeEventListener: () => { },
            dispatchEvent: () => false,
        }),
    });
}
