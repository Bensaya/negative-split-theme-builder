import { describe, expect, it } from 'vitest'
import { shuffleTheme } from './shuffle'
import { BASE_COLORS, DEFAULT_THEME, RADII, THEME_COLORS, type Theme } from './theme'
import { STARTER_FONTS } from '@/fonts/useGoogleFont'

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
      expect(STARTER_FONTS).toContain(t.headingFont as (typeof STARTER_FONTS)[number])
      expect(STARTER_FONTS).toContain(t.bodyFont as (typeof STARTER_FONTS)[number])
    }
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
      headingFont: STARTER_FONTS[0],
      bodyFont: STARTER_FONTS[1],
    }
    const t = shuffleTheme(current, seq(0))
    expect(t).not.toEqual(current)
    expect(t.themeColor).not.toBe(current.themeColor)
  })

  it('is deterministic for a given random source', () => {
    const a = shuffleTheme(DEFAULT_THEME, seq(0.1, 0.4, 0.7, 0.2, 0.9, 0.3, 0.6))
    const b = shuffleTheme(DEFAULT_THEME, seq(0.1, 0.4, 0.7, 0.2, 0.9, 0.3, 0.6))
    expect(a).toEqual(b)
  })
})
