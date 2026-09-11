// public/theme-init.js
// Ставим класс dark до загрузки бандла, чтобы тема не мигала.
// Читаем тот же ключ 'theme', что и zustand-persist в themeStore.
// Вынесено из index.html в отдельный файл, чтобы CSP могла жить
// без 'unsafe-inline' в script-src.
(function () {
  try {
    var raw = localStorage.getItem('theme');
    var theme = null;
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        theme = parsed && parsed.state && parsed.state.theme ? parsed.state.theme : null;
      } catch (e) {
        theme = raw; // на случай чистой строки
      }
    }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme !== 'light' && prefersDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    /* no-op */
  }
})();
