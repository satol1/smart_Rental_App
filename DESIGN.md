---
name: "Digital Rental / Цифровой"
description: "A precise working catalog for choosing and renting photographic equipment."
colors:
  background: "hsl(40 20% 97%)"
  foreground: "hsl(210 8% 15%)"
  card: "hsl(0 0% 100%)"
  primary: "hsl(201 71% 38%)"
  primary-hover: "hsl(201 72% 32%)"
  primary-foreground: "hsl(0 0% 100%)"
  secondary: "hsl(40 14% 93%)"
  secondary-foreground: "hsl(210 8% 25%)"
  muted: "hsl(40 12% 94%)"
  muted-foreground: "hsl(210 5% 42%)"
  accent: "hsl(200 29% 93%)"
  accent-foreground: "hsl(201 54% 29%)"
  border: "hsl(40 9% 86%)"
  input: "hsl(40 7% 58%)"
  ring: "hsl(201 71% 38%)"
  success: "hsl(145 22% 31%)"
  success-soft: "hsl(140 19% 93%)"
  warning: "hsl(34 45% 32%)"
  warning-soft: "hsl(38 48% 93%)"
  destructive: "hsl(3 54% 43%)"
  destructive-foreground: "hsl(0 0% 100%)"
  danger-soft: "hsl(6 42% 95%)"
  info-soft: "hsl(200 39% 94%)"
  collection-sky: "hsl(201 46% 85%)"
  collection-mint: "hsl(145 25% 85%)"
  collection-amber: "hsl(36 55% 86%)"
  photo-surface: "hsl(40 20% 96%)"
  pastel-sky-fg: "hsl(201 54% 31%)"
  brand: "hsl(201 71% 38%)"
  dark-background: "hsl(210 8% 9%)"
  dark-foreground: "hsl(40 12% 94%)"
  dark-card: "hsl(210 7% 12%)"
  dark-primary: "hsl(201 62% 61%)"
  dark-primary-hover: "hsl(201 66% 70%)"
  dark-primary-foreground: "hsl(210 12% 10%)"
  dark-secondary: "hsl(210 6% 19%)"
  dark-secondary-foreground: "hsl(40 10% 89%)"
  dark-muted: "hsl(210 6% 16%)"
  dark-muted-foreground: "hsl(40 6% 66%)"
  dark-accent: "hsl(201 18% 21%)"
  dark-accent-foreground: "hsl(201 46% 80%)"
  dark-border: "hsl(210 6% 24%)"
  dark-input: "hsl(210 5% 42%)"
  dark-ring: "hsl(201 62% 61%)"
  dark-success: "hsl(143 28% 70%)"
  dark-success-soft: "hsl(145 14% 18%)"
  dark-warning: "hsl(37 53% 72%)"
  dark-warning-soft: "hsl(35 22% 18%)"
  dark-destructive: "hsl(4 63% 69%)"
  dark-destructive-foreground: "hsl(210 12% 10%)"
  dark-danger-soft: "hsl(5 22% 19%)"
  dark-info-soft: "hsl(201 25% 19%)"
  dark-collection-sky: "hsl(201 32% 25%)"
  dark-collection-mint: "hsl(145 20% 24%)"
  dark-collection-amber: "hsl(35 28% 24%)"
  dark-photo-surface: "hsl(40 20% 96%)"
  dark-pastel-sky-fg: "hsl(201 55% 77%)"
typography:
  headline:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.428571
    letterSpacing: "normal"
  caption:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.666667
    letterSpacing: "normal"
rounded:
  sm: "6px"
  control: "10px"
  surface: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-tonal:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.pastel-sky-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  catalog-filter-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "8px"
    padding: "8px 12px"
    height: "44px"
  equipment-card-selected:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.foreground}"
    rounded: "12px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  status-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.sm}"
    typography: "{typography.caption}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
    padding: "24px"
---
# Design System: Digital Rental

## Overview

**Creative North Star: "The working equipment catalog"**

The interface supports decisions about equipment, dates and cost. Warm paper surrounds white working surfaces; ink typography establishes hierarchy and the supplied blue mark identifies the service. Photography comes from real inventory. The same controls serve customers, managers and administrators.

