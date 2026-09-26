// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flush, renderHook } from '@/test/renderHook'
import { __resetFontCache, useGoogleFonts } from './useGoogleFont'
import { __resetPreviewCache, ensurePreviewFont } from './preview'

/**
 * The retry path, exercised through the hook rather than through ensureFont.
 *
 * Calling ensureFont twice would always "pass" - it is the *hook* that was
 * broken. Re-picking the family that is already selected changes no theme
 * value, so nothing the effect watches changes and the loader never re-ran,
 * while the UI told the user to "pick it again to retry".
 */

/** Controls whether the injected stylesheet succeeds or fails. */
let outcome: 'load' | 'error' = 'load'
let attempts = 0

function installLinkDriver() {
  const original = document.head.appendChild.bind(document.head)
  vi.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
    const result = original(node)
    if (node instanceof HTMLLinkElement && node.dataset.googleFont) {
      attempts++
      queueMicrotask(() => node.dispatchEvent(new Event(outcome)))
    }
    return result
  }) as typeof document.head.appendChild)
}

beforeEach(() => {
  __resetFontCache()
  __resetPreviewCache()
  document.head.innerHTML = ''
  attempts = 0
  outcome = 'load'
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { load: vi.fn(async () => [{}]), add: vi.fn() },
  })
  installLinkDriver()
})

afterEach(() => vi.restoreAllMocks())

describe('useGoogleFonts', () => {
  it('reports pending before anything has settled, never undefined', async () => {
    outcome = 'error'
    const hook = await renderHook(() => useGoogleFonts('Inter'))
    // Derived during render rather than written by the effect.
    expect(['pending', 'failed']).toContain(hook.current().status.Inter)
    hook.unmount()
  })

  it('reports failed when the request fails', async () => {
    outcome = 'error'
    const hook = await renderHook(() => useGoogleFonts('Blocked'))
    await hook.act(flush)
    expect(hook.current().status.Blocked).toBe('failed')
    hook.unmount()
  })

  it('retries the SAME family and clears the error once it loads', async () => {
    // Block it.
    outcome = 'error'
    const hook = await renderHook(() => useGoogleFonts('Recoverable'))
    await hook.act(flush)
    expect(hook.current().status.Recoverable).toBe('failed')
    const afterFirst = attempts

    // Unblock, then ask for the same family again - exactly what re-picking
    // the already-selected font does.
    outcome = 'load'
    await hook.act(async () => {
      hook.current().retry('Recoverable')
      await flush()
    })

    expect(attempts).toBeGreaterThan(afterFirst) // a genuinely new attempt
    expect(hook.current().status.Recoverable).toBe('loaded') // error cleared
    hook.unmount()
  })

  it('still fails when retried while the font is still unavailable', async () => {
    outcome = 'error'
    const hook = await renderHook(() => useGoogleFonts('StillBlocked'))
    await hook.act(flush)
    await hook.act(async () => {
      hook.current().retry('StillBlocked')
      await flush()
    })
    expect(hook.current().status.StillBlocked).toBe('failed')
    hook.unmount()
  })

  it('does not re-request a family that already loaded', async () => {
    const hook = await renderHook(() => useGoogleFonts('Cached'))
    await hook.act(flush)
    expect(hook.current().status.Cached).toBe('loaded')
    const afterFirst = attempts

    await hook.act(async () => {
      hook.current().retry('Cached')
      await flush()
    })
    // ensureFont keeps successful entries, so this is deduplicated.
    expect(attempts).toBe(afterFirst)
    hook.unmount()
  })

  it('ignores a retry for an empty family', async () => {
    const hook = await renderHook(() => useGoogleFonts('Inter'))
    await hook.act(flush)
    const before = attempts
    await hook.act(async () => {
      hook.current().retry('')
      await flush()
    })
    expect(attempts).toBe(before)
    hook.unmount()
  })

  it('tracks several families independently', async () => {
    const hook = await renderHook(() => useGoogleFonts('One', 'Two'))
    await hook.act(flush)
    expect(hook.current().status).toMatchObject({ One: 'loaded', Two: 'loaded' })
    hook.unmount()
  })

  it('retrying one family does not discard another pending family', async () => {
    let finishOther!: (faces: FontFace[]) => void
    vi.mocked(document.fonts.load).mockImplementation((font) => {
      if (font.includes('Other')) return new Promise((resolve) => { finishOther = resolve }) as Promise<FontFace[]>
      return Promise.resolve([])
    })
    const hook = await renderHook(() => useGoogleFonts('Retry', 'Other'))
    await hook.act(flush)
    expect(hook.current().status.Retry).toBe('failed')
    await hook.act(async () => { hook.current().retry('Retry'); await flush() })
    await hook.act(async () => { finishOther([{} as FontFace]); await flush() })
    expect(hook.current().status.Other).toBe('loaded')
    hook.unmount()
  })

  it('shares a failed bundled preview with the hook and recovers after reselection', async () => {
    vi.mocked(document.fonts.load).mockResolvedValue([])
    await ensurePreviewFont({ family: 'Shared', category: 'serif' })
    const hook = await renderHook(() => useGoogleFonts('Shared'))
    await hook.act(flush)
    expect(hook.current().status.Shared).toBe('failed')
    // There must not be a second preview stylesheet keeping an errored face
    // under the same real family name after the storefront retries.
    expect(document.querySelectorAll('link')).toHaveLength(1)
    let finish!: (faces: FontFace[]) => void
    vi.mocked(document.fonts.load).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    await hook.act(async () => { hook.current().retry('Shared'); await flush() })
    expect(hook.current().status.Shared).toBe('pending')
    await hook.act(async () => { finish([{} as FontFace]); await flush() })
    expect(hook.current().status.Shared).toBe('loaded')
    expect(document.querySelectorAll('link')).toHaveLength(1)
    hook.unmount()
  })

  it('ignores undefined families, so an absent snapshot needs no branch', async () => {
    const hook = await renderHook(() => useGoogleFonts('Solo', undefined))
    await hook.act(flush)
    expect(Object.keys(hook.current().status)).toEqual(['Solo'])
    hook.unmount()
  })
})
