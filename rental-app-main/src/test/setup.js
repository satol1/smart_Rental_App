import '@testing-library/jest-dom';
// Инициализация i18n для компонентов, использующих useTranslation
import '@/i18n';
// Заглушки браузерных API, отсутствующих в jsdom (нужны Radix UI)
class ResizeObserverStub {
    observe() { }
    unobserve() { }
    disconnect() {
    }
}
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = ResizeObserverStub;
}
if (typeof globalThis.DOMRectReadOnly === 'undefined') {
    class DOMRectReadOnlyStub {
        x = 0;
        y = 0;
        top = 0;
        left = 0;
        bottom = 0;
        right = 0;
        width = 0;
        height = 0;
        toJSON() { return {}; }
    }
    globalThis.DOMRectReadOnly = DOMRectReadOnlyStub;
}
// Pointer capture API отсутствует в jsdom (нужно для Radix Select)
if (typeof Element !== 'undefined') {
    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
        Element.prototype.setPointerCapture = () => undefined;
    }
    if (!Element.prototype.releasePointerCapture) {
        Element.prototype.releasePointerCapture = () => undefined;
    }
    if (!Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = () => undefined;
    }
}
if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query) => ({
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
