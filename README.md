# Negative Split — Shop Theme Builder

A theme builder for an e-commerce storefront: pick a base colour, an accent, two
fonts, a corner radius and a menu treatment on the left, and a running-shoe shop
re-themes live on the right. Every combination is a shareable link.

Built with Vite, React, TypeScript, Tailwind CSS v4 and shadcn/ui. No backend.

> **Status.** Complete. Every configuration control, the shareable URL,
> Shuffle and Save & Compare are implemented.

---

## Running it locally

Requires **Node 20.19+ or 22.12+** (Vite 8). Built and verified on Node 25.2.

```bash
npm install
npm run dev          # http://localhost:5173 - the port is pinned
```

The dev server uses `strictPort`, so it fails rather than moving to 5174. The
Google Fonts API key is restricted by HTTP referrer to `localhost:5173`, and a
silent port change would make every catalogue request fail.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck and production build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run typecheck` | TypeScript only |

### Google Fonts API key — optional

The font pickers use the Google Fonts Developer API to list the full catalogue.
**The app works without a key** — it falls back to a bundled list of popular
families, but with one you get all 1,955 families.

```bash
cp .env.example .env.local
# then edit .env.local:
VITE_GOOGLE_FONTS_API_KEY=your_key_here
```

A key is free from the [Google Cloud Console](https://console.cloud.google.com/):
create a project, enable **Web Fonts Developer API**, create an API key. No
billing account required.

Note that a `VITE_`-prefixed variable is compiled into the browser bundle and is
therefore **public**. That is acceptable for this API — it is a read-only public
catalogue, and the key can be restricted by HTTP referrer, but it is not a
secret and is not treated as one here.

---

## The shareable URL

### What it looks like

```
/?v=1&base=slate&theme=rose&radius=large&menu=inverted&accent=bold
 &heading=Playfair%20Display&body=Inter
```

Readable, one parameter per control, with a schema version at the front.

### Who owns the state

**React owns the theme. The URL is a projection of it.**

One `Theme` object lives in React state and is the single source of truth. When
it changes, the URL is written immediately. The URL is *read* in exactly two
situations: on mount, and on `popstate`.

The reason this is safe — and the detail that makes the whole design work — is
that **`pushState` and `replaceState` do not fire `popstate`.** Writing to the
URL therefore cannot trigger a read, so the data flow has no cycle:

```
user input  ──►  React state  ──►  URL        (write, immediate)
browser nav ──►  URL          ──►  React state (read, on popstate only)
```

Two other approaches were considered:

**The URL as the source of truth.** Every control writes to the URL and state is
derived from `location.search` on each render. The shareable link then comes for
free. Rejected because every slider nudge becomes a history operation, parsing
runs on every render, and every component ends up coupled to the serialization
format, which also makes the format much harder to change later.

**Two-way sync**, where state watches the URL and the URL watches the state.
This is the trap. State writes the URL, the URL write triggers a read, the read
sets state, and you start adding guard flags to break cycles you created
yourself. It is a familiar bug and worth designing out rather than debugging.

### Readable parameters, not an encoded blob

The alternative was base64 of a JSON object: shorter, tidier, and completely
opaque. Readable parameters were chosen because a reviewer can understand the
link at a glance and can hand-edit one value to test a specific case, which
matters for an exercise that is partly *about* the URL. The blob would also
still need a version marker, so it saves less than it first appears.

The tradeoff accepted: longer URLs, and the parameter names become a public
contract that older links depend on. The `v=1` parameter is how that contract
is allowed to change. an unrecognised version falls back to the default theme
rather than guessing at a format it does not understand.

### Validation: per-field, and it never throws

A shared link is untrusted input. It may have been truncated by a chat client,
hand-edited, or produced by an older build. So each parameter is validated
independently against its own `as const` list, and **an invalid value falls back
to that one field's default without affecting the others.**

```
?v=1&base=chartreuse&theme=rose   →   base falls back to neutral, theme=rose is kept
```

All-or-nothing validation was rejected for the obvious reason: one bad character
should not cost the user the other six settings they were sent.

| Case | Behaviour |
| --- | --- |
| No query string | Default theme |
| Unknown parameter name | Ignored |
| Unknown value (`base=chartreuse`) | That field defaults, others kept |
| Missing parameter | That field defaults |
| Duplicated parameter | First occurrence wins |
| Unencoded space in a font name | Accepted; `+` and `%20` both parse |
| `v` missing | Treated as version 1. a trimmed or hand-edited link still works |
| `v` present but unsupported (`v=2`) | Whole theme defaults, a notice explains why, **and the URL is left untouched** |
| Font name over 64 chars, or containing control characters or `<` | That field defaults |

### The subtle one: fonts cannot be validated at parse time

This is the part that would have shipped as a bug.

`decode()` is pure and synchronous. It can check that `radius=large` is a real
radius, because that list is a compile-time constant. It **cannot** check that
`heading=Playfair Display` is a real Google Font, because the catalogue is
fetched over the network and may not have arrived — or may never arrive, if
there is no API key.

Validating fonts eagerly would mean that opening a shared link replaces the
sender's font with the default during the moments before the API responds, and
permanently if the API is unavailable. The link would appear to work and would
quietly be wrong.

So font names are carried through decoding as **opaque unresolved strings**.
They render immediately via the CSS fallback stack, and membership in the
catalogue is resolved separately once a catalogue exists. A requested font is
never overwritten with a default while the catalogue is loading or unavailable.

### History: one verb, immediate

Every theme change, including Shuffle and restoring a saved theme, writes
immediately with `replaceState`.

**No debounce.** All seven controls are discrete selections: swatches, segmented
toggles, dropdowns. There is no slider, so there is nothing for a debounce to
coalesce, and adding one would only introduce delayed URLs, stale writes and
timer coordination for no benefit. An earlier draft specified 250 ms; that was
solving a problem this UI does not have.

**No `pushState`.** Browser-history undo is deliberately out of scope. An
earlier draft pushed a history entry on Shuffle so Back would undo it, but that
needs its own design for how pushes interact with subsequent edits and Forward,
and Save & Compare already provides an explicit, visible save-and-restore that
does the same job better.

The accurate guarantee is narrow: **theme edits create no history entries.**
What Back then does is whatever the rest of the session put on the stack. In-page
anchors such as `#grid` in the storefront still create entries, so Back may well
move within the page before it leaves it. Anything stronger would be a claim
about history this app does not control.

