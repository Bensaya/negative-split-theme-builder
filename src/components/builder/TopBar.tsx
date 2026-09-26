import { Check, Link2, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type Device = 'desktop' | 'mobile'

/**
 * Width the preview container is pinned to.
 *
 * Mobile is capped by the space actually available, not a bare 420px: on a
 * phone the panel is narrower than that, and a fixed width would push the
 * page into horizontal scrolling. The storefront reads its own width through
 * @container, so constraining this box is all it takes - the browser viewport
 * and the preview's available width stay separate things.
 */
export const DEVICE_WIDTH: Record<Device, string> = {
  desktop: '100%',
  mobile: 'min(420px, 100%)',
}

interface DeviceProps {
  device: Device
  onDevice: (d: Device) => void
}

interface Props {
  onSave: () => void
  onCompare: () => void
  onCopyLink: () => void
  canCompare: boolean
  canSave: boolean
  hasSnapshot: boolean
  copied: 'idle' | 'ok' | 'failed'
  justSaved: boolean
}

export function TopBar({
  onSave,
  onCompare,
  onCopyLink,
  canCompare,
  canSave,
  hasSnapshot,
  copied,
  justSaved,
}: Props) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-background px-4 py-3 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
      <div className="min-w-0">
        <h1 className="truncate leading-tight font-semibold tracking-tight">Theme Builder</h1>
        <p className="truncate text-sm leading-tight text-muted-foreground">Negative Split</p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onSave}
          disabled={!canSave}
          title={
            !canSave
              ? 'Close the comparison before saving'
              : hasSnapshot
                ? 'Replaces the theme you saved earlier'
                : undefined
          }
        >
          {justSaved && <Check className="size-3.5" aria-hidden />}
          {justSaved ? 'Saved' : hasSnapshot ? 'Replace saved theme' : 'Save for comparison'}
        </Button>
        <span aria-live="polite" className="sr-only">
          {justSaved ? 'Theme saved for comparison' : ''}
        </span>
        <Button variant="outline" size="sm" onClick={onCompare} disabled={!canCompare}>
          Compare
        </Button>
        <Button size="sm" className="gap-2" onClick={onCopyLink}>
          {copied === 'ok' ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Link2 className="size-4" aria-hidden />
          )}
          {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy link'}
        </Button>
        {/* Announced separately so the label change is not the only signal. */}
        <span aria-live="polite" className="sr-only">
          {copied === 'ok' ? 'Link copied to clipboard' : ''}
          {copied === 'failed' ? 'Could not copy the link' : ''}
        </span>
      </div>
    </header>
  )
}

export function DeviceToggle({ device, onDevice }: DeviceProps) {
  const options: { id: Device; label: string; Icon: typeof Monitor }[] = [
    { id: 'desktop', label: 'Desktop', Icon: Monitor },
    { id: 'mobile', label: 'Mobile', Icon: Smartphone },
  ]
  return (
    <div role="radiogroup" aria-label="Preview width" className="flex items-center gap-1">
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={device === id}
          aria-label={label}
          title={label}
          onClick={() => onDevice(id)}
          data-selected={device === id}
          className="rounded-md border border-transparent p-1.5 text-muted-foreground transition-colors hover:text-foreground data-[selected=true]:border-border data-[selected=true]:bg-background data-[selected=true]:text-foreground"
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
