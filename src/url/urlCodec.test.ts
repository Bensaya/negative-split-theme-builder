import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, buildHref, decode, encode } from './urlCodec'
import { DEFAULT_THEME, type Theme } from '@/theme/theme'

const custom: Theme = {
  baseColor: 'slate',
  themeColor: 'rose',
  radius: 'large',
  menuColor: 'inverted',
  menuAccent: 'bold',
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
}

describe('encode', () => {
  it('always emits the version and all seven fields', () => {
    const p = new URLSearchParams(encode(custom))
    expect(p.get('v')).toBe(String(SCHEMA_VERSION))
    for (const key of ['base', 'theme', 'radius', 'menu', 'accent', 'heading', 'body']) {
      expect(p.get(key), `missing ${key}`).toBeTruthy()
    }
    expect([...p.keys()]).toHaveLength(8)
  })

  it('percent-encodes font names with spaces', () => {
    expect(encode(custom)).toMatch(/heading=Playfair(\+|%20)Display/)
  })
})

describe('round trip', () => {
  it('preserves every control', () => {
    expect(decode(encode(custom)).theme).toEqual(custom)
  })

  it('preserves the default theme', () => {
    expect(decode(encode(DEFAULT_THEME)).theme).toEqual(DEFAULT_THEME)
  })

  it('preserves non-ASCII font names', () => {
    // Google's catalogue is mostly ASCII but not guaranteed, and a hand-edited
    // URL can contain anything. This is also the case that breaks btoa().
    const unicode = { ...custom, headingFont: 'Noto Serif Hebrew', bodyFont: 'Mulish' }
    expect(decode(encode(unicode)).theme).toEqual(unicode)
  })

  it('survives a family name containing a plus sign', () => {
    const plus = { ...custom, bodyFont: 'Source Serif 4' }
    expect(decode(encode(plus)).theme.bodyFont).toBe('Source Serif 4')
  })
})

describe('decode', () => {
  it('returns the default theme for an empty query string', () => {
    const r = decode('')
    expect(r.theme).toEqual(DEFAULT_THEME)
    expect(r.outcome.status).toBe('ok')
  })

  it('treats a missing version as version 1 rather than discarding the theme', () => {
    const r = decode('base=slate&theme=rose')
    expect(r.theme.baseColor).toBe('slate')
    expect(r.theme.themeColor).toBe('rose')
    expect(r.outcome.status).toBe('ok')
  })

  it('reports an explicitly unsupported version and falls back safely', () => {
    const r = decode('v=2&base=slate')
    expect(r.outcome.status).toBe('unsupported-version')
    expect(r.theme).toEqual(DEFAULT_THEME)
    // The caller must NOT rewrite the address bar - the original link stays
    // inspectable, which is the whole point of a readable URL.
    expect(r.shouldRewriteUrl).toBe(false)
  })

  it('treats an empty version parameter as a missing one', () => {
    // "?v=&base=slate" is a trimmed link, not a format we do not understand.
    const r = decode('v=&base=slate&theme=rose')
    expect(r.outcome.status).toBe('ok')
    expect(r.theme.baseColor).toBe('slate')
    expect(r.theme.themeColor).toBe('rose')
  })

  it('treats a whitespace-only version as missing too', () => {
    expect(decode('v=%20%20&base=slate').theme.baseColor).toBe('slate')
  })

  it('treats a non-numeric version as unsupported', () => {
    expect(decode('v=abc&base=slate').outcome.status).toBe('unsupported-version')
  })

  describe('one bad field never erases the others', () => {
    it('defaults only the invalid enum', () => {
      const r = decode('v=1&base=chartreuse&theme=rose&radius=large')
      expect(r.theme.baseColor).toBe(DEFAULT_THEME.baseColor)
      expect(r.theme.themeColor).toBe('rose')
      expect(r.theme.radius).toBe('large')
    })

    it('names the fields that fell back', () => {
      const r = decode('v=1&base=chartreuse&radius=enormous')
      expect(r.outcome.status).toBe('defaulted')
      if (r.outcome.status === 'defaulted') {
        expect(r.outcome.fields.sort()).toEqual(['base', 'radius'])
      }
    })
  })

  it('ignores unknown parameters', () => {
    const r = decode('v=1&base=slate&utm_source=twitter&foo=bar')
    expect(r.theme.baseColor).toBe('slate')
    expect(r.outcome.status).toBe('ok')
  })

  it('takes the first value when a parameter is duplicated', () => {
    expect(decode('v=1&theme=rose&theme=blue').theme.themeColor).toBe('rose')
  })

  describe('font names are validated structurally, not against a catalogue', () => {
    it('accepts a family it has never heard of, because the catalogue is async', () => {
      // decode() cannot know whether this font exists - the catalogue may not
      // have loaded, or may never load. Replacing it with a default here would
      // silently destroy a shared link's typography.
      const r = decode('v=1&heading=Some+Unreleased+Face')
      expect(r.theme.headingFont).toBe('Some Unreleased Face')
      expect(r.outcome.status).toBe('ok')
    })

    it('rejects a family name beyond a sane length', () => {
      const r = decode(`v=1&heading=${'a'.repeat(200)}`)
      expect(r.theme.headingFont).toBe(DEFAULT_THEME.headingFont)
    })

    it('rejects control characters and angle brackets', () => {
      for (const bad of ['<script>', 'a\u0000b', 'a\nb']) {
        const r = decode(`v=1&heading=${encodeURIComponent(bad)}`)
        expect(r.theme.headingFont, bad).toBe(DEFAULT_THEME.headingFont)
      }
    })

    it('rejects an empty family name', () => {
      expect(decode('v=1&body=').theme.bodyFont).toBe(DEFAULT_THEME.bodyFont)
    })
  })

  it('never throws, whatever it is handed', () => {
    const nasty = [
      '?????',
      '%%%%',
      'v=1&base=%E0%A4%A',
      '&&&&&',
      '='.repeat(500),
      'v=1&heading=%ED%A0%80',
      `v=1&${'x'.repeat(5000)}=1`,
    ]
    for (const s of nasty) {
      expect(() => decode(s), s).not.toThrow()
      expect(decode(s).theme).toBeTruthy()
    }
  })
})

describe('buildHref', () => {
  const at = (href: string) => buildHref(custom, href)

  it('preserves the pathname', () => {
    expect(new URL(at('https://x.test/builder')).pathname).toBe('/builder')
  })

  it('preserves the hash', () => {
    expect(new URL(at('https://x.test/?v=1#grid')).hash).toBe('#grid')
  })

  it('preserves unrelated query parameters', () => {
    const u = new URL(at('https://x.test/?utm_source=twitter&ref=hn'))
    expect(u.searchParams.get('utm_source')).toBe('twitter')
    expect(u.searchParams.get('ref')).toBe('hn')
  })

  it('replaces stale theme parameters rather than appending to them', () => {
    const u = new URL(at('https://x.test/?v=1&base=stone&theme=amber&radius=none'))
    expect(u.searchParams.getAll('base')).toEqual(['slate'])
    expect(u.searchParams.getAll('theme')).toEqual(['rose'])
    expect(u.searchParams.get('radius')).toBe('large')
  })

  it('round trips through a full href', () => {
    const href = at('https://x.test/builder?utm_source=x#grid')
    expect(decode(new URL(href).search).theme).toEqual(custom)
  })
})
