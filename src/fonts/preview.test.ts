import { describe, expect, it } from 'vitest'
import type { FontFamily } from './catalog'
import { previewFaceName, previewKey, previewMode, previewStack } from './preview'

/**
 * Regression coverage for the catalogue handoff.
 *
 * The picker opens with bundled families, the API answers a moment later, and
 * the SAME family arrives again - now with a menu URL and a different face
 * name. A cache keyed on family alone reports the earlier CSS2 load as
 * satisfying the new menu request, and the row's CSS then names an alias that
 * nothing ever registered.
 */

const bundled: FontFamily = { family: 'Inter', category: 'sans-serif' }
const fromApi: FontFamily = {
  family: 'Inter',
  category: 'sans-serif',
  menuUrl: 'https://fonts.gstatic.com/s/inter/v20/abc.ttf',
}

describe('preview cache identity', () => {
  it('distinguishes the same family loaded by different mechanisms', () => {
    expect(previewMode(bundled)).toBe('css2')
    expect(previewMode(fromApi)).toBe('menu')
    expect(previewKey(bundled)).not.toBe(previewKey(fromApi))
  })

  it('does not let a full-name load satisfy a request for a preview alias', () => {
    // The bug: both entries collapse to "Inter", so the API request is
    // considered already satisfied and the alias face is never registered.
    expect(previewFaceName(bundled)).toBe('Inter')
    expect(previewFaceName(fromApi)).toBe('Inter __menu')
    expect(previewFaceName(bundled)).not.toBe(previewFaceName(fromApi))
  })

  it('treats a changed menu URL as a different resource', () => {
    const rehosted: FontFamily = {
      ...fromApi,
      menuUrl: 'https://fonts.gstatic.com/s/inter/v21/xyz.ttf',
    }
    expect(previewKey(rehosted)).not.toBe(previewKey(fromApi))
  })

  it('is stable for identical input, so repeats share one cache entry', () => {
    expect(previewKey({ ...fromApi })).toBe(previewKey(fromApi))
  })
})

describe('previewStack', () => {
  it('names exactly the face that will be registered', () => {
    // This is the invariant that keeps CSS and registration in step: the first
    // family in the stack is always previewFaceName() for the same input.
    for (const font of [bundled, fromApi]) {
      const first = previewStack(font).split(',')[0].replace(/"/g, '').trim()
      expect(first).toBe(previewFaceName(font))
    }
  })

  it('always keeps a real fallback behind the preview face', () => {
    expect(previewStack(bundled)).toMatch(/,\s*ui-sans-serif/)
  })

  it('strips quotes so a hostile family name cannot break out of the CSS value', () => {
    const nasty: FontFamily = { family: 'Bad"Name', category: 'serif' }
    expect(previewStack(nasty)).not.toContain('"Bad"Name"')
  })
})
