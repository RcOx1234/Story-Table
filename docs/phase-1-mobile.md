# Phase 1: isolated mobile preview

Base: 5099b39. Branch: codex/storytable-mobile-preview. Do not merge into main.

## Reference lock
- Preserve StoryTable's existing dark surfaces, red navigation/accent, typography and desktop hierarchy.
- Refero craft-details: touch targets, overscroll containment, accessible dialogs, visible focus, no zoom restrictions.
- Live Refero research unavailable (NO_SUBSCRIPTION); no external visual redesign.
- Mobile: drawer navigation, compact top bar, full-height dialogs, wrapping actions, pan-enabled maps and genealogy.

## Isolation
- previewMode.ts unconditionally disables Firebase initialization, including with injected VITE_FIREBASE_* values.
- Separate localStorage key; no production cache read or overwrite.
- JSON import disabled in preview. Bundled fictional seed data only on initial empty library.
- Vercel CSP connect-src self blocks Firebase connections independently.
- VERCEL_ENV=production builds fail intentionally. No production configuration/rules were changed.
- This is NOT system 2 or migration. Phase 2 is separate.

## Checks
- npm run build (TypeScript + Vite).
- Production build interlock must reject VERCEL_ENV=production.
- Preview network must make no Firebase calls; local editing/reload must persist independently.
- Review at 360, 430, 768 and desktop widths; drawer, search, forms, world tabs, map pan/zoom, genealogy.

## Limits
Account operations, cloud storage and cloud spelling service are unavailable by design in this offline preview.
Never enable production Firebase on this branch to test mobile functionality.
