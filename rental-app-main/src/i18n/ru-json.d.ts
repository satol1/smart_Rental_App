// src/i18n/ru-json.d.ts
// Типизация JSON-словаря для tsc (resolveJsonModule в tsconfig не включён,
// поэтому описываем модуль вручную — структурно повторяет locales/ru.json).

declare module "./locales/ru.json" {
  type Dict = { [key: string]: string };
  const ru: {
    common: Dict;
    nav: Dict;
    auth: Dict & {
      fields: Dict;
      consent: Dict;
    };
    forms: Dict;
    errors: Dict;
  };
  export default ru;
}
