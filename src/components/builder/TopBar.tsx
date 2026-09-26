import { Link2, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type Device = 'desktop' | 'mobile'

/** Widths the preview container is pinned to. The storefront reads its own
 *  width through @container, so constraining this box is all it takes. */
export const DEVICE_WIDTH: Record<Device, string> = {
  desktop: '100%',
  mobile: '420px',
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
}

export function TopBar({ onSave, onCompare, onCopyLink, canCompare }: Props) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <div className="min-w-0">
        <h1 className="truncate leading-tight font-semibold tracking-tight">Theme Builder</h1>
        <p className="truncate text-sm leading-tight text-muted-foreground">Negative Split</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSave}>
          Save for comparison
        </Button>
        <Button variant="outline" size="sm" onClick={onCompare} disabled={!canCompare}>
          Compare
        </Button>
        <Button size="sm" className="gap-2" onClick={onCopyLink}>
          <Link2 className="size-4" aria-hidden />
          Copy link
        </Button>
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
