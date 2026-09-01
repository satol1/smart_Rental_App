/**
 * Провайдеры для внешних зависимостей
 * Централизованное управление внешними зависимостями
 */

import { api } from '@/lib/api';

/**
 * Провайдер для API клиента
 */
export const apiProvider = () => api;

/**
 * Провайдер для URLSearchParams
 */
export const urlSearchParamsProvider = () => URLSearchParams;

/**
 * Провайдер для Date объектов
 */
export const dateProvider = () => Date;

/**
 * Провайдер для localStorage
 */
export const localStorageProvider = () => localStorage;

/**
 * Провайдер для sessionStorage
 */
export const sessionStorageProvider = () => sessionStorage;

/**
 * Провайдер для window объекта
 */
export const windowProvider = () => window;

/**
 * Провайдер для document объекта
 */
export const documentProvider = () => document;

/**
 * Провайдер для navigator объекта
 */
export const navigatorProvider = () => navigator;

/**
 * Провайдер для location объекта
 */
export const locationProvider = () => location;

/**
 * Провайдер для history объекта
 */
export const historyProvider = () => history;

/**
 * Провайдер для console объекта
 */
export const consoleProvider = () => console;

/**
 * Провайдер для setTimeout
 */
export const setTimeoutProvider = () => setTimeout;

/**
 * Провайдер для setInterval
 */
export const setIntervalProvider = () => setInterval;

/**
 * Провайдер для clearTimeout
 */
export const clearTimeoutProvider = () => clearTimeout;

/**
 * Провайдер для clearInterval
 */
export const clearIntervalProvider = () => clearInterval;

/**
 * Провайдер для fetch API
 */
export const fetchProvider = () => fetch;

/**
 * Провайдер для AbortController
 */
export const abortControllerProvider = () => AbortController;

/**
 * Провайдер для FormData
 */
export const formDataProvider = () => FormData;

/**
 * Провайдер для Blob
 */
export const blobProvider = () => Blob;

/**
 * Провайдер для File
 */
export const fileProvider = () => File;

/**
 * Провайдер для FileReader
 */
export const fileReaderProvider = () => FileReader;

/**
 * Провайдер для URL
 */
export const urlProvider = () => URL;

/**
 * Провайдер для Headers
 */
export const headersProvider = () => Headers;

/**
 * Провайдер для Request
 */
export const requestProvider = () => Request;

/**
 * Провайдер для Response
 */
export const responseProvider = () => Response;
