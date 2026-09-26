import { useCallback, useState } from 'react'
import { Sidebar } from '@/components/builder/Sidebar'
import { DEVICE_WIDTH, DeviceToggle, TopBar, type Device } from '@/components/builder/TopBar'
import { Storefront } from '@/components/storefront/Storefront'
import { useGoogleFonts } from '@/fonts/useGoogleFont'
import { shuffleTheme } from '@/theme/shuffle'
import { DEFAULT_THEME, type Theme } from '@/theme/theme'
import { resolveTokens } from '@/theme/tokens'

/**
 * Builder shell.
 *
 * The theme lives here, in one piece of React state, and flows down. Nothing
 * reads it back out of the DOM or the URL.
 *
 * The only place the theme becomes CSS is the `style` on the preview wrapper
 * below. Everything outside that element - this shell, the top bar, the
 * sidebar - stays on the stock shadcn theme, which is why the builder's own
 * chrome does not change colour when the user picks Rose.
 */
export default function App() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)
  const [device, setDevice] = useState<Device>('desktop')

  useGoogleFonts(theme.headingFont, theme.bodyFont)

  const update = useCallback(<K extends keyof Theme>(key: K, value: Theme[K]) => {
    setTheme((t) => ({ ...t, [key]: value }))
  }, [])

  const tokens = resolveTokens(theme)

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <TopBar
        onSave={() => {}}
        onCompare={() => {}}
        onCopyLink={() => {}}
        canCompare={false}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          theme={theme}
          onChange={update}
          onShuffle={() => setTheme((t) => shuffleTheme(t))}
          onReset={() => setTheme(DEFAULT_THEME)}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-muted/40">
          <div className="flex shrink-0 justify-end px-6 py-2">
            <DeviceToggle device={device} onDevice={setDevice} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {/*
              The themed subtree. resolveTokens() returns plain custom
              properties; from here down every `bg-primary`, `rounded-lg` and
              `font-heading` resolves against them through ordinary CSS
              inheritance. There is no other "apply the theme" step.
            */}
            <div
              style={{ ...tokens, width: DEVICE_WIDTH[device] }}
              className="mx-auto overflow-hidden rounded-lg border border-border shadow-sm transition-[width] duration-200"
            >
              <Storefront />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
