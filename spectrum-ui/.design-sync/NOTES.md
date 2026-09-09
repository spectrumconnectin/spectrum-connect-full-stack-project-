# design-sync notes — @spectrum-connect/ui

- **This package is not the product app.** It is a presentational kit extracted
  from `spectrum-nextjs` so the app's design language can be designed with.
  Components here are deliberately free of `@/lib/api`, `next/link` and
  `next/navigation`; 16 of the app's 34 components import the API client and
  cannot be lifted without stubbing.
- **Tailwind must scan `.design-sync/previews/`.** Preview files compose the
  components with layout and tint classes that appear nowhere in `src/`, and
  Tailwind emits only what it sees. Missing this renders cards un-gridded and
  untinted while the components themselves look fine — a confusing failure.
- **Fonts and icons are shipped locally, never from a CDN.** The headless render
  harness has no network: a remote `@import` for Font Awesome made capture time
  out at 20s, and Inter silently fell back. `assets/` holds the woff2s and a
  rewritten `fa.min.css`; `build-css.mjs` stitches them into `dist/styles.css`.
  Do not "simplify" these back to CDN imports.
- Class vocabulary is the app's own (`bg-cobalt`, `sc-fixed-size`,
  `scroll-fade-x`, `no-scrollbar`), so a generated design pastes into the app.

## Re-sync risks — what can silently go stale

- **Font Awesome is pinned to 6.6.0 and vendored** in `assets/fa.min.css` +
  `assets/fonts/`, rewritten to local `url(./fonts/…)`. If the app's root layout
  moves to a different FA release, this copy does not follow — re-download and
  re-run the rewrite in the same step that changed the app.
- **Inter comes from `@fontsource/inter`** (a devDependency), copied at build
  time by `build-css.mjs`. A major bump there changes the woff2 filenames the
  generated `@font-face` block points at.
- **The kit is a port, not a re-export.** `Button`, `Card`, `StatusPill`,
  `Toggle`, `FilterRow`, `Field`, `Stat`, `Money` and friends were written here
  from the app's patterns; only `Avatar` is copied verbatim. If the app's visual
  language changes, nothing propagates automatically — the two must be updated
  together or the kit starts lying about the product.
- **`StatusPill` duplicates the status label/colour maps** that live in
  `spectrum-nextjs/app/(client)/client/projects/page.tsx`. Adding a status in the
  app means adding it here too.
- **Only verified at the widths the harness captures.** The mobile behaviours the
  classes encode (`scroll-fade-x` fading, the 44px rule, rows wrapping) are
  correct in the source but were not captured at a phone viewport.
- **The structural layer duplicates the app's shells.** `AppShell`, `AppHeader`
  and `BottomNav` mirror `spectrum-nextjs/app/(creator)/layout.tsx` and its
  client twin — the `max-w-7xl` container, `pb-24 md:pb-8` bottom clearance, and
  the translucent `.sc-bottom-nav`. Change the app's layout and these drift.
- **`AppShell`/`AppHeader` carry `cardMode: "column"`** because full-width
  shells are cropped by the product's multi-column grid card. Keep the override
  if new full-width structures are added.
- **Not yet uploaded.** The first sync stopped before `create_project` because
  DesignSync had no design-system authorization in that session. There is no
  `projectId` in config and no remote anchor, so the next run is a full first
  sync: everything re-verifies and re-uploads. That is the expected safe state.

## Known render warns

- None. The final validate ran clean: 25/25 previews render, no blank, thin, or
  identical-variant warnings, and no `[FONT_MISSING]`. The two `[GRID_OVERFLOW]`
  warns on `AppShell`/`AppHeader` were resolved with `cardMode: "column"`.
