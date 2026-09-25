import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  meetsAA,
  oklchToSrgb,
  pickForeground,
  relativeLuminance,
} from './contrast'

/**
 * WCAG 2.1 contrast is defined on sRGB relative luminance, but our palette is
 * oklch (that is what Tailwind v4 ships). So the conversion has to be real,
 * not an approximation off oklch's L channel - these tests pin it to known
 * reference values.
 */

describe('oklchToSrgb', () => {
  it('converts pure white', () => {
    const [r, g, b] = oklchToSrgb('oklch(100% 0 0)')
    expect(r).toBeCloseTo(1, 3)
    expect(g).toBeCloseTo(1, 3)
    expect(b).toBeCloseTo(1, 3)
  })

  it('converts pure black', () => {
    expect(oklchToSrgb('oklch(0% 0 0)')).toEqual([0, 0, 0])
  })

  it('accepts a `none` hue, which is what Tailwind emits for grey ramps', () => {
    // oklch(98.5% 0 none) appears verbatim in the generated palette.
    const [r, g, b] = oklchToSrgb('oklch(98.5% 0 none)')
    expect(r).toBeCloseTo(g, 4)
    expect(g).toBeCloseTo(b, 4)
    expect(r).toBeGreaterThan(0.94)
  })

  it('accepts unitless lightness as well as percentages', () => {
    expect(oklchToSrgb('oklch(1 0 0)')).toEqual(oklchToSrgb('oklch(100% 0 0)'))
  })

  it('clamps out-of-gamut colours into sRGB rather than returning negatives', () => {
    const rgb = oklchToSrgb('oklch(76.8% 0.233 130.85)') // lime-500, vivid
    for (const c of rgb) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    }
  })

  it('throws on input that is not an oklch colour', () => {
    expect(() => oklchToSrgb('#ffffff')).toThrow()
  })
})

describe('relativeLuminance', () => {
  it('is 1 for white and 0 for black', () => {
    expect(relativeLuminance('oklch(100% 0 0)')).toBeCloseTo(1, 3)
    expect(relativeLuminance('oklch(0% 0 0)')).toBeCloseTo(0, 5)
  })
})

describe('contrastRatio', () => {
  it('is 21:1 for black on white, the WCAG maximum', () => {
    expect(contrastRatio('oklch(100% 0 0)', 'oklch(0% 0 0)')).toBeCloseTo(21, 1)
  })

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('oklch(55.6% 0 none)', 'oklch(55.6% 0 none)')).toBeCloseTo(1, 5)
  })

  it('is symmetric - order of arguments does not matter', () => {
    const a = 'oklch(76.8% 0.233 130.85)'
    const b = 'oklch(20.8% 0.042 265.755)'
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 6)
  })
})

describe('meetsAA', () => {
  it('accepts black on white', () => {
    expect(meetsAA('oklch(100% 0 0)', 'oklch(0% 0 0)')).toBe(true)
  })

  it('rejects a mid grey on white for body text', () => {
    // neutral-400 on white is ~2.9:1 - fine for large text, not for body.
    expect(meetsAA('oklch(100% 0 0)', 'oklch(70.8% 0 none)')).toBe(false)
  })

  it('applies the relaxed 3:1 threshold for large text', () => {
    expect(meetsAA('oklch(100% 0 0)', 'oklch(55.6% 0 none)', 'large')).toBe(true)
  })
})

describe('pickForeground', () => {
  const LIGHT = 'oklch(98.5% 0 none)'
  const DARK = 'oklch(14.5% 0 none)'

  it('puts dark text on a light background', () => {
    expect(pickForeground('oklch(98.4% 0.003 247.858)', LIGHT, DARK)).toBe(DARK)
  })

  it('puts light text on a dark background', () => {
    expect(pickForeground('oklch(20.8% 0.042 265.755)', LIGHT, DARK)).toBe(LIGHT)
  })

  it('picks the more readable option on a vivid mid-tone', () => {
    // lime-500 is bright: dark text reads better on it than white does.
    const chosen = pickForeground('oklch(76.8% 0.233 130.85)', LIGHT, DARK)
    expect(chosen).toBe(DARK)
    expect(contrastRatio('oklch(76.8% 0.233 130.85)', chosen)).toBeGreaterThan(4.5)
  })

  it('always returns whichever candidate has the higher ratio', () => {
    const bg = 'oklch(55.4% 0.046 257.417)' // slate-500, an awkward mid-tone
    const chosen = pickForeground(bg, LIGHT, DARK)
    const other = chosen === LIGHT ? DARK : LIGHT
    expect(contrastRatio(bg, chosen)).toBeGreaterThanOrEqual(contrastRatio(bg, other))
  })
})
