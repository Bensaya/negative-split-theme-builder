import { BUNDLED_FAMILIES } from '@/fonts/catalog'
import {
  MENU_ACCENTS,
  MENU_COLORS,
  RADII,
  THEME_COLORS,
  type BaseColor,
  type Theme,
} from './theme'

/**
 * Shuffle is constrained, not uniform.
 *
 * Uniform random over every font and colour mostly produces junk: a display
 * face as body text, a heading and body that are nearly identical, a
 * combination nobody would choose. A reviewer will press this button five
 * times, and if three results look broken that is the impression that sticks.
 *
 * So: colours, radius and menu settings are free, but the two fonts are drawn
 * from a legible pool and forced to differ from each other. "Randomise within
 * the space of reasonable themes" is the useful behaviour, and it is a
 * one-line thing to defend.
 *
 * `rand` is injectable so the tests are deterministic.
 */

type Rand = () => number

const pick = <T>(xs: readonly T[], rand: Rand): T => xs[Math.floor(rand() * xs.length)]

/**
 * Headings can carry a display or condensed face, so they draw from the whole
 * curated list. Deliberately NOT all 1,955 families - uniform random over the
 * catalogue mostly yields faces nobody would choose.
 */
const HEADING_FONTS = BUNDLED_FAMILIES.map((f) => f.family)

/**
 * Body text draws from sans-serif and serif only. A display face like Bebas
 * Neue or a monospace face is fine for a heading and unreadable as a
 * paragraph, and Shuffle should not produce a store nobody could read.
 */
const BODY_FONTS = BUNDLED_FAMILIES.filter(
  (f) => f.category === 'sans-serif' || f.category === 'serif',
).map((f) => f.family)

/**
 * Base colours grouped by how they actually read.
 *
 * Drawing uniformly from all eight sounds fairer and looks broken: the five
 * neutral ramps are within 3 RGB points of each other at the page surface, so
 * five draws in eight produce the same grey store and the base control appears
 * to do nothing. Grouping makes Shuffle pick a *look* first and a ramp inside
 * it second, which is the same reasoning as the curated font pools - the point
 * of the button is to show the range, and a reviewer pressing it five times
 * should see four different stores.
 *
 * Exported so a test can assert it still covers BASE_COLORS exactly. This is
 * the one place a new swatch does NOT reach on its own, and a base colour
 * Shuffle can never produce would be invisible without that check.
 */
export const BASE_LOOKS: readonly (readonly BaseColor[])[] = [
  ['neutral', 'slate', 'gray', 'zinc', 'stone'],
  ['sand'],
  ['sage'],
  ['ice'],
]

export function shuffleTheme(current: Theme, rand: Rand = Math.random): Theme {
  const headingFont = pick(HEADING_FONTS, rand)

  // Two identical fonts is a wasted shuffle: the user sees one change, not two.
  // Drawing from the remaining families guarantees a difference in one step,
  // with no retry loop that could in principle spin.
  const bodyFont = pick(
    BODY_FONTS.filter((f) => f !== headingFont),
    rand,
  )

  const next: Theme = {
    baseColor: pick(pick(BASE_LOOKS, rand), rand),
    themeColor: pick(THEME_COLORS, rand),
    headingFont,
    bodyFont,
    radius: pick(RADII, rand),
    menuColor: pick(MENU_COLORS, rand),
    menuAccent: pick(MENU_ACCENTS, rand),
  }

  // A shuffle that changes nothing reads as a broken button. If we happen to
  // land on the current theme, nudge the one field that is most visible.
  if (shallowEqual(next, current)) {
    const others = THEME_COLORS.filter((c) => c !== current.themeColor)
    next.themeColor = pick(others, rand)
  }

  return next
}

function shallowEqual(a: Theme, b: Theme): boolean {
  return (Object.keys(a) as (keyof Theme)[]).every((k) => a[k] === b[k])
}
