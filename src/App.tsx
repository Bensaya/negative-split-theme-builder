import { useCallback, useState } from 'react'
import { Sidebar } from '@/components/builder/Sidebar'
import { DEVICE_WIDTH, DeviceToggle, TopBar, type Device } from '@/components/builder/TopBar'
import { Notice } from '@/components/builder/Notice'
import { Storefront } from '@/components/storefront/Storefront'
import { useGoogleFonts } from '@/fonts/useGoogleFont'
import { useFontCatalog } from '@/fonts/useFontCatalog'
import { useThemeUrl } from '@/url/useThemeUrl'
import { shuffleTheme } from '@/theme/shuffle'
import { DEFAULT_THEME, type Theme } from '@/theme/theme'
import { resolveTokens } from '@/theme/tokens'

/**
 * Builder shell.
 *
 * The editable theme lives in useThemeUrl and flows down. Every edit goes
 * through one applyTheme() funnel, which is also the only writer of the URL.
 *
 * The theme becomes CSS in exactly one place: the style object on the preview
 * wrapper. Everything outside that element - this shell, the top bar, the
 * sidebar - keeps the stock shadcn theme, which is why the builder's own
 * chrome does not change colour when the user picks Rose.
 */
export default function App() {
  const { theme, applyTheme, updateTheme, arrival, dismissArrival, shareHref } =
    useThemeUrl(DEFAULT_THEME)
  const [device, setDevice] = useState<Device>('desktop')
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle')
  const catalog = useFontCatalog()

  useGoogleFonts(theme.headingFont, theme.bodyFont)

  // Composes against the latest theme, not the one captured when this
  // callback was created - otherwise two edits in the same tick lose the first.
  const update = useCallback(
    <K extends keyof Theme>(key: K, value: Theme[K]) =>
      updateTheme((current) => ({ ...current, [key]: value })),
    [updateTheme],
  )

  // shuffleTheme() calls Math.random(). updateTheme is NOT a React state
  // updater - it runs once and passes a finished value to applyTheme - so the
  // randomness never runs inside an updater React may invoke twice.
  const shuffle = useCallback(() => updateTheme(shuffleTheme), [updateTheme])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareHref())
      setCopied('ok')
    } catch {
      setCopied('failed')
    }
    setTimeout(() => setCopied('idle'), 2400)
  }, [shareHref])

  const tokens = resolveTokens(theme)

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <TopBar
        onSave={() => {}}
        onCompare={() => {}}
        onCopyLink={copyLink}
        canCompare={false}
        copied={copied}
      />

      <Notice outcome={arrival} onDismiss={dismissArrival} />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          theme={theme}
          onChange={update}
          onShuffle={shuffle}
          onReset={() => applyTheme(DEFAULT_THEME)}
          families={catalog.families}
          catalogError={catalog.loading ? undefined : catalog.error}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-muted/40">
          <div className="flex shrink-0 justify-end px-6 py-2">
            <DeviceToggle device={device} onDevice={setDevice} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {/*
              The themed subtree. resolveTokens() returns plain custom
              properties; from here down every bg-primary, rounded-lg and
              font-heading resolves against them through ordinary CSS
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
