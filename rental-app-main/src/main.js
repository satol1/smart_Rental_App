import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
// 1. СНАЧАЛА импортируем стили библиотеки
import 'react-day-picker/dist/style.css';
// 2. ПОТОМ импортируем наши собственные стили для их переопределения
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import { initThemeSystemListener } from "./store/themeStore";
// i18n: инициализация словаря (fallback 'ru') до рендера приложения
import "./i18n";
// Тема: применяем сохранённое значение и слушаем системную тему ('system' режим).
// Класс dark на <html> уже мог поставить inline-скрипт в index.html —
// здесь только синхронизируем store и подписку на matchMedia.
initThemeSystemListener();
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsxs(QueryClientProvider, { client: queryClient, children: [_jsx(ErrorBoundary, { children: _jsxs(BrowserRouter, { children: [_jsx(App, {}), _jsx(NetworkStatus, {})] }) }), _jsx(ReactQueryDevtools, { initialIsOpen: false })] }) }));
