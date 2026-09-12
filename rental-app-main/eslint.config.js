import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Защита дизайн-системы: цвет и типографика — только через токены
      // (см. Docs/DESIGN_SYSTEM.md). Полный гейт: npm run check:design-tokens.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message: 'Хардкод hex-цвета запрещён — используй семантический токен (класс text-primary / bg-muted или var(--token)).',
        },
        {
          selector: "Literal[value=/\\brgba?\\(/]",
          message: 'Хардкод rgb/rgba запрещён — используй семантический токен или hsl(var(--token) / alpha).',
        },
        {
          selector: "Literal[value=/\\bhsla?\\((?![^)]*var)[^)]*\\d/]",
          message: 'Хардкод hsl без var() запрещён — используй токен: hsl(var(--token)) или hsl(var(--token) / 0.15).',
        },
        {
          selector: "Literal[value=/\\b(?:bg|text|border|ring|fill|stroke|from|to|via|shadow|outline|divide|accent|caret|decoration)-\\[[^\\]]*(?:#[0-9a-fA-F]{3,8}|hsl|rgb|oklch|oklab|color-mix)/]",
          message: 'Произвольный цветовой класс bg-[#…]/text-[hsl(…)] запрещён — используй токенизированный класс из tailwind.config.js.',
        },
        {
          selector: "Literal[value=/\\btext-\\[\\d+(?:\\.\\d+)?(?:px|rem)\\]/]",
          message: 'Размер шрифта мимо шкалы — используй ступени шкалы (text-2xs … text-5xl) или добавь токен в tailwind.config.js.',
        },
      ],
    },
  },
)
