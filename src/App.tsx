import { useCallback, useMemo, useState } from 'react'
import { ComparisonBar, type ComparisonView } from '@/components/builder/ComparisonBar'
import { Notice } from '@/components/builder/Notice'
import { Sidebar } from '@/components/builder/Sidebar'
import { DEVICE_WIDTH, DeviceToggle, TopBar, type Device } from '@/components/builder/TopBar'
import { Storefront } from '@/components/storefront/Storefront'
import { useFontCatalog } from '@/fonts/useFontCatalog'
import { useGoogleFonts } from '@/fonts/useGoogleFont'
import { shuffleTheme } from '@/theme/shuffle'
import { DEFAULT_THEME, type Theme } from '@/theme/theme'
import { resolveTokens } from '@/theme/tokens'
import { useThemeUrl } from '@/url/useThemeUrl'

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

  // Save & Compare. Exactly one snapshot, held in memory for the page session.
  // The URL always represents the editable theme and never the snapshot, so
  // the address bar has one meaning regardless of which view is open.
  const [saved, setSaved] = useState<Theme | null>(null)
  const [comparing, setComparing] = useState(false)
  const [view, setView] = useState<ComparisonView>('saved')
  const [justSaved, setJustSaved] = useState(false)

  // The saved theme's fonts load from the moment the snapshot is taken, so
  // switching to the saved view never flashes a fallback face.
  useGoogleFonts(theme.headingFont, theme.bodyFont, saved?.headingFont, saved?.bodyFont)

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

  const saveSnapshot = useCallback(() => {
    // A snapshot is just a Theme. No separate shape, no serialisation of its
    // own, and a field added later is captured for free.
    setSaved(theme)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2400)
  }, [theme])

  const restoreSaved = useCallback(() => {
    if (!saved) return
    // The normal funnel, so controls, preview and URL move together.
    applyTheme(saved)
    setComparing(false)
  }, [saved, applyTheme])

  const currentTokens = useMemo(() => resolveTokens(theme), [theme])
  const savedTokens = useMemo(() => (saved ? resolveTokens(saved) : null), [saved])

  // Comparison swaps the token set on the SAME element rather than rendering a
  // second storefront. Identical dimensions and a preserved scroll position
  // come for free, because nothing unmounts.
  const previewTokens =
    comparing && view === 'saved' && savedTokens ? savedTokens : currentTokens

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <TopBar
        onSave={saveSnapshot}
        onCompare={() => {
          setView('saved')
          setComparing(true)
        }}
        onCopyLink={copyLink}
        canCompare={saved !== null && !comparing}
        copied={copied}
        justSaved={justSaved}
      />

      <Notice outcome={arrival} onDismiss={dismissArrival} />

      <div className="flex min-h-0 flex-1">
        {/*
          The sidebar is inert while comparing. Comparison is a read-only view,
          and editing while looking at the saved theme would be ambiguous about
          which theme the change lands on.
        */}
        <div
          inert={comparing || undefined}
          className={comparing ? 'pointer-events-none opacity-50' : undefined}
        >
          <Sidebar
            theme={theme}
            onChange={update}
            onShuffle={shuffle}
            onReset={() => applyTheme(DEFAULT_THEME)}
            families={catalog.families}
            catalogError={catalog.loading ? undefined : catalog.error}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col bg-muted/40">
          {comparing && savedTokens ? (
            <ComparisonBar
              view={view}
              onView={setView}
              onRestore={restoreSaved}
              onClose={() => setComparing(false)}
            />
          ) : (
            <div className="flex shrink-0 justify-end px-6 py-2">
              <DeviceToggle device={device} onDevice={setDevice} />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6">
            {/*
              The themed subtree. resolveTokens() returns plain custom
              properties; from here down every bg-primary, rounded-lg and
              font-heading resolves against them through ordinary CSS
              inheritance. There is no other "apply the theme" step - which is
              also what lets two different themes exist on one page.
            */}
            <div
              style={{ ...previewTokens, width: DEVICE_WIDTH[device] }}
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
