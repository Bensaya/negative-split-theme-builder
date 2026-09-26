import { describe, expect, it } from 'vitest'
import { AA_LARGE, AA_NORMAL, contrastRatio } from './contrast'
import { PALETTE } from './palette'
import { resolveTokens } from './tokens'
import {
  BASE_COLORS,
  DEFAULT_THEME,
  MENU_ACCENTS,
  MENU_COLORS,
  RADII,
  RADIUS_REM,
  THEME_COLORS,
  type Theme,
} from './theme'

const withTheme = (patch: Partial<Theme>): Theme => ({ ...DEFAULT_THEME, ...patch })

describe('resolveTokens', () => {
  it('produces every token the preview relies on', () => {
    const t = resolveTokens(DEFAULT_THEME)
    for (const key of [
      '--background', '--foreground', '--card', '--card-foreground',
      '--popover', '--popover-foreground', '--primary', '--primary-foreground',
      '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
      '--accent', '--accent-foreground', '--border', '--input', '--ring',
      '--radius', '--font-sans', '--font-heading',
      '--menu', '--menu-foreground', '--menu-accent', '--menu-accent-foreground',
    ]) {
      expect(t[key], `missing ${key}`).toBeTruthy()
    }
  })

  it('never emits a :root selector - tokens are for a wrapper element only', () => {
    // resolveTokens returns a plain style object; the caller spreads it onto a
    // div. This test documents the contract rather than exercising the DOM.
    const t = resolveTokens(DEFAULT_THEME)
    expect(Object.keys(t).every((k) => k.startsWith('--'))).toBe(true)
  })

  describe('the two colour controls are genuinely independent', () => {
    it('changing base colour moves the neutrals but not the primary', () => {
      const a = resolveTokens(withTheme({ baseColor: 'neutral' }))
      const b = resolveTokens(withTheme({ baseColor: 'slate' }))
      expect(a['--muted']).not.toBe(b['--muted'])
      expect(a['--border']).not.toBe(b['--border'])
      expect(a['--primary']).toBe(b['--primary'])
    })

    it('changing theme colour moves the primary but not the neutrals', () => {
      const a = resolveTokens(withTheme({ themeColor: 'lime' }))
      const b = resolveTokens(withTheme({ themeColor: 'blue' }))
      expect(a['--primary']).not.toBe(b['--primary'])
      expect(a['--muted']).toBe(b['--muted'])
      expect(a['--background']).toBe(b['--background'])
    })
  })

  describe('readability is guaranteed, not hoped for', () => {
    it('gives readable text on the primary for every base x theme combination', () => {
      const failures: string[] = []
      for (const baseColor of BASE_COLORS) {
        for (const themeColor of THEME_COLORS) {
          const t = resolveTokens(withTheme({ baseColor, themeColor }))
          const ratio = contrastRatio(t['--primary'], t['--primary-foreground'])
          if (ratio < AA_NORMAL) {
            failures.push(`${baseColor}/${themeColor} = ${ratio.toFixed(2)}:1`)
          }
        }
      }
      expect(failures, `${failures.length} of 60 combinations fail AA`).toEqual([])
    })

    it('keeps body text on the background well clear of AA', () => {
      for (const baseColor of BASE_COLORS) {
        const t = resolveTokens(withTheme({ baseColor }))
        expect(contrastRatio(t['--background'], t['--foreground'])).toBeGreaterThan(12)
      }
    })

    it('keeps muted text legible on the background', () => {
      for (const baseColor of BASE_COLORS) {
        const t = resolveTokens(withTheme({ baseColor }))
        expect(contrastRatio(t['--background'], t['--muted-foreground'])).toBeGreaterThanOrEqual(
          AA_NORMAL,
        )
      }
    })

    it('gives readable nav text for both menu colours, on every base', () => {
      for (const baseColor of BASE_COLORS) {
        for (const menuColor of ['default', 'inverted'] as const) {
          const t = resolveTokens(withTheme({ baseColor, menuColor }))
          expect(
            contrastRatio(t['--menu'], t['--menu-foreground']),
            `${baseColor}/${menuColor}`,
          ).toBeGreaterThan(AA_NORMAL)
        }
      }
    })

    it('keeps text on the menu accent readable - the bag badge', () => {
      // The bag count is --menu-accent-foreground on --menu-accent. Reported
      // broken for Neutral + Indigo + Bold, so this walks the whole finite
      // space rather than spot-checking.
      const failures: string[] = []
      for (const baseColor of BASE_COLORS) {
        for (const themeColor of THEME_COLORS) {
          for (const menuColor of MENU_COLORS) {
            for (const menuAccent of MENU_ACCENTS) {
              const t = resolveTokens(withTheme({ baseColor, themeColor, menuColor, menuAccent }))
              const ratio = contrastRatio(t['--menu-accent'], t['--menu-accent-foreground'])
              if (ratio < AA_NORMAL) {
                failures.push(
                  `${baseColor}/${themeColor}/${menuColor}/${menuAccent} = ${ratio.toFixed(2)}:1`,
                )
              }
            }
          }
        }
      }
      expect(failures.slice(0, 8), `${failures.length} combinations fail`).toEqual([])
    })

    it('keeps the menu accent visible against the menu surface', () => {
      for (const baseColor of BASE_COLORS) {
        for (const menuColor of ['default', 'inverted'] as const) {
          for (const menuAccent of ['subtle', 'bold'] as const) {
            const t = resolveTokens(withTheme({ baseColor, menuAccent, menuColor }))
            expect(
              contrastRatio(t['--menu'], t['--menu-accent']),
              `${baseColor}/${menuColor}/${menuAccent}`,
            ).toBeGreaterThanOrEqual(AA_LARGE)
          }
        }
      }
    })
  })

  describe('menu controls', () => {
    it('inverted swaps the menu surface and the page surface', () => {
      const def = resolveTokens(withTheme({ menuColor: 'default' }))
      const inv = resolveTokens(withTheme({ menuColor: 'inverted' }))
      expect(def['--menu']).toBe(def['--background'])
      expect(inv['--menu']).not.toBe(inv['--background'])
      expect(contrastRatio(def['--menu'], inv['--menu'])).toBeGreaterThan(12)
    })

    it('bold draws the accent from the theme ramp, subtle from the base ramp', () => {
      const theme = withTheme({ themeColor: 'lime', baseColor: 'neutral' })
      const bold = resolveTokens({ ...theme, menuAccent: 'bold' })
      const subtle = resolveTokens({ ...theme, menuAccent: 'subtle' })

      const inRamp = (name: 'lime' | 'neutral', value: string) =>
        Object.values(PALETTE[name]).includes(value as never)

      expect(inRamp('lime', bold['--menu-accent'])).toBe(true)
      expect(inRamp('neutral', subtle['--menu-accent'])).toBe(true)
      expect(bold['--menu-accent']).not.toBe(subtle['--menu-accent'])
    })

    it('picks the accent against the menu surface, not the page', () => {
      // The bug this guards: using --primary directly put a bright lime
      // underline on a white nav at 1.96:1. A dark nav and a white nav must
      // therefore get different steps of the same ramp.
      const theme = withTheme({ themeColor: 'lime', menuAccent: 'bold' })
      const onDark = resolveTokens({ ...theme, menuColor: 'inverted' })
      const onLight = resolveTokens({ ...theme, menuColor: 'default' })
      expect(onDark['--menu-accent']).not.toBe(onLight['--menu-accent'])
    })
  })

  describe('radius', () => {
    it('maps every option to a concrete length', () => {
      for (const radius of RADII) {
        expect(resolveTokens(withTheme({ radius }))['--radius']).toBe(RADIUS_REM[radius])
      }
    })

    it('maps None to a real zero so shadcn calc() derivations collapse', () => {
      expect(resolveTokens(withTheme({ radius: 'none' }))['--radius']).toBe('0rem')
    })
  })

  describe('fonts', () => {
    it('quotes family names so multi-word families survive', () => {
      const t = resolveTokens(withTheme({ headingFont: 'Playfair Display', bodyFont: 'DM Sans' }))
      expect(t['--font-heading']).toContain('"Playfair Display"')
      expect(t['--font-sans']).toContain('"DM Sans"')
    })

    it('always appends a real fallback stack, so a failed font load is invisible', () => {
      const t = resolveTokens(withTheme({ headingFont: 'Nonexistent Face' }))
      expect(t['--font-heading']).toMatch(/,\s*ui-sans-serif/)
    })

    it('keeps heading and body independent', () => {
      const t = resolveTokens(withTheme({ headingFont: 'Oswald', bodyFont: 'Lora' }))
      expect(t['--font-heading']).toContain('Oswald')
      expect(t['--font-heading']).not.toContain('Lora')
      expect(t['--font-sans']).toContain('Lora')
      expect(t['--font-sans']).not.toContain('Oswald')
    })

    it('escapes a quote in a family name rather than breaking the CSS value', () => {
      const t = resolveTokens(withTheme({ bodyFont: 'Bad"Name' }))
      expect(t['--font-sans']).not.toContain('"Bad"Name"')
    })
  })
})