Two consequences worth stating:

- **Nothing is rewritten on load.** A link someone sent stays exactly as sent
  until the first edit. A malformed or unsupported link therefore stays
  inspectable instead of being quietly corrected out of existence.
- **"Copy link" builds from current state**, never by reading
  `location.search`. It reads through a ref rather than React state, so a link
  copied immediately after an edit carries that edit.

### One bug this caught

Composing each edit from a closed-over `theme` meant two edits dispatched in
the same tick both built on the same stale snapshot, and the second silently
discarded the first. Five rapid swatch clicks kept only the last one.

The fix is a ref holding the latest theme, with edits composed from the ref. It
cannot be fixed with a functional state updater, because the URL write and
`Math.random()` in Shuffle must stay *outside* updaters — React invokes those
twice under StrictMode.

### What this does not do

There is no server, so there is no short link. A theme with two long font names
produces a URL around 150 characters — fine for a chat message, awkward on a
printed page. With a backend the obvious next step is to POST the theme and
return an id, keeping the readable URL as a fallback for anyone who wants to
inspect or edit it by hand.

---

## The custom feature: Save & Compare

### What it is

A **Save for comparison** button takes a snapshot of the current theme. You keep
editing. **Compare** then opens a read-only view with a Saved / Current toggle
that swaps the same storefront, at the same size and scroll position, between
the two themes. **Use saved theme** restores the snapshot into the editor;
closing the comparison without restoring leaves your current edits untouched.

### The problem it solves

The builder creates a specific frustration. You try combinations, land on
something you like, carry on exploring to see if it gets better — and then
cannot tell whether it did. The previous version is gone, and reconstructing it
means remembering five or six settings exactly.

The practical effect is that people stop exploring. Once a theme is "good
enough", changing it feels like it costs something. A tool whose entire purpose
is to help someone choose confidently should not make experimentation feel
risky, and comparison is the thing that makes it safe.

It is also the honest way to answer the question users actually have, which is
not "what does this theme look like" but "**is this one better than that one?**"
That is a comparative judgement, and a single live preview cannot support it —
you end up flicking settings back and forth from memory.

### Why this feature and not a bigger one

It reuses machinery the project already needs rather than adding a subsystem:

- A snapshot is a `Theme`, so it serializes through the **same `encode()`** as
  the shareable URL.
- The comparison view renders the **same storefront component** with a different
  token set, which is only possible because theming is scoped to a wrapper
  element rather than `:root`. Two themes can therefore exist on one page at the
  same time.

Adding a feature without adding a subsystem is a better argument than bolting on
something larger, and it puts the architecture to a second use that demonstrates
the first was sound.

### Implementation notes

- **One snapshot, in memory.** Held in React state for the page session. Saving
  again explicitly replaces it.
- **The snapshot captures the whole `Theme`** — both fonts, base and accent
  colour, radius, and both menu settings. Because it is the same typed object,
  a field added later is captured automatically.
- **Comparison is read-only and non-destructive.** Toggling between Saved and
  Current does not touch the editable theme or the URL. Only "Use saved theme"
  writes, and it goes through the normal state flow, so the sidebar controls,
  the preview and the URL all update together through one code path.
