/**
 * Regenerates src/theme/palette.ts from the INSTALLED Tailwind package.
 *
 * Why generate instead of hand-typing hex values: the assignment asks for
 * Tailwind's palette, and Tailwind v4 ships oklch values that differ from the
 * v3 hex values most people have memorised. Reading them out of
 * node_modules/tailwindcss/theme.css means the colours in this app are
 * provably the ones Tailwind actually ships, at the version we depend on.
 *
 * Run: node scripts/generate-palette.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const twRoot = path.dirname(require.resolve('tailwindcss/package.json'))
const themeCss = readFileSync(path.join(twRoot, 'theme.css'), 'utf8')
const version = JSON.parse(
  readFileSync(path.join(twRoot, 'package.json'), 'utf8'),
).version

/** The five neutral ramps the README names as "base colors". */
const BASE = ['neutral', 'slate', 'gray', 'zinc', 'stone']

/** Accent ramps offered as "theme color". Lime/Blue/Rose/Amber/Cyan are the
 *  five in the approved design; the rest widen the space for Shuffle. */
const ACCENT = [
  'lime', 'blue', 'rose', 'amber', 'cyan',
  'emerald', 'violet', 'orange', 'teal', 'fuchsia', 'red', 'indigo',
]

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

function ramp(name) {
  const out = {}
  for (const shade of SHADES) {
    const m = themeCss.match(
      new RegExp(`--color-${name}-${shade}:\\s*(oklch\\([^)]*\\));`),
    )
    if (!m) throw new Error(`missing --color-${name}-${shade} in theme.css`)
    out[shade] = m[1]
  }
  return out
}

const palette = {}
for (const n of [...BASE, ...ACCENT]) palette[n] = ramp(n)

const lines = []
lines.push('/* GENERATED FILE - do not edit by hand.')
lines.push(` * Source: tailwindcss@${version} theme.css`)
lines.push(' * Regenerate: node scripts/generate-palette.mjs')
lines.push(' */')
lines.push('')
lines.push(`export const TAILWIND_VERSION = ${JSON.stringify(version)} as const`)
lines.push('')
lines.push('export const SHADES = [')
lines.push(`  ${SHADES.join(', ')},`)
lines.push('] as const')
lines.push('export type Shade = (typeof SHADES)[number]')
lines.push('')
lines.push('export const PALETTE = {')
for (const [name, r] of Object.entries(palette)) {
  lines.push(`  ${name}: {`)
  for (const s of SHADES) lines.push(`    ${s}: '${r[s]}',`)
  lines.push('  },')
}
lines.push('} as const')
lines.push('')
lines.push('export type RampName = keyof typeof PALETTE')
lines.push('')

const target = new URL('../src/theme/palette.ts', import.meta.url)
writeFileSync(target, lines.join('\n'))
console.log(
  `wrote src/theme/palette.ts - ${Object.keys(palette).length} ramps x ${SHADES.length} shades from tailwindcss@${version}`,
)
