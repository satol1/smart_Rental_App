import plugin from 'tailwindcss/plugin'

const color = (name) => `hsl(var(--${name}) / <alpha-value>)`
const scale = (name) => Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [step, color(`${name}-${step}`)])
)
const pair = (name) => ({ DEFAULT: color(name), foreground: color(`${name}-foreground`) })

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,css}'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-sans)'] },
      borderRadius: {
        sm: '0.375rem',
        md: 'var(--radius-control)',
        lg: 'var(--radius)',
        xl: 'var(--radius)',
        '2xl': 'var(--radius)',
      },
      boxShadow: {
        xs: 'var(--shadow-sm)',
        sm: 'var(--shadow-sm)',
        popover: 'var(--shadow-popover)',
        dialog: 'var(--shadow-dialog)',
      },
      transitionDuration: {
        DEFAULT: 'var(--duration-fast)',
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
        150: 'var(--duration-fast)',
        200: 'var(--duration-base)',
        300: 'var(--duration-slow)',
      },
      transitionTimingFunction: { DEFAULT: 'var(--ease-out)', out: 'var(--ease-out)' },
      colors: {
        background: color('background'), foreground: color('foreground'),
        card: pair('card'), popover: pair('popover'),
        primary: { ...pair('primary'), hover: color('primary-hover') },
        secondary: pair('secondary'), muted: pair('muted'), accent: pair('accent'),
        destructive: pair('destructive'),
        success: { DEFAULT: color('success'), soft: color('success-soft') },
        warning: { DEFAULT: color('warning'), soft: color('warning-soft') },
        'danger-soft': color('danger-soft'), 'info-soft': color('info-soft'),
        collection: { sky: color('collection-sky'), mint: color('collection-mint'), amber: color('collection-amber') },
        'photo-surface': color('photo-surface'),
        border: color('border'), input: color('input'), ring: color('ring'), overlay: color('overlay'),
        brand: { DEFAULT: color('brand'), ink: color('brand-ink'), paper: color('brand-paper') },
        gray: scale('neutral'), slate: scale('neutral'), zinc: scale('neutral'),
        sky: scale('blue'), blue: scale('blue'), cyan: scale('blue'), indigo: scale('blue'),
        green: scale('sage'), emerald: scale('sage'), teal: scale('sage'),
        amber: scale('sand'), orange: scale('sand'), yellow: scale('sand'),
        red: scale('red'), rose: scale('red'),
        purple: scale('neutral'), violet: scale('neutral'), pink: scale('neutral'),
        pastel: Object.fromEntries(['sky', 'mint', 'amber', 'coral', 'lavender'].flatMap((name) => [
          [name, color(`pastel-${name}`)], [`${name}-fg`, color(`pastel-${name}-fg`)],
        ])),
        chart: Object.fromEntries([1, 2, 3, 4, 5].map((index) => [index, color(`chart-${index}`)])),
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    plugin(({ addUtilities }) => {
      // Old colored text needs a separate dark value from solid button fills.
      // Keeping these in utilities preserves intentional consumer overrides.
      addUtilities(Object.fromEntries(['gray', 'slate', 'zinc', 'purple', 'violet', 'pink'].map((family) => [
        `.text-${family}-400`, { color: 'hsl(var(--muted-foreground) / var(--tw-text-opacity, 1))' },
      ])))
      const families = {
        blue: 'pastel-sky-fg', sky: 'pastel-sky-fg', cyan: 'pastel-sky-fg', indigo: 'pastel-sky-fg',
        green: 'success', emerald: 'success', teal: 'success',
        amber: 'warning', orange: 'warning', yellow: 'warning',
        red: 'destructive', rose: 'destructive',
      }
      addUtilities(Object.fromEntries(Object.entries(families).flatMap(([family, token]) =>
        [400, 500, 600, 700, 800, 900, 950].map((step) => [
          `.dark .text-${family}-${step}`, { color: `hsl(var(--${token}) / var(--tw-text-opacity, 1))` },
        ])
      )))
    }),
  ],
}
