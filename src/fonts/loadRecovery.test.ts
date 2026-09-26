// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetFontCache, ensureFont } from './useGoogleFont'

/**
 * Recovery behaviour for storefront font loading.
 *
 * Three things must hold, and a naive implementation gets all three wrong:
 *
 *   1. A started request is not a loaded font. The stylesheet <link> firing
 *      `load` only proves the CSS arrived.
 *   2. A failure must be evicted, so choosing the same family again retries
 *      rather than being permanently marked broken.
 *   3. Equivalent in-flight requests share one attempt.
 */

/** Drives the injected <link> by firing whichever event the test wants. */
function withLinkOutcome(outcome: 'load' | 'error') {
  const original = document.head.appendChild.bind(document.head)
  return vi.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
    const result = original(node)
    if (node instanceof HTMLLinkElement) {
      queueMicrotask(() => node.dispatchEvent(new Event(outcome)))
    }
    return result
  }) as typeof document.head.appendChild)
}

let fontsLoad: ReturnType<typeof vi.fn>

beforeEach(() => {
  __resetFontCache()
  document.head.innerHTML = ''
  fontsLoad = vi.fn(async () => [{}]) // by default the face resolves
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { load: fontsLoad, add: vi.fn() },
  })
})

afterEach(() => vi.restoreAllMocks())

describe('ensureFont', () => {
  it('reports loaded only once the face itself resolves', async () => {
    const spy = withLinkOutcome('load')
    await expect(ensureFont('Inter')).resolves.toBe('loaded')
    expect(fontsLoad).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it('does not call a stylesheet load a successful font load', async () => {
    // The CSS arrives but the font file does not: document.fonts.load()
    // resolves with no matching faces. That is a failure, not a success.
    fontsLoad.mockResolvedValue([])
    const spy = withLinkOutcome('load')
    await expect(ensureFont('Ghost Family')).resolves.toBe('failed')
    spy.mockRestore()
  })

  it('reports failed when the stylesheet itself errors', async () => {
    const spy = withLinkOutcome('error')
    await expect(ensureFont('Blocked')).resolves.toBe('failed')
    spy.mockRestore()
  })

  it('removes the failed stylesheet so a retry is not short-circuited', async () => {
    const spy = withLinkOutcome('error')
    await ensureFont('Blocked')
    expect(document.getElementById('storefront-font-Blocked')).toBeNull()
    spy.mockRestore()
  })

  it('retries after a failure instead of staying permanently broken', async () => {
    // Block it.
    let spy = withLinkOutcome('error')
    await expect(ensureFont('Recoverable')).resolves.toBe('failed')
    spy.mockRestore()

    // Allow requests again and reselect the same family.
    spy = withLinkOutcome('load')
    await expect(ensureFont('Recoverable')).resolves.toBe('loaded')
    spy.mockRestore()
  })

  it('reuses a successful result rather than re-requesting', async () => {
    const spy = withLinkOutcome('load')
    await ensureFont('Cached')
    const first = document.querySelectorAll('link[data-google-font]').length
    await ensureFont('Cached')
    expect(document.querySelectorAll('link[data-google-font]').length).toBe(first)
    spy.mockRestore()
  })

  it('deduplicates equivalent in-flight requests into one attempt', async () => {
    const spy = withLinkOutcome('load')
    const results = await Promise.all([
      ensureFont('Concurrent'),
      ensureFont('Concurrent'),
      ensureFont('Concurrent'),
    ])
    expect(results).toEqual(['loaded', 'loaded', 'loaded'])
    expect(document.querySelectorAll('link[data-google-font="Concurrent"]').length).toBe(1)
    spy.mockRestore()
  })

  it('treats an empty family as a failure rather than injecting a bare request', async () => {
    await expect(ensureFont('')).resolves.toBe('failed')
    expect(document.querySelectorAll('link[data-google-font]').length).toBe(0)
  })
})
