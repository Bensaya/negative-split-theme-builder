/**
 * WCAG 2.1 contrast, computed properly.
 *
 * The problem: Tailwind v4 (and therefore shadcn) expresses colours in oklch,
 * but WCAG defines contrast on *sRGB relative luminance*. oklch's L channel is
 * perceptual lightness, which is NOT the same quantity - using it as a shortcut
 * gives answers that are close enough to look right and wrong often enough to
 * ship unreadable text. So we do the real conversion:
 *
 *     oklch -> oklab -> LMS -> linear sRGB -> gamma-encoded sRGB
 *
 * and then apply the WCAG luminance and ratio formulas.
 *
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *            https://www.w3.org/TR/css-color-4/#ok-lab
 */

export type Rgb = [number, number, number]

/** WCAG AA minimums. Large text is >=18.66px bold or >=24px. */
export const AA_NORMAL = 4.5
export const AA_LARGE = 3

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/**
 * Parses `oklch(L C H)` where L is a percentage or a 0-1 number, and any
 * component may be the CSS keyword `none` (Tailwind emits `none` as the hue of
 * its achromatic grey ramps, e.g. `oklch(98.5% 0 none)`).
 */
function parseOklch(css: string): { l: number; c: number; h: number } {
  const m = /^\s*oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/)]+)/i.exec(css)
  if (!m) throw new Error(`not an oklch() colour: ${css}`)

  const num = (raw: string, asPercentOf = 1) => {
    if (raw.toLowerCase() === 'none') return 0
    if (raw.endsWith('%')) return (Number.parseFloat(raw) / 100) * asPercentOf
    const n = Number.parseFloat(raw)
    if (Number.isNaN(n)) throw new Error(`bad oklch component "${raw}" in ${css}`)
    return n
  }

  return { l: num(m[1]), c: num(m[2]), h: num(m[3]) }
}

/** oklch -> gamma-encoded sRGB, each channel clamped to [0,1]. */
export function oklchToSrgb(css: string): Rgb {
  const { l, c, h } = parseOklch(css)

  // oklch -> oklab (polar to cartesian)
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)

  // oklab -> LMS
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b
  const L = l_ * l_ * l_
  const M = m_ * m_ * m_
  const S = s_ * s_ * s_

  // LMS -> linear sRGB
  const lr = +4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S
  const lg = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S
  const lb = -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S

  // linear -> gamma-encoded sRGB
  const encode = (v: number) => {
    const x = clamp01(v)
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }

  return [clamp01(encode(lr)), clamp01(encode(lg)), clamp01(encode(lb))]
}

/** WCAG relative luminance of an oklch colour. White = 1, black = 0. */
export function relativeLuminance(css: string): number {
  const [r, g, b] = oklchToSrgb(css)
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio, 1:1 to 21:1. Symmetric in its arguments. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export function meetsAA(
  background: string,
  foreground: string,
  size: 'normal' | 'large' = 'normal',
): boolean {
  return contrastRatio(background, foreground) >= (size === 'large' ? AA_LARGE : AA_NORMAL)
}

/**
 * Picks whichever of two candidate foregrounds is more readable on `background`.
 *
 * This is what stops the user producing unreadable combinations: they choose a
 * theme colour, we choose the text that goes on top of it. Returning the higher
 * ratio unconditionally (rather than the first that passes AA) means that even
 * when neither candidate reaches 4.5:1, we still return the better of the two
 * instead of an arbitrary default.
 */
export function pickForeground(background: string, light: string, dark: string): string {
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light
}
