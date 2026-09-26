import type { FontFamily } from './catalog'

/**
 * Loads the face used to render ONE ROW of the font picker.
 *
 * This is deliberately a different mechanism from the storefront loader in
 * useGoogleFont.ts, and keeping them apart is the point.
 *
 * Caching "by family" would conflate two very different things: "I loaded the
 * 20-glyph subset containing this font's own name" and "I loaded the full
 * font". Select a font you had previewed, and a family-keyed cache would
 * report a hit - leaving the storefront rendering with only the letters of
 * that font's name available. Every other character would fall back.
 *
 * So previews live in their own namespace:
 *
 *   - API families have a `menu` URL - a file holding exactly the glyphs of
 *     the family name. We register it through FontFace under an ALIAS, which
 *     means we choose the name and a collision is impossible by construction.
 *     Those URLs are versioned and immutable (max-age=31536000), so each
 *     family is fetched at most once, ever, across sessions.
 *
 *   - Bundled families (the no-API-key path) have no menu URL. They load the
 *     FULL font through CSS2 under their real name. That is correct rather
 *     than merely safe: a fully loaded font under its real name is exactly
 *     what the storefront wants too, so there is nothing to collide. The
 *     bundled list is ~35 families, so the cost is bounded.
 */

/** The family name a preview row should render with. */
export const previewAlias = (family: string) => `${family} __menu`

type Status = 'loading' | 'loaded' | 'failed'

/** family -> in-flight or settled load. Dedupes concurrent scroll requests. */
const loads = new Map<string, Promise<Status>>()
const settled = new Map<string, Status>()

/** Test seam. */
export function __resetPreviewCache() {
  loads.clear()
  settled.clear()
}

export const previewStatus = (family: string): Status | undefined => settled.get(family)

function loadBundledViaCss2(family: string): Promise<Status> {
  const id = `preview-css2-${family}`
  if (document.getElementById(id)) return Promise.resolve<Status>('loaded')

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(family).replace(/%20/g, '+') +
    '&display=swap'
  document.head.appendChild(link)

  return new Promise<Status>((resolve) => {
    link.addEventListener('load', () => resolve('loaded'), { once: true })
    link.addEventListener('error', () => resolve('failed'), { once: true })
  })
}

/**
 * Ensures the preview face for `font` is available.
 *
 * Never rejects: a font that will not load is a cosmetic problem, and the row
 * simply renders in the fallback stack.
 */
export function ensurePreviewFont(font: FontFamily): Promise<Status> {
  const existing = loads.get(font.family)
  if (existing) return existing

  const task = (async (): Promise<Status> => {
    try {
      if (!font.menuUrl) return await loadBundledViaCss2(font.family)

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
    settled.set(font.family, status)
    return status
  })

  loads.set(font.family, task)
  return task
}

/**
 * The CSS font stack for a picker row.
 *
 * Bundled families render under their real name; API families under the
 * alias. Either way there is a real fallback behind it, so a row is legible
 * before - or instead of - its own face arriving.
 */
export function previewStack(font: FontFamily): string {
  const name = font.menuUrl ? previewAlias(font.family) : font.family
  return `"${name.replace(/["\\]/g, '')}", ui-sans-serif, system-ui, sans-serif`
}
