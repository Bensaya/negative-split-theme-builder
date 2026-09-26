import type { FontFamily } from './catalog'
import { ensureFont } from './useGoogleFont'

/**
 * Loads the face used to render ONE ROW of the font picker.
 *
 * Deliberately a different mechanism from the storefront loader in
 * useGoogleFont.ts, and keeping them apart is the point. A cache keyed by
 * family alone would conflate two very different things: "I loaded the
 * 20-glyph subset containing this font's own name" and "I loaded the full
 * font". Select a previewed font and a family-keyed cache reports a hit,
 * leaving the storefront rendering with only the letters of that font's name.
 *
 * So the cache key is not the family - it is the family PLUS how it was
 * loaded. `menu:Inter` and `css2:Inter` are different entries, because they
 * register different faces under different names:
 *
 *   - An API family has a `menu` URL, registered through FontFace under an
 *     ALIAS ("Inter __menu"). We choose the name, so a collision is
 *     impossible by construction.
 *
 *   - A bundled family (the no-key path) has no menu URL and loads the FULL
 *     font through CSS2 under its real name. That is correct rather than
 *     merely safe: a full font under its real name is what the storefront
 *     wants too. Both callers share the full-font loader so a failed preview
 *     stylesheet cannot leave a second, broken face registered under that name.
 *
 * This matters during the catalogue handoff. The picker opens with bundled
 * families, the API answers a moment later, and the same family arrives again
 * with a menu URL and a different alias. Keying on family alone would report
 * the earlier `css2` load as satisfying the new `menu` request, and the row's
 * CSS would name an alias nothing had registered.
 */

export type PreviewMode = 'menu' | 'css2'
export type LoadStatus = 'pending' | 'loaded' | 'failed'

/** The family name a row should render with, for a given source. */
export const previewAlias = (family: string) => `${family} __menu`

export const previewMode = (font: FontFamily): PreviewMode => (font.menuUrl ? 'menu' : 'css2')

/** Cache identity: family plus loading mode plus the exact resource. */
export function previewKey(font: FontFamily): string {
  return `${previewMode(font)}:${font.family}:${font.menuUrl ?? ''}`
}

/** The face name the row's CSS references. Always matches what we register. */
export function previewFaceName(font: FontFamily): string {
  return font.menuUrl ? previewAlias(font.family) : font.family
}

interface Entry {
  status: LoadStatus
  promise: Promise<LoadStatus>
}

const entries = new Map<string, Entry>()

/** Test seam. */
export function __resetPreviewCache() {
  entries.clear()
}

export function previewStatus(font: FontFamily): LoadStatus | undefined {
  return entries.get(previewKey(font))?.status
}

/**
 * Ensures the preview face for `font` is available.
 *
 * Never rejects: a font that will not load is cosmetic, and the row falls back
 * to the stack. A failed attempt is evicted from the cache so selecting that
 * family again retries rather than being permanently marked broken.
 * Equivalent in-flight requests share one promise.
 */
export function ensurePreviewFont(font: FontFamily): Promise<LoadStatus> {
  const key = previewKey(font)
  const cached = entries.get(key)
  // A pending or successful entry is reused. A failed one is not: retrying is
  // the whole point of evicting it.
  if (cached && cached.status !== 'failed') return cached.promise

  const promise = (async (): Promise<LoadStatus> => {
    try {
      if (!font.menuUrl) return await ensureFont(font.family)

      const face = new FontFace(previewAlias(font.family), `url(${font.menuUrl})`, {
        display: 'swap',
      })
      await face.load()
      document.fonts.add(face)
      return 'loaded'
    } catch {
      return 'failed'
    }
  })().then((status) => {
    const entry = entries.get(key)
    if (entry) entry.status = status
    if (status === 'failed') entries.delete(key) // allow a later retry
    return status
  })

  entries.set(key, { status: 'pending', promise })
  return promise
}

/**
 * The CSS font stack for a picker row.
 *
 * The first family here is exactly the face `ensurePreviewFont` registers for
 * the same input, so the CSS can never name something that was never created.
 */
export function previewStack(font: FontFamily): string {
  const name = previewFaceName(font).replace(/["\\]/g, '')
  return `"${name}", ui-sans-serif, system-ui, sans-serif`
}
