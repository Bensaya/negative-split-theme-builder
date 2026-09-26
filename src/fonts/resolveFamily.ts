import type { FontFamily } from './catalog'

/**
 * Matches a requested font name against the catalogue.
 *
 * A URL can carry any string, and people type "inter" rather than "Inter". We
 * accept a case-insensitive match and correct it to the catalogue's own
 * spelling, because that spelling is what the CSS2 API expects.
 *
 * The check is deliberately against the catalogue and never against the
 * browser. Asking whether the browser can render a name would accept
 * "Helvetica Neue" or "Arial" on the machine that happens to have them
 * installed, so a shared link would look right for the sender and wrong for
 * everyone else. Only families we can actually fetch count.
 */

export interface ResolvedFamily {
  /** The catalogue's spelling when matched, otherwise the fallback. */
  family: string
  /** False when the request did not match anything we can load. */
  matched: boolean
  /** True when the only difference was capitalisation. */
  corrected: boolean
}

export function resolveFamily(
  requested: string,
  families: readonly FontFamily[],
  fallback: string,
): ResolvedFamily {
  const wanted = requested.trim().toLowerCase()
  if (!wanted) return { family: fallback, matched: false, corrected: false }

  const hit = families.find((f) => f.family.toLowerCase() === wanted)
  if (!hit) return { family: fallback, matched: false, corrected: false }

  return {
    family: hit.family,
    matched: true,
    corrected: hit.family !== requested,
  }
}
