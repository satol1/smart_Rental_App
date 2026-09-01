// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import App from "./app/App";

// 1. СНАЧАЛА импортируем стили библиотеки
import 'react-day-picker/dist/style.css';

// 2. ПОТОМ импортируем наши собственные стили для их переопределения
import "./index.css";

import {QueryClientProvider} from "@tanstack/react-query";
import {queryClient} from "./lib/queryClient";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <BrowserRouter>
                    <App/>
                    <NetworkStatus/>
                </BrowserRouter>
            </ErrorBoundary>
            <ReactQueryDevtools initialIsOpen={false}/>
        </QueryClientProvider>
    </React.StrictMode>
);