- **Compare is disabled until a snapshot exists**, rather than opening an empty
  view and explaining why it is empty.
- **The URL always represents the editable theme**, never the snapshot. There is
  one meaning for the address bar and it does not change depending on which view
  is open.
- **The saved theme's fonts start loading when the snapshot is taken**, which
  usually means the saved view renders in its real typefaces immediately.
  Starting a request is not finishing one: a slow or failed face shows fallback
  typography there as it would anywhere else. Preloading reduces the chance of
  a flash rather than removing it.

### The tradeoff, taken deliberately

**One slot, in memory, lost on reload.**

The obvious "more complete" version is multiple named snapshots in
`localStorage`. That brings a list UI, naming, deletion, storage-quota handling,
and a migration story for when the theme shape changes — a meaningful amount of
surface area for a feature whose real question is simply *"was the last one
better?"* One slot answers that question directly.

Persistence is also already solved by a better mechanism: the shareable URL is
the durable way to keep a theme, and it works across devices and people, which
`localStorage` does not. Save & Compare is deliberately the *ephemeral* tool —
scratch space for the ten seconds when you are deciding — and the URL is the
permanent one.

---

## Fonts

Two Google APIs are involved and they have opposite requirements:

| | Needs a key | Returns |
| --- | --- | --- |
| Web Fonts **Developer API** | yes | the catalogue — 1,955 families |
| **CSS2 API** | no | the actual font files |

So the key gates the *list*, never the rendering. That distinction matters:
a catalogue failure does not stop a font the user already asked for from
loading, because those are separate operations that fail separately.

**Previews.** Each catalogue entry carries a `menu` URL — a font file holding
only the glyphs of that family's own name, versioned and served with
`cache-control: max-age=31536000`, so repeat views are normally served from the
browser's HTTP cache. In-process, one entry per family and loading mode is kept
for the page session; a failed attempt is evicted so selecting that family
again retries. The picker registers the file through `FontFace` under an
**alias** (`Inter __menu`).

Choosing the name is what makes the obvious bug impossible. A cache keyed by
family would conflate *"I loaded the 20-glyph name subset"* with *"I loaded the
full font"* — select a previewed font and the storefront would render with only
the letters of that font's name available. Separate namespaces mean the
collision cannot happen, rather than merely not happening.

**Virtualisation.** ~13 of 1,955 rows are in the DOM at a time. Search filters
the whole catalogue *before* windowing, or it would only ever find what happened
to be mounted. Keyboard movement scrolls the target into view, which keeps it
mounted — otherwise `aria-activedescendant` points at nothing and a screen
reader announces nothing.

**When a font fails**, the requested family stays in the theme and in the URL.
The storefront shows fallback typography and a notice explains what happened.
Choosing that same family again triggers an explicit retry: re-picking the
already-selected font changes no theme value, so the loader is asked directly
rather than the theme or the URL being nudged to force a re-run. The retry
starts a genuinely new request, shares an attempt already in flight, and clears
the error once the face actually loads.

**Without a key**, a bundled list of 35 curated families is used instead, and
the picker says so. `.env.local` is gitignored, so this is the path anyone
cloning the repo will actually hit — not an edge case.

---

## Testing

```bash
npm test          # 96 unit tests
npm run typecheck
npm run build
npm run lint
```

**Committed automated coverage** is over the pure modules, where correctness is
subtle and invisible:

| Module | What is asserted |
| --- | --- |
| `theme/contrast` | oklch to sRGB conversion pinned to reference values; WCAG ratios |
| `theme/tokens` | readable text across all 60 base x theme pairs and all 240 badge combinations |
| `theme/shuffle` | draws only from the option lists; never pairs a font with itself |
| `url/urlCodec` | round trips, per-field fallback, malformed input never throws |
| `fonts/catalog` | no key, 403, network error, malformed entries, caching |
| `fonts/preview` | cache identity across the bundled-to-API handoff |
| `fonts/loadRecovery` | pending vs loaded vs failed, retry after failure, dedupe |

**There are no committed browser or end-to-end tests.** Layout, keyboard
behaviour and the Save & Compare journeys were verified by driving the running
app manually and asserting against the live DOM. That is a real gap: those
checks are reproducible by hand but are not re-run by CI.

Several defects were found this way rather than by test, including a
virtualised list that rendered zero rows because the scroll container was
measured before it existed, and `aria-activedescendant` referencing an
unmounted option after a manual scroll.

---

## Credits

Product photography: see `public/products/CREDITS.md`.

Palette values are generated from the installed `tailwindcss` package by
`scripts/generate-palette.mjs` — they are Tailwind's own values, not
transcribed.
