# Negative Split — Shop Theme Builder

A theme builder for an e-commerce storefront. Pick a base colour, an accent, two
fonts, a corner radius and a menu treatment on the left; a running shop
re-themes live on the right. Every combination is a shareable link.

Vite, React, TypeScript, Tailwind CSS v4 and shadcn/ui. No backend.

[![CI](https://github.com/Bensaya/negative-split-theme-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/Bensaya/negative-split-theme-builder/actions/workflows/ci.yml)

**Live demo:** https://negative-split-theme-builder.vercel.app/

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

Requires **Node 20.19+ or 22.12+** (Vite 8).

| Command | |
| --- | --- |
| `npm run dev` | Dev server, on port 5173 exactly |
| `npm run build` | Typecheck and production build |
| `npm test` | Unit and hook tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run lint` | oxlint |

The port is pinned with `strictPort`: the Google Fonts API key is restricted by
HTTP referrer, so a silent move to 5174 would break every catalogue request.

### Google Fonts key — optional

**The app works without one**, falling back to 35 curated families and saying so
in the panel. With a key you get the full catalogue, about 1,950 families.

```bash
cp .env.example .env.local     # then add your key
```

Free from the [Google Cloud Console](https://console.cloud.google.com/): new
project, enable **Web Fonts Developer API**, create an API key. A `VITE_`
variable is compiled into the bundle and is therefore public by design — that is
acceptable for a read-only catalogue with a referrer restriction, and it is not
treated as a secret.

## How it works

Three ideas carry the design. [`DECISIONS.md`](./DECISIONS.md) has the rest,
each with the alternative it beat.

**One typed theme object** ([#1](./DECISIONS.md)). Every setting is a field on
`Theme`, and the option lists are `as const` with the types derived from them, so
adding a swatch widens the type, the URL validator, the Shuffle space and the
sidebar together. The one list that is not derived — Shuffle's grouping of base
colours by how they read — has a test asserting it stays complete.

**Tokens reach the preview through CSS variables on a wrapper, never `:root`**
([#3](./DECISIONS.md)). shadcn declares its tokens inside Tailwind's
`@theme inline`, so `bg-primary` compiles to a single-level `var(--primary)`
resolved on the element itself. Inheritance does the propagation — there is no
"apply the theme" code, the builder's own chrome stays on the default theme, and
two themes can coexist on one page, which is what Save & Compare uses.

**React owns the theme; the URL is a projection of it** ([#8](./DECISIONS.md),
[#9](./DECISIONS.md)). Every edit goes through one `applyTheme()`, the only
writer of the URL, using immediate `replaceState`. The flow is acyclic because
`pushState` and `replaceState` do not fire `popstate`, so a write can never
trigger a read. Parameters are readable and validated per field, so one bad
value defaults that field alone and never the whole link.

## Eight base colours, not five

The brief names five — Neutral, Slate, Gray, Zinc, Stone. All five are here, and
they are Tailwind's own ramps, which at the light steps a storefront is built
from sit about 3 RGB points apart: the control worked and nothing visibly
happened. Sand, Sage and Ice were added so the setting has a range you can
actually see, and muted text is now searched for rather than fixed, because the
tinted ramps fall below AA at the shade the neutrals use.
[`DECISIONS.md` #15, #16](./DECISIONS.md).

## Save & Compare

Save a snapshot of the current theme, keep editing, then open a read-only
Saved/Current toggle that swaps the same storefront between the two. The builder
makes exploration feel risky — once you like something, changing it costs you
the thing you liked — and comparison is what makes it safe.

It reuses what exists: a snapshot is a `Theme`, so it serialises through the
same `encode()` as the shareable URL, and the comparison renders the same
storefront with a second token set. Details and the one-snapshot tradeoff are in
[`DECISIONS.md` #13](./DECISIONS.md).

## Testing

```bash
npm test          # unit and hook tests
npm run test:e2e  # Playwright
```

Unit tests cover the pure modules, where correctness is subtle and invisible:
the WCAG contrast engine, token resolution, URL coding and validation, catalogue
fallback, preview-cache identity, and font-load recovery.

Playwright covers the two journeys that only exist in a browser — the shared
link round-trip, including a link carrying one invalid parameter, and Save &
Compare. Both run in CI **without an API key**, so they exercise the fallback
catalogue rather than a path only the author can reach. Still uncovered:
keyboard navigation in the font picker across the virtualised boundary.

Two defects worth naming, both caught by tests before any UI existed:

- An exhaustive check across all 60 base × theme combinations found `rose-600`
  and `fuchsia-600` at ~4.4:1 — below AA, and close enough that nobody would
  have seen it by eye.
- Checking only whether the menu accent was *visible* left the bag count
  unreadable in 14 of 240 combinations.

### How I used AI

I built this with Claude Code, delegating scaffolding, most of the
implementation, and the repetitive parts of verification.

I owned the decisions, and `DECISIONS.md` records each one with the alternative
rejected: readable URL parameters over an encoded blob, a single typed theme
object, tokens scoped to a wrapper rather than `:root`, and Save & Compare as
the custom feature. Two of those entries are reversals I argued myself out of.

The commit bodies say how each defect surfaced — some from the test suite, some
only from driving the running app. Those browser checks were driven with
Playwright MCP; the two journeys worth protecting are now committed as
Playwright specs and run in CI.

## Credits

Product photography: see [`public/products/CREDITS.md`](./public/products/CREDITS.md).

Palette values are generated from the installed `tailwindcss` package by
`scripts/generate-palette.mjs` — Tailwind's own values, not transcribed.
