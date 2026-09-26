import { useEffect, useState } from 'react'
import { BUNDLED_FAMILIES, loadCatalog, type CatalogResult } from './catalog'

/**
 * Exposes the font catalogue to the UI.
 *
 * Catalogue availability is tracked separately from whether any given font
 * actually loaded - they are different failures with different consequences.
 * A catalogue failure means "you get 35 families instead of 1,955"; a font
 * failure means "this one row renders in the fallback face". Neither should
 * be reported as the other, and neither blocks the other: the CSS2 loader
 * needs no API key, so a font the user already asked for still loads
 * perfectly when the catalogue is unreachable.
 */
export function useFontCatalog(): CatalogResult & { loading: boolean } {
  const [result, setResult] = useState<CatalogResult>({
    families: BUNDLED_FAMILIES,
    source: 'bundled',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    loadCatalog(import.meta.env.VITE_GOOGLE_FONTS_API_KEY).then((r) => {
      if (!live) return
      setResult(r)
      setLoading(false)
    })
    return () => {
      live = false
    }
  }, [])

  return { ...result, loading }
}
