import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BUNDLED_FAMILIES, __resetCatalogCache, loadCatalog } from './catalog'

/**
 * The catalogue is the one place this app talks to a network it does not
 * control, and the fallback path is the one a reviewer cloning the repo will
 * actually hit - .env.local is gitignored, so they have no key. These tests
 * treat "no key" and "request failed" as the normal cases they are.
 */

const okResponse = (items: unknown[]) =>
  ({ ok: true, status: 200, json: async () => ({ items }) }) as unknown as Response

const errorResponse = (status: number) =>
  ({ ok: false, status, json: async () => ({}) }) as unknown as Response

const validItem = {
  family: 'Inter',
  category: 'sans-serif',
  variants: ['regular', '700'],
  menu: 'https://fonts.gstatic.com/s/inter/v20/abc.ttf',
}

beforeEach(() => __resetCatalogCache())

describe('loadCatalog', () => {
  describe('falls back to the bundled list', () => {
    it('when no API key is configured', async () => {
      const fetchImpl = vi.fn()
      const r = await loadCatalog(undefined, fetchImpl)
      expect(r.source).toBe('bundled')
      expect(r.families.length).toBe(BUNDLED_FAMILIES.length)
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('when the key is an empty string', async () => {
      const fetchImpl = vi.fn()
      expect((await loadCatalog('', fetchImpl)).source).toBe('bundled')
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('on a 403, which is what a referrer-restricted key returns elsewhere', async () => {
      const r = await loadCatalog('k', async () => errorResponse(403))
      expect(r.source).toBe('bundled')
      expect(r.error).toMatch(/403/)
    })

    it('on a network error', async () => {
      const r = await loadCatalog('k', async () => {
        throw new TypeError('Failed to fetch')
      })
      expect(r.source).toBe('bundled')
      expect(r.error).toBeTruthy()
    })

    it('on a body that is not the shape we expect', async () => {
      const r = await loadCatalog('k', async () => okResponse(undefined as never))
      expect(r.source).toBe('bundled')
    })

    it('when the API returns an empty list', async () => {
      const r = await loadCatalog('k', async () => okResponse([]))
      expect(r.source).toBe('bundled')
    })

    it('and the bundled list is always usable', () => {
      expect(BUNDLED_FAMILIES.length).toBeGreaterThan(20)
      for (const f of BUNDLED_FAMILIES) {
        expect(f.family).toBeTruthy()
        expect(f.category).toBeTruthy()
      }
    })
  })

  describe('when the API responds', () => {
    it('reports the api source and returns the families', async () => {
      const r = await loadCatalog('k', async () => okResponse([validItem]))
      expect(r.source).toBe('api')
      expect(r.families[0]).toMatchObject({ family: 'Inter', category: 'sans-serif' })
      expect(r.families[0].menuUrl).toBe(validItem.menu)
    })

    it('preserves the order the API returned, which is popularity', async () => {
      const items = ['Roboto', 'Open Sans', 'Lato'].map((family) => ({ ...validItem, family }))
      const r = await loadCatalog('k', async () => okResponse(items))
      expect(r.families.map((f) => f.family)).toEqual(['Roboto', 'Open Sans', 'Lato'])
    })

    it('requests popularity order and passes the key', async () => {
      let seen = ''
      await loadCatalog('SECRET', async (url) => {
        seen = String(url)
        return okResponse([validItem])
      })
      expect(seen).toContain('sort=popularity')
      expect(seen).toContain('key=SECRET')
    })

    it('drops malformed entries instead of rejecting the whole response', async () => {
      const r = await loadCatalog('k', async () =>
        okResponse([
          validItem,
          { family: '', category: 'serif' },
          { category: 'serif' },
          null,
          'nonsense',
          { family: 'x'.repeat(200), category: 'serif' },
          { family: '<script>', category: 'serif' },
          { ...validItem, family: 'Lora', menu: 'javascript:alert(1)' },
        ]),
      )
      expect(r.source).toBe('api')
      expect(r.families.map((f) => f.family)).toEqual(['Inter', 'Lora'])
      // A menu URL that is not https is dropped, not carried through.
      expect(r.families.find((f) => f.family === 'Lora')?.menuUrl).toBeUndefined()
    })

    it('only accepts menu URLs from the Google font CDN', async () => {
      const r = await loadCatalog('k', async () =>
        okResponse([{ ...validItem, menu: 'https://evil.test/font.ttf' }]),
      )
      expect(r.families[0].menuUrl).toBeUndefined()
    })
  })

  describe('caching', () => {
    it('fetches once per session and reuses the result', async () => {
      const fetchImpl = vi.fn(async () => okResponse([validItem]))
      await loadCatalog('k', fetchImpl)
      await loadCatalog('k', fetchImpl)
      await loadCatalog('k', fetchImpl)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it('does not fire duplicate requests for concurrent callers', async () => {
      const fetchImpl = vi.fn(async () => okResponse([validItem]))
      await Promise.all([
        loadCatalog('k', fetchImpl),
        loadCatalog('k', fetchImpl),
        loadCatalog('k', fetchImpl),
      ])
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it('caches the fallback too, so a dead network is not retried on every open', async () => {
      const fetchImpl = vi.fn(async () => errorResponse(500))
      await loadCatalog('k', fetchImpl)
      await loadCatalog('k', fetchImpl)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })
  })

  it('never rejects, whatever the network does', async () => {
    const nasty = [
      async () => {
        throw new Error('boom')
      },
      async () => ({ ok: true, status: 200, json: async () => JSON.parse('{bad') }) as never,
      async () => null as never,
    ]
    for (const f of nasty) {
      __resetCatalogCache()
      await expect(loadCatalog('k', f as never)).resolves.toBeTruthy()
    }
  })
})
