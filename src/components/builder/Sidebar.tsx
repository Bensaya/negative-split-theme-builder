import { Check, Dices, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FontPicker } from './FontPicker'
import type { FontFamily } from '@/fonts/catalog'
import { PALETTE } from '@/theme/palette'
import {
  BASE_COLORS,
  DEFAULT_THEME,
  MENU_ACCENTS,
  MENU_COLORS,
  RADII,
  RADIUS_LABELS,
  THEME_COLORS,
  titleCase,
  type Theme,
} from '@/theme/theme'

/**
 * The configuration panel.
 *
 * Everything here is driven by the `as const` option lists in theme.ts, so the
 * swatches, the toggles and the Shuffle space cannot drift apart from the type.
 *
 * The builder's own chrome deliberately uses stock shadcn classes. It sits
 * outside the preview wrapper, so it keeps the default theme no matter what the
 * user picks - which is the point of scoping tokens to a wrapper.
 */

interface Props {
  theme: Theme
  onChange: <K extends keyof Theme>(key: K, value: Theme[K]) => void
  onShuffle: () => void
  onReset: () => void
  families: FontFamily[]
  /** Set when the catalogue could not be fetched; the bundled list is in use. */
  catalogError?: string
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

/** A row of colour swatches rendered in their actual palette colours. */
function Swatches<T extends string>({
  options,
  value,
  onSelect,
  shade,
  label,
}: {
  options: readonly T[]
  value: T
  onSelect: (v: T) => void
  shade: 400 | 500
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-x-3 gap-y-3">
      {options.map((name) => {
        const selected = name === value
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={titleCase(name)}
            title={titleCase(name)}
            onClick={() => onSelect(name)}
            className="flex w-9 flex-col items-center gap-1 focus-visible:outline-none"
          >
            <span
              className="flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow group-focus:ring-2 data-[selected=true]:ring-2 data-[selected=true]:ring-ring"
              data-selected={selected}
              style={{ background: PALETTE[name as keyof typeof PALETTE][shade] }}
            >
              {selected && <Check className="size-4 text-white drop-shadow-sm" strokeWidth={3} />}
            </span>
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">
              {titleCase(name)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** A segmented control. Used for radius and both menu settings. */
function Segmented<T extends string>({
  options,
  value,
  onSelect,
  labels,
  label,
}: {
  options: readonly T[]
  value: T
  onSelect: (v: T) => void
  labels?: Record<string, string>
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-md border border-border bg-muted/60 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}
    >
      {options.map((opt) => {
        const selected = opt === value
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(opt)}
            data-selected={selected}
            className="rounded-sm px-2 py-1.5 text-sm transition-colors data-[selected=false]:hover:bg-background/70 data-[selected=true]:bg-foreground data-[selected=true]:font-medium data-[selected=true]:text-background"
          >
            {labels?.[opt] ?? titleCase(opt)}
          </button>
        )
      })}
    </div>
  )
}

export function Sidebar({
  theme,
  onChange,
  onShuffle,
  onReset,
  families,
  catalogError,
}: Props) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-background p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Customize</h2>
        <p className="text-sm text-muted-foreground">Make it yours.</p>
      </div>

      <Field label="Base color">
        <Swatches
          label="Base color"
          options={BASE_COLORS}
          value={theme.baseColor}
          onSelect={(v) => onChange('baseColor', v)}
          shade={400}
        />
      </Field>

      <Field label="Theme color">
        <Swatches
          label="Theme color"
          options={THEME_COLORS}
          value={theme.themeColor}
          onSelect={(v) => onChange('themeColor', v)}
          shade={500}
        />
      </Field>

      <Field label="Heading font">
        <FontPicker
          label="Heading font"
          value={theme.headingFont}
          families={families}
          onSelect={(v) => onChange('headingFont', v)}
        />
      </Field>

      <Field label="Body font">
        <FontPicker
          label="Body font"
          value={theme.bodyFont}
          families={families}
          onSelect={(v) => onChange('bodyFont', v)}
        />
      </Field>

      {catalogError && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Showing {families.length} popular families. The full Google Fonts
          catalogue is unavailable: {catalogError}.
        </p>
      )}

      <Field label="Radius">
        <Segmented
          label="Radius"
          options={RADII}
          value={theme.radius}
          onSelect={(v) => onChange('radius', v)}
          labels={RADIUS_LABELS}
        />
      </Field>

      <Field label="Menu color">
        <Segmented
          label="Menu color"
          options={MENU_COLORS}
          value={theme.menuColor}
          onSelect={(v) => onChange('menuColor', v)}
        />
      </Field>

      <Field label="Menu accent">
        <Segmented
          label="Menu accent"
          options={MENU_ACCENTS}
          value={theme.menuAccent}
          onSelect={(v) => onChange('menuAccent', v)}
        />
      </Field>

      <div className="mt-auto flex items-center gap-3 pt-2">
        <Button onClick={onShuffle} className="flex-1 gap-2">
          <Dices className="size-4" aria-hidden />
          Shuffle
        </Button>
        <Button
          variant="ghost"
          onClick={onReset}
          disabled={
            JSON.stringify(theme) === JSON.stringify(DEFAULT_THEME)
          }
          className="gap-1.5"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset
        </Button>
      </div>
    </aside>
  )
}
