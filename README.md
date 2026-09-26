# Negative Split — Shop Theme Builder

A theme builder for an e-commerce storefront. Pick a base colour, an accent, two
fonts, a corner radius and a menu treatment on the left; a running shop
re-themes live on the right. Every combination is a shareable link.

Vite, React, TypeScript, Tailwind CSS v4 and shadcn/ui. No backend.

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
| `npm run lint` | oxlint |

The port is pinned with `strictPort`, because the Google Fonts API key is
restricted by HTTP referrer to `localhost:5173` and a silent move to 5174 would
make every catalogue request fail.

### Google Fonts key — optional

**The app works without one.** It falls back to 35 curated families and says so
in the panel. With a key you get the full catalogue, about 1,950 families.

```bash
cp .env.example .env.local     # then add your key
```

Free from the [Google Cloud Console](https://console.cloud.google.com/): new
project, enable **Web Fonts Developer API**, create an API key. No billing
account needed.

A `VITE_`-prefixed variable is compiled into the bundle and is therefore
**public**. That is acceptable here — it is a read-only public catalogue and the
key can be referrer-restricted — but it is not a secret and is not treated as
one.

## How it works

Three ideas carry most of the design. [`DECISIONS.md`](./DECISIONS.md) has the
rest, with the alternative each one beat.

**One typed theme object.** Every setting is a field on `Theme`, and the option
lists are `as const` with the types derived from them. Adding a swatch widens
the type, the URL validator, the Shuffle space and the sidebar together.

**The theme reaches the preview through CSS variables on a wrapper, never
`:root`.** shadcn declares its tokens inside Tailwind's `@theme inline`, so
`bg-primary` compiles to `background-color: var(--primary)` — a single-level
`var()` resolved on the element carrying the class. Ordinary inheritance does
the propagation, which means there is no "apply the theme" code at all, and the
builder's own chrome stays on the default theme no matter what you pick. It is
also why two themes can coexist on one page, which is what Save & Compare uses.

**React owns the theme; the URL is a projection of it.** Every edit goes through
one `applyTheme()`, which is the only writer of the URL.

## The shareable URL

```
/?v=1&base=slate&theme=rose&radius=large&menu=inverted&accent=bold
 &heading=Playfair%20Display&body=Inter
```

Readable parameters rather than an encoded blob: you can see what a link does
and hand-edit one field to test a case. It is also **shorter** — base64 of the
equivalent JSON measures 135 characters against 101, because base64 inflates by
a third.

**Writes are immediate `replaceState`.** No debounce: all seven controls are
discrete selections, so there is nothing to coalesce and a debounce would only
add stale writes. No `pushState` either, so theme edits create no history
entries — what Back does is whatever else is on the stack, and in-page anchors
can still add entries.

The flow is acyclic, and that is only possible because **`pushState` and
`replaceState` do not fire `popstate`**: a write can never trigger a read, so no
guard flags are needed.

### Validation

Each parameter is validated on its own. An invalid value defaults **that field
alone**, because one bad character should not cost the other six settings.

| Case | Behaviour |
| --- | --- |
| No query string | Default theme |
| Unknown value (`base=chartreuse`) | That field defaults, others kept |
| Unknown parameter | Ignored |
| Duplicated parameter | First wins |
| `v` missing or empty | Treated as version 1 |
| `v` present but unsupported | Whole theme defaults, notice shown, **URL left untouched** |
| Font name over 64 chars, or containing control characters | That field defaults |

Nothing is rewritten on load. A malformed link stays inspectable, which is the
whole point of a readable format.

### Fonts are the interesting case

`decode()` is synchronous, but the font catalogue is a network call. So font
names travel through decoding as **opaque strings** and are matched only once
there is a catalogue: case-insensitively, corrected to the catalogue's spelling
(`heading=inter` becomes `Inter`), and defaulted with a notice if unknown.

The check is against the catalogue, **never the browser**. Asking whether the
browser can render a name would accept `Helvetica Neue` on a machine that has it
installed, so the link would look right to the sender and wrong to everyone
else.

## Fonts

Two Google APIs, with opposite requirements:

| | Needs a key | Returns |
| --- | --- | --- |
| Web Fonts **Developer API** | yes | the catalogue |
| **CSS2 API** | no | the font files |

The key gates the *list*, never the rendering — so a catalogue failure does not
stop a font you already asked for from loading.

**Previews** use each family's `menu` file, which contains only the glyphs of
that family's own name, registered through `new FontFace(alias, …)`. Choosing
the face name is what makes the obvious bug impossible: a cache keyed by family
alone would report a hit for a previewed font and leave the storefront rendering
with only the letters of that font's name.

**Virtualised** — about 13 of ~1,950 rows are in the DOM at a time. Search
filters the whole catalogue *before* windowing, or it would only ever find what
happened to be mounted. Keyboard movement scrolls its target into view, so
`aria-activedescendant` never points at an unmounted row.

**When a font fails**, the requested family stays in the theme and the URL. The
storefront shows fallback type, a notice explains, and re-picking that same
family triggers an explicit retry.

## Feature: Save & Compare

**What it is.** Save a snapshot of the current theme, keep editing, then open a
read-only Saved/Current toggle that swaps the same storefront between the two.
**Why it is useful.** The builder makes exploration feel risky: once you like
something, changing it costs you the thing you liked, so people stop exploring.
**Implementation.** A snapshot is just a `Theme`, so it serialises through the
same `encode()` as the shareable URL, and the comparison renders the same
storefront with a second token set — possible only because theming is scoped to
a wrapper rather than `:root`.

One snapshot, in memory, lost on refresh. Multiple named snapshots in
`localStorage` would bring a list UI, deletion, quota handling and migration,
for a feature whose real question is "was the last one better?" — and the
shareable URL is already the durable mechanism.

Restoring goes through the same `applyTheme()` funnel as every other edit, so
the controls, the preview and the URL move together. Switching between Saved and
Current changes neither the editable theme nor the URL, and Compare stays
disabled until a snapshot exists.

## Testing

```bash
npm test
```

Committed tests cover the pure modules, where correctness is subtle and
invisible: the WCAG contrast engine, token resolution, URL coding and
validation, catalogue fallback, preview-cache identity, and font-load recovery.

**There are no committed browser or end-to-end tests.** Layout, keyboard
behaviour and the Save & Compare journeys were verified by driving the running
app and asserting against the live DOM. That is a real gap — those checks are
reproducible by hand but are not re-run by CI.

Two defects worth naming, both found by tests before any UI existed:

- An exhaustive check across all 60 base × theme combinations caught `rose-600`
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
Playwright MCP and are not committed as tests.

## Credits

Product photography: see [`public/products/CREDITS.md`](./public/products/CREDITS.md).

Palette values are generated from the installed `tailwindcss` package by
`scripts/generate-palette.mjs` — Tailwind's own values, not transcribed.
