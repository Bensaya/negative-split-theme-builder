import { Check, Link2, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEVICE_WIDTH, type Device } from './device'

export { DEVICE_WIDTH, type Device }

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
    // The bar spans the window, but its CONTENT is capped and centred. On an
    // ultrawide display a full-width bar strands the title and the actions
    // three thousand pixels apart, which reads as broken rather than roomy.
    <header className="flex shrink-0 items-center justify-center border-b border-border bg-background px-4 py-3 sm:px-6 lg:h-16 lg:py-0">
      <div className="flex w-full max-w-[1760px] flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:flex-nowrap">
      <div className="min-w-0">
        <p className="truncate leading-tight font-semibold tracking-tight">Theme Builder</p>
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
    // Native radios in a fieldset: arrow keys, one tab stop for the group and
    // roving focus come from the browser rather than from hand-rolled
    // role="radio" on buttons, which declared the semantics without
    // implementing the behaviour.
    // Below sm the preview is already about as narrow as the mobile preset,
    // so the toggle would switch between two near-identical widths.
    <fieldset className="hidden items-center gap-1 border-0 p-0 sm:flex">
      <legend className="sr-only">Preview width</legend>
      {options.map(({ id, label, Icon }) => (
        <label
          key={id}
          title={label}
          className="cursor-pointer rounded-md border border-transparent p-1.5 text-muted-foreground transition-colors hover:text-foreground has-checked:border-border has-checked:bg-background has-checked:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          <input
            type="radio"
            name="preview-width"
            value={id}
            checked={device === id}
            onChange={() => onDevice(id)}
            className="sr-only"
          />
          <Icon className="size-4" aria-hidden />
          <span className="sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  )
}
