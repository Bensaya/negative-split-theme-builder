import { useCallback, useEffect, useRef, useState } from 'react'
import { buildHref, decode, encode, type DecodeOutcome } from './urlCodec'
import type { Theme } from '@/theme/theme'

/**
 * Binds the editable theme to the address bar.
 *
 * The rules, in one place:
 *
 *   - React owns the theme. The URL is a projection of it.
 *   - Every edit goes through applyTheme(), which is the ONLY thing that
 *     writes the URL. There is no second effect watching `theme` and writing
 *     it again; one mechanism, so writes cannot race or double up.
 *   - Writes are immediate replaceState. Every control is a discrete
 *     selection, so there is nothing for a debounce to coalesce, and a
 *     debounce would introduce stale writes and cancellation for no benefit.
 *   - Back/Forward updates React state and does NOT write the URL back.
 *
 * The flow is acyclic, which is only possible because pushState and
 * replaceState do not fire popstate. A write can therefore never trigger a
 * read, so no guard flags are needed.
 *
 * Nothing is rewritten on load. A link someone sent stays exactly as they sent
 * it until the first edit, which keeps a malformed or unsupported link
 * inspectable instead of destroying the evidence.
 */

export interface ThemeUrl {
  theme: Theme
  applyTheme: (next: Theme) => void
  /**
   * Derives the next theme from the LATEST one and applies it.
   *
   * Not a React state updater - it runs exactly once, reads the current theme
   * from a ref, and hands applyTheme a finished value. That keeps state
   * updaters pure (nothing random or side-effecting runs inside one) while
   * still composing against current data rather than a closed-over snapshot.
   */
  updateTheme: (derive: (current: Theme) => Theme) => void
  /** How the incoming link was interpreted. Surfaced once, then dismissible. */
  arrival: DecodeOutcome
  dismissArrival: () => void
  /** Current shareable link, built from state rather than read from the bar. */
  shareHref: () => string
}

export function useThemeUrl(fallback: Theme): ThemeUrl {
  // Initialised from the URL before the first render, so the preview never
  // flashes the default theme before settling on the shared one.
  const [initial] = useState(() =>
    typeof window === 'undefined'
      ? { theme: fallback, outcome: { status: 'ok' } as DecodeOutcome }
      : decode(window.location.search),
  )

  const [theme, setTheme] = useState<Theme>(initial.theme)
  const [arrival, setArrival] = useState<DecodeOutcome>(initial.outcome)

  /**
   * Always holds the newest theme, including within a single tick.
   *
   * Without this, two edits dispatched before React re-renders both compose
   * against the same stale `theme` and the second silently discards the
   * first. Observed: five rapid swatch clicks kept only the last one.
   */
  const themeRef = useRef<Theme>(initial.theme)

  const applyTheme = useCallback((next: Theme) => {
    themeRef.current = next
    setTheme(next)
    // Preserves pathname, hash and unrelated parameters, and keeps whatever
    // the app had put in history.state.
    window.history.replaceState(
      window.history.state,
      '',
      buildHref(next, window.location.href),
    )
  }, [])

  const updateTheme = useCallback(
    (derive: (current: Theme) => Theme) => applyTheme(derive(themeRef.current)),
    [applyTheme],
  )

  useEffect(() => {
    const onPopState = () => {
      // Read only. Rewriting here would turn navigation into a write and
      // reintroduce the cycle this design exists to avoid.
      const next = decode(window.location.search).theme
      themeRef.current = next
      setTheme(next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const shareHref = useCallback(() => {
    // Read through the ref for the same reason: a link copied immediately
    // after an edit must carry that edit.
    const current = themeRef.current
    // Built from current state, never from location.search. Reading the
    // address bar would risk handing out a link to a theme that is one write
    // behind.
    return typeof window === 'undefined'
      ? `?${encode(current)}`
      : buildHref(current, window.location.href)
  }, [])

  const dismissArrival = useCallback(() => setArrival({ status: 'ok' }), [])

  return { theme, applyTheme, updateTheme, arrival, dismissArrival, shareHref }
}
