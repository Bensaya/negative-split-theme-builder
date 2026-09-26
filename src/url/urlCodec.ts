import {
  BASE_COLORS,
  DEFAULT_THEME,
  MENU_ACCENTS,
  MENU_COLORS,
  RADII,
  THEME_COLORS,
  type Theme,
} from '@/theme/theme'

/**
 * The shareable URL, as a pure module.
 *
 * No React, no DOM, no network: strings in, objects out. That is what makes
 * the nasty cases cheap to test, and they are the interesting ones - a link
 * arrives truncated by a chat client, hand-edited, or written by an older
 * build, and the app must still render something sensible.
 *
 * Format, version 1:
 *
 *   ?v=1&base=slate&theme=rose&radius=large&menu=inverted&accent=bold
 *       &heading=Playfair%20Display&body=Inter
 *
 * Readable parameters rather than an encoded blob: a reviewer can understand
 * the link at a glance and hand-edit one field to test a specific case. It is
 * also shorter - base64url of the equivalent compact JSON measures 135
 * characters against 101 here, because base64 inflates by a third.
 */

export const SCHEMA_VERSION = 1

/** Longest acceptable font family name. Google's longest is well under this. */
const FONT_MAX_LENGTH = 64

/**
 * Letters, digits, spaces and a few punctuation marks that appear in real
 * family names ("Source Serif 4", "Yeseva One", "M PLUS 1p"). Unicode-aware,
 * so a non-Latin family name survives. Deliberately excludes control
 * characters and angle brackets: this string is interpolated into a stylesheet
 * URL, so it is untrusted input until proven otherwise.
 */
const FONT_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} '._+-]*$/u

export type DecodeOutcome =
  | { status: 'ok' }
  | { status: 'defaulted'; fields: string[] }
  | { status: 'unsupported-version'; found: string }

export interface DecodeResult {
  theme: Theme
  outcome: DecodeOutcome
  /**
   * Whether the caller should write a corrected URL back to the address bar.
   *
   * False for an unsupported version: leaving the original link intact keeps
   * it inspectable, which is the entire benefit of a readable format. Quietly
   * rewriting it destroys the evidence in the one case someone is debugging.
   */
  shouldRewriteUrl: boolean
}

const isFontName = (value: string): boolean =>
  value.length > 0 && value.length <= FONT_MAX_LENGTH && FONT_PATTERN.test(value)

/** Reads one enum field, recording the parameter name if it falls back. */
function readEnum<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
  defaulted: string[],
): T {
  const raw = params.get(key) // first occurrence wins
  if (raw === null) return fallback
  if ((allowed as readonly string[]).includes(raw)) return raw as T
  defaulted.push(key)
  return fallback
}

function readFont(
  params: URLSearchParams,
  key: string,
  fallback: string,
  defaulted: string[],
): string {
  const raw = params.get(key)
  if (raw === null) return fallback
  if (isFontName(raw)) return raw
  defaulted.push(key)
  return fallback
}

export function encode(theme: Theme): string {
  return new URLSearchParams({
    v: String(SCHEMA_VERSION),
    base: theme.baseColor,
    theme: theme.themeColor,
    radius: theme.radius,
    menu: theme.menuColor,
    accent: theme.menuAccent,
    heading: theme.headingFont,
    body: theme.bodyFont,
  }).toString()
}

export function decode(search: string): DecodeResult {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    // Touching every value forces any malformed percent-escape to surface here
    // rather than at an arbitrary later read.
    for (const _ of params.keys()) void _
  } catch {
    return { theme: DEFAULT_THEME, outcome: { status: 'ok' }, shouldRewriteUrl: false }
  }

  // A missing version means version 1. Hand-edited and shortened links are a
  // normal way to arrive here, and discarding a perfectly readable theme
  // because someone trimmed `v=1` would be hostile.
  const rawVersion = params.get('v')
  if (rawVersion !== null && rawVersion !== String(SCHEMA_VERSION)) {
    return {
      theme: DEFAULT_THEME,
      outcome: { status: 'unsupported-version', found: rawVersion },
      shouldRewriteUrl: false,
    }
  }

  const defaulted: string[] = []
  let theme: Theme
  try {
    theme = {
      baseColor: readEnum(params, 'base', BASE_COLORS, DEFAULT_THEME.baseColor, defaulted),
      themeColor: readEnum(params, 'theme', THEME_COLORS, DEFAULT_THEME.themeColor, defaulted),
      radius: readEnum(params, 'radius', RADII, DEFAULT_THEME.radius, defaulted),
      menuColor: readEnum(params, 'menu', MENU_COLORS, DEFAULT_THEME.menuColor, defaulted),
      menuAccent: readEnum(params, 'accent', MENU_ACCENTS, DEFAULT_THEME.menuAccent, defaulted),

      // Font names are NOT checked against the Google Fonts catalogue here.
      // decode() is synchronous and the catalogue is fetched over the network -
      // it may not have arrived, and may never arrive without an API key.
      // Validating eagerly would replace a shared link's typography with the
      // default for the moments before the response, and permanently on
      // failure: the link would appear to work and quietly be wrong. Only the
      // shape is checked; membership is resolved later, against a real catalogue.
      headingFont: readFont(params, 'heading', DEFAULT_THEME.headingFont, defaulted),
      bodyFont: readFont(params, 'body', DEFAULT_THEME.bodyFont, defaulted),
    }
  } catch {
    return { theme: DEFAULT_THEME, outcome: { status: 'ok' }, shouldRewriteUrl: false }
  }

  return {
    theme,
    outcome: defaulted.length ? { status: 'defaulted', fields: defaulted } : { status: 'ok' },
    shouldRewriteUrl: true,
  }
}

/** Every parameter this module owns, so stale ones can be cleared. */
const OWNED = ['v', 'base', 'theme', 'radius', 'menu', 'accent', 'heading', 'body'] as const

/**
 * Produces the full href for a theme, preserving everything this module does
 * not own: the pathname, the hash, and any unrelated query parameters such as
 * campaign tags.
 */
export function buildHref(theme: Theme, currentHref: string): string {
  const url = new URL(currentHref)
  for (const key of OWNED) url.searchParams.delete(key)

  const next = new URLSearchParams(encode(theme))
  for (const [key, value] of next) url.searchParams.append(key, value)

  return url.toString()
}
