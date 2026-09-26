import { useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
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
 *
 * Layout note: the builder chrome uses ordinary viewport breakpoints, while
 * the storefront inside uses @container. Those are deliberately different
 * questions - "how much room does the browser give the app" versus "how much
 * room does the preview have" - and the device toggle only changes the second.
 */
export default function App() {
  const { theme, applyTheme, updateTheme, arrival, dismissArrival, shareHref, getTheme } =
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
  // Narrow-viewport disclosure for the settings panel. Ignored from lg up.
  const [panelOpen, setPanelOpen] = useState(false)

  // Statuses are tracked but the requested family always stays in the theme
  // and the URL: a font that will not load is a rendering problem, not a
  // reason to silently rewrite what the user asked for.
  const { status: fontStatus, retry: retryFont } = useGoogleFonts(
    theme.headingFont,
    theme.bodyFont,
    saved?.headingFont,
    saved?.bodyFont,
  )
  const failedFonts = [theme.headingFont, theme.bodyFont].filter(
    (f, i, arr) => fontStatus[f] === 'failed' && arr.indexOf(f) === i,
  )

  // Composes against the latest theme, not the one captured when this
  // callback was created - otherwise two edits in the same tick lose the first.
  const update = useCallback(
    <K extends keyof Theme>(key: K, value: Theme[K]) => {
      // Re-picking the family that is already selected is how the user asks to
      // retry a font that failed to load. It changes no theme value, so
      // nothing the loader watches would change - hence an explicit retry
      // rather than nudging the theme or the URL to force one.
      if (key === 'headingFont' || key === 'bodyFont') {
        const current = getTheme()
        if (current[key] === value) {
          if (fontStatus[value as string] === 'failed') retryFont(value as string)
          return
        }
      }
      updateTheme((current) => ({ ...current, [key]: value }))
    },
    [updateTheme, getTheme, retryFont, fontStatus],
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
    // Guarded here as well as in the UI. Saving while the comparison is open
    // would capture whichever theme the user is *looking at*, which is not
    // necessarily the editable one - so the action is refused outright rather
    // than relying on a disabled attribute.
    if (comparing) return
    setSaved(theme)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2400)
  }, [theme, comparing])

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
    // overflow-hidden, not overflow-x-hidden. Setting only one axis to hidden
    // makes the OTHER axis compute from `visible` to `auto` - so the shell
    // quietly became a vertical scroll container, and scrolling it dragged the
    // app off-screen to reveal the page background beneath. Both axes are
    // clipped here; the sidebar and the preview each scroll on their own.
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        onSave={saveSnapshot}
        onCompare={() => {
          setView('saved')
          setComparing(true)
        }}
        onCopyLink={copyLink}
        canCompare={saved !== null && !comparing}
        canSave={!comparing}
        hasSnapshot={saved !== null}
        copied={copied}
        justSaved={justSaved}
      />

      <Notice outcome={arrival} onDismiss={dismissArrival} failedFonts={failedFonts} />

      {/* Below lg the panel and the preview stack into one column; from lg
          they become two independently scrolling columns. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/*
          ONE instance of the panel, restyled by breakpoint - never two.
          Rendering a mobile copy and a desktop copy put two radio groups with
          the same `name` in the document, which the browser treats as a single
          group: arrow-key navigation could land on a control inside the hidden
          copy.
        */}
        <div className="flex shrink-0 flex-col border-b border-border lg:min-h-0 lg:w-[280px] lg:min-w-[280px] lg:border-r lg:border-b-0">
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            aria-controls="settings-panel"
            className="flex items-center justify-between px-4 py-3 text-sm font-medium lg:hidden"
          >
            Customize
            <span className="text-muted-foreground">{panelOpen ? 'Hide' : 'Show'}</span>
          </button>

          <div
            id="settings-panel"
            className={cn(
              'min-h-0 overflow-y-auto',
              panelOpen ? 'max-h-[42dvh]' : 'hidden',
              'lg:block lg:max-h-none lg:flex-1',
            )}
          >
            <Sidebar
              theme={theme}
              onChange={update}
              onShuffle={shuffle}
              onReset={() => applyTheme(DEFAULT_THEME)}
              families={catalog.families}
              fontStatus={fontStatus}
              catalogError={catalog.loading ? undefined : catalog.error}
              disabled={comparing}
            />
          </div>
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/40">
          {comparing && savedTokens ? (
            <ComparisonBar
              view={view}
              onView={setView}
              onRestore={restoreSaved}
              onClose={() => setComparing(false)}
            />
          ) : (
            <div className="flex shrink-0 justify-end px-4 py-2 sm:px-6">
              <DeviceToggle device={device} onDevice={setDevice} />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-6 sm:px-6">
            {/*
              The themed subtree. resolveTokens() returns plain custom
              properties; from here down every bg-primary, rounded-lg and
              font-heading resolves against them through ordinary CSS
              inheritance. There is no other "apply the theme" step - which is
              also what lets two different themes exist on one page.
            */}
            <div
              style={{ ...previewTokens, width: DEVICE_WIDTH[device] }}
              className="mx-auto max-w-[1600px] overflow-hidden rounded-lg border border-border shadow-sm transition-[width] duration-200"
            >
              <Storefront />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