This is the implemented system for `specs/002-rental-design-system/`. Runtime sources are `rental-app-main/src/index.css`, `rental-app-main/src/styles/catalog.css`, `rental-app-main/tailwind.config.js`, `rental-app-main/src/components/ui/` and `rental-app-main/src/lib/motion.ts`. Extracted tokens document those sources; update this record when the system changes.

**Key Characteristics:**

- Warm neutral surfaces and clear ink type.
- Blue actions and selection, colored collection surfaces, and semantic sage, sand and restrained red states.
- Native Cyrillic typography, compact data and generous separation between tasks.
- Restrained feedback, visible focus and complete dark theme roles.

## Colors

The primary blue is reserved for actions, links, selection and the existing brand. Brand blue remains stable across themes; the interactive primary lightens in dark mode and uses a dark foreground to preserve contrast.

Sage communicates success or availability; sand communicates conditions requiring attention; red communicates errors, overdue states and destructive actions. Role badges are neutral: administrative permission is not an error state. Supporting surfaces always use their paired foreground.

Collection cards have separate sky, mint and amber surface tokens (`--collection-sky`, `--collection-mint`, `--collection-amber`), with deeper dark-theme overrides. They distinguish editorial collections; they do not assert availability or order status. Collection text uses the corresponding pastel foreground. In dark mode, photographic collages sit on `--photo-surface`, a light neutral photographic backing inherited unchanged from the light theme. The three stronger collection fills do not replace semantic status surfaces elsewhere.

Selected catalog filter chips use solid primary blue and primary foreground. A selected equipment card keeps its photograph intact, adds a primary boundary/ring and tints its content area with `--info-soft`. The date panel uses primary date text, a thin tinted boundary and pale information controls. The reservation footer repeats the information accent on its count and bag icon while retaining a solid card surface.

Warm paper is the page background, white is the working surface, and neutral ink is the text. Dark mode uses charcoal surfaces with warm light text. The frontmatter contains exact light and dark color values. CSS variables are HSL channels so alpha utilities remain supported.

Legacy gray/slate classes resolve through the neutral ramp; blue/sky resolve through the brand ramp; green/emerald and amber/orange use sage and sand. Dark colored text has separate foreground adapters because solid colored button fills must remain readable with white text. These adapters preserve old screens during migration; new components use semantic tokens directly.

Text/surface pairings target at least 4.5:1 in both themes. Input boundaries are stronger than decorative card borders. Selection and status colors are accompanied by text, icons or accessible selected-state attributes; verification results belong in the review report.

## Typography

Onest is self-hosted as variable Latin and Cyrillic WOFF2 subsets, with a single `--font-sans` entry point. `font-display: swap` makes content available while fonts load. The font files and SIL Open Font License are in `rental-app-main/public/fonts/`; no font service is contacted at runtime.

Headings use moderate tracking and balanced wrapping. The home heading uses 30px below 640px, 36px from 640px and 48px from 1024px, with 1.15 line height. The calendar page shares this size scale. Component titles use 18–20px, body uses 16px and dense controls use 14px. Table headers and badges commonly use 12px. Ordinary form inputs use 16px on mobile and 14px on desktop; compact native date inputs use 12px below 640px and 14px above it. Long explanatory paragraphs should remain near 65–75 characters per line.

Money, dates and tables use tabular numerals. Numbers are formatted by existing locale-aware helpers; the redesign never changes currency or rental calculations.

## Layout

The shell uses an 80px header, a 1280px maximum content container, and horizontal gutters of 16/24/32px. Reading pages use narrower containers. Interfaces flow to a single column on narrow screens; tables scroll inside their own container. The main element provides a skip-link destination.

The spacing rhythm uses 4, 8, 16, 24 and 32px. Related fields stay close; separate tasks receive more space. Default buttons, inputs and selects are 44px tall. Small explicit toolbar controls are 36px; surrounding layout must keep targets distinct. Checkbox and switch targets extend invisibly around their visible geometry.

The compact date panel shows flat endpoints and the existing store's rental-day count. Opening it reveals one month below 640px and two at wider sizes. Resizing preserves the viewed month and selected range. Month navigation and selected-day labels are in Russian. Existing range callbacks, minimum-range setting, holiday disabling and calculator synchronization remain in place.

