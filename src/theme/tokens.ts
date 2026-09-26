import { AA_LARGE, AA_NORMAL, contrastRatio, pickForeground } from './contrast'
import { PALETTE, type RampName } from './palette'
import { RADIUS_REM, type Theme } from './theme'

/**
 * Turns a Theme into the CSS custom properties that re-skin the preview.
 *
 * These are spread onto the *preview wrapper element*, never onto :root, which
 * is what keeps the builder's own chrome on the stock shadcn theme while the
 * storefront inside re-themes.
 *
 * It works because shadcn declares its tokens inside `@theme inline`, so
 * `bg-primary` compiles to `background-color: var(--primary)` - a single-level
 * var() resolved on the element that carries the class. Ordinary custom
 * property inheritance then does the propagation for us, and there is no
 * "apply the theme" code anywhere. (A plain `@theme` block would resolve the
 * inner var() at :root instead, and a per-subtree override would be ignored.)
 */

const FALLBACK_STACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'

/** CSS strings are quoted; a stray quote in a family name must not escape it. */
function fontStack(family: string): string {
  const safe = family.replace(/["\\]/g, '')
  return `"${safe}", ${FALLBACK_STACK}`
}

/** Shades considered for the primary, brightest first. */
const PRIMARY_SHADES = [500, 600, 700, 800] as const

/**
 * Shades considered for an accent drawn *on a given surface*, ordered by how
 * vivid they are. We want the most saturated step that is still visible, so
 * the mid ramp comes first and we fan outwards.
 */
const ACCENT_SHADES = [500, 600, 400, 700, 300, 800, 200, 900] as const

/**
 * Picks the brightest step of the chosen accent ramp whose best foreground
 * still clears WCAG AA.
 *
 * Hardcoding a single shade does not work across all twelve ramps: 500 is the
 * most vivid step and is right for lime or amber, but rose-600 and
 * fuchsia-600 sit at ~4.4:1 against both candidate foregrounds - close enough
 * to look fine and measurably below AA. Darkening every ramp to fix two would
 * dull the colours that were already fine, so we search instead.
 */
function pickPrimary(ramp: RampName, lightest: string, darkest: string): string {
  const steps = PRIMARY_SHADES.map((s) => PALETTE[ramp][s])
  for (const candidate of steps) {
    const best = Math.max(
      contrastRatio(candidate, lightest),
      contrastRatio(candidate, darkest),
    )
    if (best >= AA_NORMAL) return candidate
  }
  // No step clears AA (does not happen with Tailwind's ramps, but the fallback
  // must still be deterministic): use the darkest considered step.
  return steps[steps.length - 1]
}

/**
 * Picks the step of `ramp` that works as an accent on `surface`.
 *
 * An accent has to satisfy TWO constraints, and satisfying only the first is
 * the bug this function exists to avoid:
 *
 *   1. It must be visible against the surface it sits on. An accent is a UI
 *      element - an underline, a badge - so AA's 3:1 large-text bar applies.
 *   2. Text must be readable ON it. The bag count is
 *      --menu-accent-foreground on --menu-accent, which needs the full 4.5:1.
 *
 * Checking only (1) produced fourteen unreadable badge combinations, Neutral +
 * Indigo + Bold among them: a mid-tone accent can be perfectly visible on a
 * dark nav while neither white nor near-black reads on top of it.
 *
 * Candidates run brightest-first, so vivid steps win when they qualify and we
 * darken only as far as we must. If nothing satisfies both, the constraint
 * that protects legibility of text wins.
 */
function pickAccentOn(
  surface: string,
  ramp: RampName,
  lightest: string,
  darkest: string,
): string {
  const steps = ACCENT_SHADES.map((s) => PALETTE[ramp][s])

  const readableOn = (candidate: string) =>
    Math.max(contrastRatio(candidate, lightest), contrastRatio(candidate, darkest)) >= AA_NORMAL

  for (const candidate of steps) {
    if (contrastRatio(surface, candidate) >= AA_LARGE && readableOn(candidate)) return candidate
  }
  // Nothing satisfies both. Prefer a legible badge over a vivid but unreadable
  // one, then fall back to whatever is most visible on the surface.
  return (
    steps.find(readableOn) ??
    steps.reduce((best, c) => (contrastRatio(surface, c) > contrastRatio(surface, best) ? c : best))
  )
}

export type ThemeTokens = Record<string, string>

export function resolveTokens(theme: Theme): ThemeTokens {
  const base = PALETTE[theme.baseColor]


  // Light-mode mapping. The lightest and darkest steps of the chosen base ramp
  // are the two candidates for any automatically-picked foreground, so text
  // always belongs to the same colour family as the surface behind it.
  const lightest = base[50]
  const darkest = base[950]

  const background = 'oklch(100% 0 none)'
  const foreground = base[950]

  const primary = pickPrimary(theme.themeColor, lightest, darkest)
  const primaryForeground = pickForeground(primary, lightest, darkest)

  const menu = theme.menuColor === 'inverted' ? base[950] : background
  const menuForeground = pickForeground(menu, lightest, darkest)

  // Bold draws the nav accent from the theme ramp, Subtle from the base ramp -
  // but in both cases the step is chosen against the *menu* surface, not the
  // page. Using --primary directly would put a lime underline at 1.96:1 on a
  // white nav: visually present, effectively invisible.
  const menuAccent = pickAccentOn(
    menu,
    theme.menuAccent === 'bold' ? theme.themeColor : theme.baseColor,
    lightest,
    darkest,
  )
  const menuAccentForeground = pickForeground(menuAccent, lightest, darkest)

  return {
    '--background': background,
    '--foreground': foreground,
    '--card': background,
    '--card-foreground': foreground,
    '--popover': background,
    '--popover-foreground': foreground,

    '--primary': primary,
    '--primary-foreground': primaryForeground,

    '--secondary': base[100],
    '--secondary-foreground': base[900],
    '--muted': base[100],
    '--muted-foreground': base[600],
    '--accent': base[100],
    '--accent-foreground': base[900],

    '--border': base[200],
    '--input': base[200],
    '--ring': primary,

    '--radius': RADIUS_REM[theme.radius],

    '--font-sans': fontStack(theme.bodyFont),
    '--font-heading': fontStack(theme.headingFont),

    // Not part of shadcn's token set - the assignment's menu controls need
    // their own surface, so we add four tokens in the same style.
    '--menu': menu,
    '--menu-foreground': menuForeground,
    '--menu-accent': menuAccent,
    '--menu-accent-foreground': menuAccentForeground,
  }
}
