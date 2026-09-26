import { describe, expect, it } from 'vitest'
import { BUNDLED_FAMILIES, type FontFamily } from './catalog'
import { resolveFamily } from './resolveFamily'

const catalogue: FontFamily[] = [
  { family: 'Inter', category: 'sans-serif' },
  { family: 'Playfair Display', category: 'serif' },
  { family: 'DM Sans', category: 'sans-serif' },
]

describe('resolveFamily', () => {
  it('accepts an exact match and leaves it alone', () => {
    expect(resolveFamily('Inter', catalogue, 'Inter Tight')).toEqual({
      family: 'Inter',
      matched: true,
      corrected: false,
    })
  })

  it('corrects capitalisation to the catalogue spelling', () => {
    // People type "inter"; the CSS2 API wants "Inter".
    const r = resolveFamily('inter', catalogue, 'Inter Tight')
    expect(r).toEqual({ family: 'Inter', matched: true, corrected: true })
  })

  it('corrects a multi-word family regardless of case', () => {
    expect(resolveFamily('playfair display', catalogue, 'Inter').family).toBe('Playfair Display')
  })

  it('ignores surrounding whitespace', () => {
    expect(resolveFamily('  DM Sans  ', catalogue, 'Inter').family).toBe('DM Sans')
  })

  it('falls back when the family is unknown', () => {
    expect(resolveFamily('Nonexistent Face', catalogue, 'Inter Tight')).toEqual({
      family: 'Inter Tight',
      matched: false,
      corrected: false,
    })
  })

  it('rejects a locally installed system font', () => {
    // The browser could render these; the catalogue cannot serve them. Accepting
    // one would make a shared link look right only on the sender's machine.
    for (const systemFont of ['Helvetica Neue', 'Arial', 'Segoe UI', 'Times New Roman']) {
      const r = resolveFamily(systemFont, catalogue, 'Inter')
      expect(r.matched, systemFont).toBe(false)
      expect(r.family, systemFont).toBe('Inter')
    }
  })

  it('rejects an empty request', () => {
    expect(resolveFamily('', catalogue, 'Inter').matched).toBe(false)
    expect(resolveFamily('   ', catalogue, 'Inter').matched).toBe(false)
  })

  it('applies the same rule to the bundled list when there is no API key', () => {
    expect(resolveFamily('lora', BUNDLED_FAMILIES, 'Inter').family).toBe('Lora')
    expect(resolveFamily('Some API Only Face', BUNDLED_FAMILIES, 'Inter').matched).toBe(false)
  })
})

describe('icon families are not offered', () => {
  it('excludes Material Icons and Material Symbols from the bundled list', () => {
    // They are glyph sets, not text faces: choosing one leaves the storefront
    // unreadable. toFamily() drops them from the API response for the same reason.
    const iconish = BUNDLED_FAMILIES.filter((f) => /^Material (Icons|Symbols)/.test(f.family))
    expect(iconish).toEqual([])
  })

  it('cannot be resolved even when asked for by name', () => {
    expect(resolveFamily('Material Icons', BUNDLED_FAMILIES, 'Inter').matched).toBe(false)
    expect(resolveFamily('Material Symbols Outlined', BUNDLED_FAMILIES, 'Inter').matched).toBe(false)
  })
})