Catalog search and every filter, including equipment types and brands, remain visible without an expansion step. Filter rows precede collection cards. The collection rail uses real nonempty associations from `useAssociations`, with their names, equipment IDs and actual inventory photographs. Selecting a collection filters the catalog by that association; it does not create a kit or claim bundled pricing.

The date strip is portalled beneath the 80px header when the main date panel leaves view. The selection footer appears after an item is selected and is portalled into `document.body`, fixed to the viewport bottom. It retains count, dates, reset and checkout actions, includes safe-area padding and sits outside page animation transforms. Catalog content has bottom padding for it. Printing the rental receipt retains its dedicated paper layout and colors, independently of theme.

## Elevation & Depth

Cards use one fine boundary without a broad shadow. Floating menus and dialogs receive elevation because they sit above a page. The reusable shadows are `--shadow-sm`, `--shadow-popover` and `--shadow-dialog`; their exact values and roles are recorded in the sidecar. There are no decorative gradients or glass surfaces.

## Shapes

Fields and buttons share 10px corners. Cards, dialogs and menu surfaces share 14px corners. Small status labels use 6px corners. Circular geometry is limited to the brand, avatars, switch tracks and genuinely circular controls. Table rows use straight separators. Heavy colored side rails do not carry hierarchy.

## Components

Buttons distinguish primary, outline, secondary, tonal, ghost, link and filter states. Tonal buttons use `info-soft` with `pastel-sky-fg`; hover and press use primary at 15% and 20% opacity. Primary has a darker hover in light mode; ordinary buttons do not scale on press. Catalog filter chips use their solid-blue selected treatment, while the generic `filter` button variant retains its softer accent state. Disabled buttons reduce opacity and ignore pointer events. All focusable controls expose a ring. Icons share the Lucide stroke vocabulary and normal control icons are 16px.

Fields use a white or charcoal card surface and an explicit boundary. Focus changes the boundary and adds a subtle ring; invalid fields use destructive tokens. Placeholders retain readable contrast. Selects and popovers preserve Radix keyboard navigation and anchoring. Dialogs use a responsive inset, constrained viewport height, scrollable content, a 44px close target and separate footer actions.

Badges retain status text and use paired semantic colors. Active orders use information tones; fulfilled orders use success; overdue orders use danger; VIP uses sand. Role badges stay neutral. Table rows have 12px vertical padding and 16px horizontal padding, muted 44px headers, selected states and local horizontal overflow.

Navigation marks the current route with a neutral filled surface. Header links become a menu below the wide desktop layout. Authentication reuses its form without nesting a second card inside a modal. Cookie information is a compact floating notice; network status appears when connectivity is lost.

The logo is clean SVG geometry from the supplied mark. Its outline remains stationary. Hover settles the inner lens to scale 0.975; pressing scales it to 0.93 and turns the black shutter group −2.5°. Release restores the hover or resting state using the 150/200ms Framer Motion tokens; leaving the mark restores its resting geometry. There is no perpetual motion, and reduced-motion preference disables the feedback. The enclosing link keeps home navigation and filter-reset behavior.

Motion durations are 150/200/300ms, with `cubic-bezier(0.23, 1, 0.32, 1)`. Routine controls transition colors; popovers fade; dialogs fade at the base duration; routes use a short fade. Reduced-motion preferences remove positional movement and make CSS transitions effectively immediate. Selection, caret and scrollbar colors use the same palette.

## Do's and Don'ts

- Do use semantic tokens and existing UI primitives for new screens.
- Do preserve real equipment photographs, dates, prices and role permissions.
- Do check keyboard access, both themes, narrow layouts and reduced motion.
- Do keep cards flat, controls consistent and financial values aligned.
- Do keep every filter visible and source collection names, contents and photographs from real associations and inventory.
- Do preserve the viewport-anchored selection footer and adaptive calendar behavior.
- Don't assign a decorative color to each filter group or user role.
- Don't add gradients, glass, heavy colored rails or scaling on ordinary buttons.
- Don't replace Cyrillic typography with an unsupported display font.
- Don't invent commercial claims, availability, equipment bundles or rental terms.
