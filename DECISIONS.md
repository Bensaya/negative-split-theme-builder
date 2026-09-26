# Decisions

A running log of the choices behind this project: what was decided, why, and
what was rejected. Written to be readable by someone who does not work in
frontend day to day.

Entries are grouped by area, roughly in the order they were made. Several
record a decision that was later reversed; those are kept as reversals rather
than rewritten, because the reasoning on both sides is the useful part.

---

## Architecture

### 1. The theme is one typed object

**What.** Every setting the user controls lives in a single `Theme` object.
Option lists are declared `as const` and the types are derived from them:

```ts
export const RADII = ['none', 'small', 'medium', 'large'] as const
export type Radius = (typeof RADII)[number]
```

**Why.** Adding an option to a list automatically widens the type, the URL
validator, the Shuffle space and the sidebar. There is no second place to
update, so those four things cannot drift apart.

**Rejected.** Loose strings with a separate list of valid values. It compiles,
but nothing stops the URL parser accepting a radius the sidebar cannot display.

---

### 2. The preview is themed by CSS variables on a wrapper element, not `:root`

**What.** `resolveTokens(theme)` returns plain CSS custom properties, and they
are spread onto the single `<div>` that wraps the storefront. The builder's own
chrome, outside that div, stays on the stock shadcn theme.

**Why it works at all.** This is the load-bearing trick of the whole project,
and it is worth understanding rather than trusting.

shadcn declares its design tokens inside a Tailwind v4 `@theme inline` block.
The `inline` keyword changes what Tailwind compiles a utility class into:

```css
/* @theme inline  ->  ONE hop, resolved on the element that has the class */
.bg-primary { background-color: var(--primary); }

/* plain @theme  ->  TWO hops, inner var resolved at :root */
:root { --color-brand: var(--brand); }
.bg-brand { background-color: var(--color-brand); }
```

With `inline`, `bg-primary` is a single-level `var()` that CSS resolves *on the
element carrying the class*. So overriding `--primary` on an ancestor is picked
up by everything beneath it through ordinary inheritance. Without `inline`, the
inner `var()` is substituted at `:root`, where a per-subtree override does not
exist, and the override is silently ignored.

The practical upshot: **there is no "apply the theme" code in this project.**
The CSS cascade does the propagation. Verified by compiling Tailwind 4.3.3
directly and reading the generated output.

**Rejected, an `<iframe>`.** Genuine style isolation, but you must re-inject
the stylesheet into the frame, font loading gets awkward, and container queries
lose their point because an iframe already sizes to its own box. Real
isolation, far more machinery, no benefit at this scope.

**Rejected — Shadow DOM.** Same isolation story, and both Tailwind's preflight
and shadcn's variable conventions fight it.

**Known caveat.** Radix renders overlays (Dialog, Popover, Select, Tooltip)
into a portal at `document.body` by default, which is *outside* the wrapper —
so a portalled menu inside the preview would fall back to the root theme. Any
such component in the preview must be given a portal `container` pointing back
into the wrapper.

---

### 3. Three gotchas that follow from `@theme inline`

Recorded because each one costs an hour if you meet it cold:

- The wrapper must itself carry `bg-background text-foreground font-sans`.
  shadcn applies those to `body`, which resolves *outside* the subtree.
- Reference `var(--primary)`, never `var(--color-primary)`. `@theme inline`
  does not emit the `--color-*` names into `:root` at all.
- Tailwind's stock palette utilities (`bg-red-500`) are **not**
  subtree-overridable. Only the semantic tokens are, so the preview uses
  semantic tokens throughout.

---

## Colour

### 4. The palette is generated from the installed Tailwind, not typed by hand

**What.** `src/theme/palette.ts` is produced by `scripts/generate-palette.mjs`,
which reads `node_modules/tailwindcss/theme.css`.

**Why.** Tailwind v4 ships `oklch` values and re-tuned the ramps; the hex codes
most people have memorised are the v3 ones. Generating from the installed
package makes the colours provably Tailwind's own, at the version depended on,
and the version is stamped into the file header.

