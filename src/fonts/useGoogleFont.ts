import { useEffect } from 'react'

/**
 * Loads a Google font for the storefront via the CSS2 API.
 *
 * Note this is the *storefront* loader: it fetches the real family at real
 * weights, under its real family name. The font picker will load a different,
 * much smaller thing (each family's `menu` subset, under an alias) so that a
 * previewed face can never be mistaken for a fully loaded one. Keeping the two
 * in separate namespaces is what stops the storefront rendering with only the
 * letters of a font's own name available.
 *
 * The CSS2 API needs no API key - only the *catalogue* does.
 */

const loaded = new Set<string>()

function ensureLink(family: string) {
  if (!family || loaded.has(family)) return
  loaded.add(family)

  const href =
    'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(family).replace(/%20/g, '+') +
    ':wght@400;500;600;700&display=swap'

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.googleFont = family
  document.head.appendChild(link)
}

/** Loads each family once. Safe to call with the same names repeatedly. */
export function useGoogleFonts(...families: string[]) {
  const key = families.join('|')
  useEffect(() => {
    for (const f of families) ensureLink(f)
    // `key` captures the families; spreading them would change identity each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** Families offered until the full Google Fonts catalogue lands. */
export const STARTER_FONTS = [
  'Inter Tight',
  'Inter',
  'Archivo',
  'Bricolage Grotesque',
  'DM Sans',
  'Fraunces',
  'IBM Plex Sans',
  'Lora',
  'Manrope',
  'Newsreader',
  'Oswald',
  'Outfit',
  'Playfair Display',
  'Source Serif 4',
  'Space Grotesk',
  'Work Sans',
] as const
