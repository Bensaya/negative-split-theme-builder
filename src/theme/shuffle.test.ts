import { describe, expect, it } from 'vitest'
import { BASE_LOOKS, shuffleTheme } from './shuffle'
import { BASE_COLORS, DEFAULT_THEME, RADII, THEME_COLORS, type Theme } from './theme'
import { BUNDLED_FAMILIES } from '@/fonts/catalog'

const POOL = BUNDLED_FAMILIES.map((f) => f.family)
const READABLE = BUNDLED_FAMILIES.filter(
  (f) => f.category === 'sans-serif' || f.category === 'serif',
).map((f) => f.family)

/** A deterministic stand-in for Math.random that cycles a fixed sequence. */
const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('shuffleTheme', () => {
  it('only ever produces values from the option lists', () => {
    for (let i = 0; i < 200; i++) {
      const t = shuffleTheme(DEFAULT_THEME)
      expect(BASE_COLORS).toContain(t.baseColor)
      expect(THEME_COLORS).toContain(t.themeColor)
      expect(RADII).toContain(t.radius)
      expect(POOL).toContain(t.headingFont)
      expect(POOL).toContain(t.bodyFont)
    }
  })

  it('draws body fonts only from sans-serif and serif', () => {
    // A display or monospace face is fine as a heading and unreadable as a
    // paragraph, so Shuffle must not produce one for body text.
    for (let i = 0; i < 300; i++) {
      expect(READABLE).toContain(shuffleTheme(DEFAULT_THEME).bodyFont)
    }
  })

  it('still allows display faces as headings', () => {
    const headings = new Set<string>()
    for (let i = 0; i < 400; i++) headings.add(shuffleTheme(DEFAULT_THEME).headingFont)
    const display = BUNDLED_FAMILIES.filter((f) => f.category === 'display').map((f) => f.family)
    expect(display.some((f) => headings.has(f))).toBe(true)
  })

  it('never pairs a font with itself', () => {
    for (let i = 0; i < 300; i++) {
      const t = shuffleTheme(DEFAULT_THEME)
      expect(t.headingFont).not.toBe(t.bodyFont)
    }
  })

  it('always changes something - a no-op shuffle reads as a broken button', () => {
    for (let i = 0; i < 200; i++) {
      const t = shuffleTheme(DEFAULT_THEME)
      expect(t).not.toEqual(DEFAULT_THEME)
    }
  })

  it('nudges the theme colour when the draw lands on the current theme', () => {
    // rand() === 0 selects index 0 of every list, which is exactly DEFAULT_THEME
    // for the colour/radius fields - the degenerate case the guard exists for.
    const current: Theme = {
      ...DEFAULT_THEME,
      baseColor: BASE_COLORS[0],
      themeColor: THEME_COLORS[0],
      radius: RADII[0],
      menuColor: 'default',
      menuAccent: 'subtle',
      headingFont: POOL[0],
      bodyFont: POOL[1],
    }
    const t = shuffleTheme(current, seq(0))
    expect(t).not.toEqual(current)
    expect(t.themeColor).not.toBe(current.themeColor)
  })

  it('groups every base colour into exactly one look', () => {
    // Shuffle draws a look first and a ramp inside it second, so this is the
    // one list a new swatch does not widen by itself. A base colour missing
    // here is one Shuffle can never produce.
    const grouped = BASE_LOOKS.flat()
    expect([...grouped].sort()).toEqual([...BASE_COLORS].sort())
    expect(grouped).toHaveLength(new Set(grouped).size)
  })

  it('shows a different look most of the time, not the same grey store', () => {
    // Five of the eight base colours are near-identical neutrals. Drawn flat,
    // five shuffles in eight would look like the base never changed.
    let tinted = 0
    for (let i = 0; i < 2000; i++) {
      if (shuffleTheme(DEFAULT_THEME).baseColor !== 'neutral') tinted++
    }
    expect(tinted / 2000).toBeGreaterThan(0.9)
  })

  it('is deterministic for a given random source', () => {
    const a = shuffleTheme(DEFAULT_THEME, seq(0.1, 0.4, 0.7, 0.2, 0.9, 0.3, 0.6))
    const b = shuffleTheme(DEFAULT_THEME, seq(0.1, 0.4, 0.7, 0.2, 0.9, 0.3, 0.6))
    expect(a).toEqual(b)
  })
})