**Rejected.** Pasting hex values from memory or from the docs site. Works, but
"where did this colour come from?" has no good answer.

---

### 5. Base colours follow the assignment, not current shadcn

**What.** The five base colours are Neutral, Slate, Gray, Zinc and Stone,
derived from Tailwind's five neutral ramps.

**Why.** shadcn's current CLI presets are `neutral, stone, zinc, mauve, olive,
mist, taupe` — **Slate and Gray have been removed** since the assignment was
written. Tailwind's own palette still has exactly the five ramps the brief
names, so deriving from Tailwind satisfies the brief literally and avoids
depending on a preset list that has already changed once.

**Rejected.** Shipping shadcn's current seven. More "up to date", but it
visibly contradicts the specification we were given.

---

### 6. Contrast is real WCAG 2.1, computed on sRGB

**What.** `contrast.ts` converts `oklch -> oklab -> LMS -> linear sRGB ->
gamma`, then applies the WCAG relative-luminance and ratio formulas.

**Why.** Our colours are `oklch` but WCAG is defined on sRGB relative
luminance. oklch's `L` channel is *perceptual lightness*, a different
quantity. Using it as a shortcut is three lines and gives answers that are
close enough to look right and wrong often enough to ship unreadable text.

**Rejected, an oklch lightness threshold.** Fast, approximately right, and not
defensible if anyone asks whether the app is actually WCAG compliant.

**Rejected, a colour library (`culori`, `colorjs.io`).** Correct and quick,
but it is a dependency for about forty lines of arithmetic, and writing it
directly is the more defensible answer for an exercise partly about judgement.

---

### 7. The primary shade is searched for, not hardcoded

**What.** `pickPrimary()` walks the chosen accent ramp from its most vivid step
outward and takes the brightest one whose best foreground still clears AA.

**Why.** This came out of a test, not a review. An exhaustive check across all
60 base × theme combinations failed on `rose-600` and `fuchsia-600` at about
4.4:1 — under the 4.5:1 bar, and close enough that nobody would catch it by
eye. Darkening every ramp to fix two would have dulled the colours that were
already fine.

**Rejected.** A single hardcoded shade for every ramp. Simpler, and either too
dark everywhere or below AA somewhere.

---

### 8. Menu accents are picked against the menu surface

**What.** `--menu-accent` is chosen relative to the nav background, not copied
from `--primary`.

**Why.** Also caught by a test. Setting the accent to `--primary` put a bright
lime underline on a white nav at **1.96:1** — present on screen, invisible in
practice. A dark nav and a white nav need different steps of the same ramp.

**Rejected.** `--menu-accent = --primary`. One line, and broken for every light
menu.

---

### 9. Menu controls are Default/Inverted and Subtle/Bold, not colour pickers

**What.** Two two-way toggles rather than two free colour choices.

**Why.** All four combinations are readable *by construction*, because they are
derived from a base pair whose contrast is already settled. It is also what
shadcn itself does, the generated `components.json` in this repo literally
contains `"menuColor": "default"` and `"menuAccent": "subtle"`.

**Rejected.** Free colour pickers with automatically derived foregrounds. This
was the original plan and was reversed. Free pickers let a user produce a
menu that is technically readable and still ugly, and the automatic-contrast
work still has a harder job to do on `--primary` regardless.

---

### 10. Light mode only

**What.** No dark-mode toggle for the storefront.

**Why.** Doing it properly doubles every colour decision *and* every contrast
check, and the assignment does not ask for it. Naming it as a deliberate cut is
stronger than shipping it half-done.

**Note.** The mechanism would work: `@custom-variant dark (&:is(.dark *))` is
selector-based, so a `dark` class on the preview wrapper scopes dark mode to
the preview without touching the builder.

---

## Testing

### 11. Test the logic hard, do not unit-test the pixels

**What.** Real test-first development on the pure modules — contrast, token
resolution, URL encoding and validation, font-catalogue fallback — plus a small
set of end-to-end tests for the flows that must not break. No component tests
for presentational markup.

**Why.** That is where correctness is subtle and where a bug is invisible. Two
real defects (entries 7 and 8) were found by tests before any UI existed.
Component tests on presentational code are brittle and would have competed with
the design work, which the brief grades explicitly.

**Rejected — component tests for every control.** Roughly two extra hours to
assert that a click calls a setter.

**Rejected - tests written afterwards.** Faster to a demo, but the git history
would then show tests bolted on at the end, which is the opposite of the signal
intended.

**Known gap.** Manual DOM-driven verification is not re-run by CI. Several
defects surfaced only that way, which is an argument for adding Playwright
specs if this went further than a take-home.

---

## The shareable URL

### 12. React owns the state; the URL is a projection of it

**What.** One `Theme` object in React state is the source of truth. On change,
a debounced effect writes the URL. The URL is *read* only on navigation events:
mount, and `popstate`.

**Why.** The data flow has no cycle. User input flows state → URL; browser
navigation flows URL → state; neither triggers the other, because
`pushState` and `replaceState` **do not fire `popstate`**. That last fact is
what makes Back and Forward safe to support without guard flags.

**Rejected, the URL as the source of truth.** "Shareable link comes free", but
every control write becomes a history operation, parsing happens on every
render, and every component is coupled to the serialization format.

**Rejected — two-way sync.** State watches the URL and the URL watches the
state. This is the trap: state writes URL, URL write triggers read, read sets
state, and you start adding flags to break cycles you created yourself.

---

### 13. Human-readable parameters with a schema version

**What.** `?v=1&base=slate&theme=rose&radius=large&menu=inverted&accent=bold&heading=Playfair%20Display&body=Inter`
rather than one opaque encoded blob.

**Why.** A reviewer can read the URL and understand it, and can edit one
parameter by hand to test a specific case. The `v` parameter means a future
change to the format can be detected instead of silently misparsed.

**Tradeoff accepted.** Longer URLs, and the format becomes a public contract.
Both are worth it for legibility in an exercise that is partly *about* the URL.

**Rejected — base64 of a JSON blob.** Shorter and tidier, opaque and
undebuggable. Also still needs a version marker, so it saves less than it looks.

---

### 14. Validation is per-field, and failure never throws

**What.** Each parameter is validated independently against its `as const`
list. An unknown, missing or malformed value falls back to that single field's
default; the rest of the theme is unaffected. A version mismatch falls back to
the default theme wholesale rather than guessing.

**Why.** A shared link is user input from an untrusted source — truncated by a
chat client, hand-edited, or produced by an older version of the app. The app
must never render a blank page because one parameter was wrong.

**Rejected — all-or-nothing validation.** One bad character and the user loses
the other six settings they were sent.

---

### 14a. A missing version means version 1

**What.** No `v` parameter is treated as version 1. Only an explicitly
different version (`v=2`) is rejected.

**Why.** Hand-edited and trimmed links are a normal way to arrive, and
discarding a perfectly readable theme because someone dropped `v=1` would be
hostile. This also resolves a contradiction in the first draft of this
document, which showed an unversioned URL working in one place and being
discarded in another.

**Rejected.** A separate legacy decoder. Nothing has ever shipped, so there are
no legacy links — it would be a code path with no users.

---

### 15. Font names are validated separately from everything else

**What.** `decode()` is pure and synchronous: it validates the fixed
enumerations immediately, and carries font names through as *opaque unresolved
strings*. Whether a font actually exists is resolved later, against the
catalogue, once the catalogue has loaded.

**Why.** This one is subtle and would have shipped as a bug. A pure `decode()`
cannot check a font against a catalogue that is still being fetched. Validating
eagerly would mean a shared link's font is replaced by the default during the
moments before the API responds — or permanently, if the API is unavailable.
Instead the requested font renders through the fallback stack and resolves when
it can.

**Rejected.** Treating the font name as just another enum. Correct-looking, and
it silently destroys the font in a shared link whenever the network is slow.

---

### 16. One history verb, written immediately

**What.** Every theme change writes the URL immediately with `replaceState`.
No debounce, no `pushState`.

**Why no debounce.** All seven controls are discrete selections. There is no
slider for a debounce to coalesce, so it would buy nothing and cost delayed
URLs, stale writes and cancellation logic. An earlier draft specified 250 ms;
it was solving a problem this UI does not have.

**Why no `pushState`.** An earlier draft pushed on Shuffle so Back would undo
it. Reversed: browser-history undo needs its own design for how pushes interact
with later edits and Forward, and Save & Compare already provides an explicit
save-and-restore that does the job more visibly. An app that never pushes is at
least predictable.

**Rejected.** Push-on-Shuffle. It is a nice touch and it is a second,
half-specified undo mechanism competing with the one we actually built.

---

### 16a. Nothing is rewritten on load

**What.** The incoming URL is never corrected. A link stays as sent until the
first edit.

**Why.** The whole benefit of a readable format is that a broken link can be
read. Silently rewriting the address bar destroys the evidence in exactly the
case someone is debugging. An unsupported version shows a notice and leaves the
link alone.

---

### 16b. Edits compose from a ref, not from state

**What.** `updateTheme(derive)` reads the current theme from a ref and hands
`applyTheme` a finished value.

**Why.** Composing from a closed-over `theme` meant two edits in the same tick
both built on the same stale snapshot and the second discarded the first —
five rapid swatch clicks kept only the last. Found by driving the real UI, not
by a unit test.

**Rejected.** A functional state updater, which would fix staleness but put the
URL write and Shuffle's `Math.random()` inside an updater React invokes twice
under StrictMode.

## Fonts

### 17. Live Google Fonts API, with a bundled fallback list

**What.** The catalogue comes from the Web Fonts Developer API using
`VITE_GOOGLE_FONTS_API_KEY`. If the key is absent or the request fails, a
bundled list of popular families is used instead.

**Why.** The brief asks for all Google Fonts via the API. But `.env.local` is
gitignored, so **whoever clones this repo to review it will not have a key** —
without a fallback, both font pickers would render empty and the app would look
broken to the person grading it. The fallback is the path a reviewer is most
likely to hit, not an edge case.

**Noted honestly.** A `VITE_`-prefixed variable is compiled into the browser
bundle and is therefore public. That is acceptable here, it is a read-only
public catalogue and the key can be restricted by HTTP referrer, but it is
not a secret and should not be described as one.

---

### 18. Font previews use the API's `menu` subset, not batched CSS2 requests

**What.** Each row in the picker renders in its own typeface, loaded from the
`menu` URL that the Developer API already returns for every family, a font
file containing only the glyphs of that family's own name — registered via
`new FontFace(alias, url)`.

**Why.** The first design batched families into one CSS2 request with
`&text=<union of their names>`. Measured, that is 1 CSS request plus one font
file per family — *not* one request, as first claimed. The `menu` approach
wins on a different axis: every `text=` combination is a **novel URL**, so
scrolling back up the list is a cache miss forever, whereas a `menu` URL is
versioned and immutable (`cache-control: public, max-age=31536000`, measured).
Each family is fetched at most once, ever, across sessions.

**Measured, corrected.** An earlier comparison here was wrong by up to 32×
because `curl` without a browser user-agent receives TTF rather than WOFF2.
With a real user-agent, one full font is about 10 KB, not 317 KB. The
`menu` route is *not* the smallest on first paint (~5.5 KB per family); it wins
on caching and on having no bookkeeping.

**Bonus.** Because `FontFace` lets us choose the family name, preview faces are
registered under an alias. That makes the next entry impossible to get wrong.

---

### 19. Preview fonts and storefront fonts live in separate caches

**What.** A previewed face is registered under an alias; the storefront loads
the real family at real weights through CSS2. Two namespaces.

**Why.** Caching "by family" would conflate *"I loaded the 24-glyph name
subset"* with *"I loaded the full font"*. Select a font you had previewed and
the cache would report a hit — and the storefront would render with only the
letters of the font's own name available. Separate namespaces make the
collision impossible rather than merely avoided.

**Also.** In-flight requests are cached too, so fast scrolling cannot fire
duplicate requests for the same family.

---

### 20. Virtualised list via `@tanstack/react-virtual`

**What.** Only the visible rows of the 1,955-family list are rendered.

**Why.** 1,955 DOM nodes in a popover is not viable. Hand-rolling windowing is
about forty lines, but the edge cases — dynamic measurement, scroll
restoration, overscan — are exactly what makes homegrown virtualisation subtly
janky. "I used the standard virtualiser" is easier to defend than a bespoke one
with a scroll bug.

**Caveat to handle.** Virtualisation unmounts rows, and an unmounted row cannot
be the target of `aria-activedescendant`. The filtering must run over the whole
catalogue *before* windowing (`cmdk`'s `shouldFilter={false}`), and the active
option must stay mounted, or keyboard navigation breaks past the first screen.

---

## Presentation

### 20a. The shell clips both axes, and the page never scrolls

**What.** The app shell uses `overflow: hidden` on both axes, and `html`,
`body` and `#root` are pinned to `height: 100%` with `overscroll-behavior:
none`.

**Why.** `overflow-x: hidden` alone does not do what it looks like it does:
per the CSS spec, when one axis is not `visible` the other computes from
`visible` to `auto`. So a shell meant only to prevent sideways scrolling
silently became a vertical scroll container. Combined with rubber-band
overscroll, dragging up pulled the whole app off screen and exposed the white
page background beneath it as a large empty rectangle.

The builder is a fixed-height app shell rather than a document: the sidebar and
the preview scroll independently and the page itself never should.

**Rejected.** Leaving `overflow-x-hidden` and papering over the gap by giving
the body the same background. That hides one symptom of a shell that is
scrolling when it should not be, and the top bar would still drift.

---

### 21. The preview responds to its own width, and a device toggle proves it

**What.** The storefront uses container queries (`@container`), which are built
into Tailwind v4 core and need no plugin. A Desktop/Mobile toggle above the
preview constrains the container's width.

**Why.** Container queries are the right mechanism, the preview should reflow
because *the preview* is narrow, not because the browser window is. But if the
panel width never changes, the distinction is invisible and the claim is
untestable. The toggle makes it demonstrable in one click, and is a real
feature: anyone theming a store wants to check it on mobile.

---

### 22. Product imagery is photography

**What.** Permissively-licensed running-shoe photographs in `public/products/`,
committed to the repo.

**Why.** "Looks like a real store" is substantially a photography grade. A
themed-SVG shoe wall was prototyped — the idea being that products would
re-tint with the theme — and two attempts did not reach a quality bar worth
shipping. Photography is the honest trade: the theme's effect is confined to
chrome, type, buttons and accents, and the store actually looks real.

**Why committed rather than hotlinked.** The repo stays self-contained, works
offline, and cannot rot. Credits are in the README.

**Rejected.** The branded product photography in the approved mockup. Those
images are brand-owned; shipping them in a take-home is not defensible.

---

## The custom feature

### 23. Save & Compare

**What.** One snapshot of the current theme, held in memory, with a read-only
Saved/Current comparison view and an explicit restore.

**Why.** It answers a problem the builder creates: users find something they
like, keep experimenting, and then cannot tell whether the earlier version was
better. Without a way back, exploration is risky, so people stop exploring.

**Why this one over the alternatives.** It reuses the machinery already being
built — a snapshot serializes through the same `encode()` as the shareable URL,
and the comparison view renders the same storefront component with a different
token set. It adds a feature without adding a subsystem, which is a better
argument than a larger feature bolted on the side.

**Tradeoff, deliberately taken.** Exactly one snapshot, in memory, lost on
reload. Multiple named snapshots in `localStorage` is the obvious "more
complete" version, and it brings a list UI, naming, deletion, storage-quota
handling and migration. One slot answers the actual question — *"was the last
one better?"* — at a fraction of the surface area. The shareable URL remains
the durable way to keep a theme.

---

## Process

### 24. Conventional commits, one logical change each

Commit messages carry the *why*. Several of the entries above exist because the
reasoning was written down at the moment of the decision rather than
reconstructed afterwards.

### 25. Subagents review, they do not implement

Specialist agents were used as critics — design review, accessibility audit,
code review — and for fact-finding. Implementation stayed in one pair of hands,
because code nobody reasoned through is code nobody can defend.
