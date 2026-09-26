import { useEffect, useRef, useState } from 'react'

/**
 * Loads storefront fonts, and reports honestly whether they arrived.
 *
 * This is the *storefront* loader: it fetches the real family at real weights
 * under its real family name. The picker loads something else entirely (a
 * name-only subset under an alias), and preview.ts keeps those in a separate
 * cache namespace so one can never be mistaken for the other.
 *
 * The CSS2 API needs no API key. Only the *catalogue* does. So a catalogue
 * failure never prevents a requested font from loading.
 *
 * Three things this gets right that a naive version does not:
 *
 *   1. A started request is not a loaded font. The stylesheet <link> firing
 *      `load` only proves the CSS arrived; the font file is fetched lazily
 *      afterwards. We wait for document.fonts.load() to settle.
 *   2. A failure is evicted, so selecting the same family again retries
 *      instead of being permanently marked broken.
 *   3. A stale completion cannot overwrite a newer selection's status.
 */

export type FontStatus = 'pending' | 'loaded' | 'failed'

interface Entry {
  status: FontStatus
  promise: Promise<FontStatus>
}

const cache = new Map<string, Entry>()

/** Test seam. */
export function __resetFontCache() {
  cache.clear()
}

const bare = (family: string) => family.replace(/["\\]/g, '')

function css2Href(family: string): string {
  return (
    'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(family).replace(/%20/g, '+') +
    ':wght@400;500;600;700&display=swap'
  )
}

function startLoad(family: string): Promise<FontStatus> {
  const id = `storefront-font-${family}`
  document.getElementById(id)?.remove() // clear a previous failed attempt

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = css2Href(family)
  link.dataset.googleFont = family
  document.head.appendChild(link)

  return new Promise<FontStatus>((resolve) => {
    link.addEventListener(
      'load',
      () => {
        // The stylesheet is here; the font file may not be. document.fonts
        // .load() resolves once the face is actually usable, or with an empty
        // list when nothing matched.
        document.fonts
          .load(`400 16px "${bare(family)}"`)
          .then((faces) => resolve(faces.length > 0 ? 'loaded' : 'failed'))
          .catch(() => resolve('failed'))
      },
      { once: true },
    )
    link.addEventListener(
      'error',
      () => {
        link.remove()
        resolve('failed')
      },
      { once: true },
    )
  })
}

/** Ensures a family is loaded. Dedupes in-flight requests; retries failures. */
export function ensureFont(family: string): Promise<FontStatus> {
  if (!family) return Promise.resolve<FontStatus>('failed')

  const cached = cache.get(family)
  if (cached && cached.status !== 'failed') return cached.promise

  const promise = startLoad(family).then((status) => {
    const entry = cache.get(family)
    if (entry) entry.status = status
    if (status === 'failed') cache.delete(family)
    return status
  })

  cache.set(family, { status: 'pending', promise })
  return promise
}

/**
 * Loads the given families and reports each one's status.
 *
 * The requested family stays in theme state and in the URL regardless: a font
 * that will not load is a rendering problem, not a reason to silently rewrite
 * what the user asked for.
 */
export function useGoogleFonts(...families: (string | undefined)[]): Record<string, FontStatus> {
  const key = families.filter(Boolean).join('|')
  const [statuses, setStatuses] = useState<Record<string, FontStatus>>({})

  // Identifies the newest request, so a slow earlier one cannot report over it.
  const generation = useRef(0)

  useEffect(() => {
    const current = ++generation.current
    const wanted = key ? key.split('|') : []
    if (wanted.length === 0) return

    setStatuses((prev) => {
      const next = { ...prev }
      for (const f of wanted) next[f] ??= 'pending'
      return next
    })

    for (const family of wanted) {
      void ensureFont(family).then((status) => {
        // A completion from a superseded selection is discarded rather than
        // flipping the status of whatever the user has chosen since.
        if (generation.current !== current) return
        setStatuses((prev) => (prev[family] === status ? prev : { ...prev, [family]: status }))
      })
    }
  }, [key])

  return statuses
}
