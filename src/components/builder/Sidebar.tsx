import { Check, Dices, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FontPicker } from './FontPicker'
import type { FontStatus } from '@/fonts/useGoogleFont'
import type { FontFamily } from '@/fonts/catalog'
import { pickForeground } from '@/theme/contrast'
import { PALETTE, type RampName } from '@/theme/palette'
import {
  BASE_COLORS,
  BASE_RAMP,
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
 * Exclusive choices are NATIVE radio inputs inside a fieldset. That is not
 * pedantry: the browser then supplies arrow-key navigation, a single tab stop
 * per group, roving focus and the correct screen-reader semantics. A previous
 * version hand-rolled role="radio" on buttons and got the Tab order wrong -
 * every swatch was its own tab stop and arrow keys did nothing.
 *
 * The builder's own chrome deliberately uses stock shadcn classes. It sits
 * outside the preview wrapper, so it keeps the default theme no matter what
 * the user picks - which is the point of scoping tokens to a wrapper.
 */

interface Props {
  theme: Theme
  onChange: <K extends keyof Theme>(key: K, value: Theme[K]) => void
  onShuffle: () => void
  onReset: () => void
  families: FontFamily[]
  /** Set when the catalogue could not be fetched; the bundled list is in use. */
  catalogError?: string
  fontStatus: Record<string, FontStatus>
  /** Comparison is read-only, so the whole panel is disabled while it is open. */
  disabled?: boolean
}

function Group({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="flex flex-col gap-2.5 border-0 p-0">
      <legend className="mb-2.5 text-sm font-medium">{label}</legend>
      {children}
    </fieldset>
  )
}

/** Colour swatches, rendered in their actual palette colours. */
function Swatches<T extends string>({
  name,
  options,
  value,
  onSelect,
  shade,
  ramp,
  disabled,
}: {
  name: string
  options: readonly T[]
  value: T
  onSelect: (v: T) => void
  shade: 400 | 500
  /** Which palette ramp an option's swatch comes from. Base colours are named
   *  for the surface they produce, so Sand has to look up `amber`. */
  ramp?: (option: T) => RampName
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-3">
      {options.map((option) => {
        const selected = option === value
        const swatch = PALETTE[ramp ? ramp(option) : (option as RampName)][shade]
        return (
          <label
            key={option}
            title={titleCase(option)}
            className="flex w-9 cursor-pointer flex-col items-center gap-1 has-disabled:cursor-not-allowed"
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={selected}
              disabled={disabled}
              onChange={() => onSelect(option)}
              className="peer sr-only"
            />
            <span
              data-selected={selected}
              className="flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background data-[selected=true]:ring-2 data-[selected=true]:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-foreground"
              style={{ background: swatch }}
            >
              {selected && (
                // White vanishes on a pale swatch like amber-400, so the tick
                // takes whichever of black or white actually reads on it.
                <Check
                  className="size-4"
                  style={{ color: pickForeground(swatch, 'oklch(100% 0 none)', 'oklch(14.5% 0 none)') }}
                  strokeWidth={3}
                  aria-hidden
                />
              )}
            </span>
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">
              {titleCase(option)}
            </span>
          </label>
        )
      })}
    </div>
  )
}

/** A segmented control. Used for radius and both menu settings. */
function Segmented<T extends string>({
  name,
  options,
  value,
  onSelect,
  labels,
  disabled,
}: {
  name: string
  options: readonly T[]
  value: T
  onSelect: (v: T) => void
  labels?: Record<string, string>
  disabled?: boolean
}) {
  return (
    <div
      className="grid gap-1 rounded-md border border-border bg-muted/60 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}
    >
      {options.map((option) => {
        const selected = option === value
        return (
          <label key={option} className="cursor-pointer has-disabled:cursor-not-allowed">
            <input
              type="radio"
              name={name}
              value={option}
              checked={selected}
              disabled={disabled}
              onChange={() => onSelect(option)}
              className="peer sr-only"
            />
            <span
              data-selected={selected}
              className="block rounded-sm px-1 py-2 text-center text-xs transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-foreground data-[selected=false]:hover:bg-background/70 data-[selected=true]:bg-foreground data-[selected=true]:font-medium data-[selected=true]:text-background"
            >
              {labels?.[option] ?? titleCase(option)}
            </span>
          </label>
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
  fontStatus,
  disabled,
}: Props) {
  const isDefault = JSON.stringify(theme) === JSON.stringify(DEFAULT_THEME)

  return (
    // min-h-0 + overflow-y-auto is what keeps the panel scrollable when the
    // window is shorter than the controls. Without min-h-0 a flex child
    // refuses to shrink below its content and the last controls become
    // unreachable on a 700px-tall laptop.
    <div className="flex min-h-0 flex-col gap-5 p-5">
      <div className="hidden lg:block">
        <h2 className="text-lg font-semibold tracking-tight">Customize</h2>
        <p className="text-sm text-muted-foreground">Make it yours.</p>
      </div>

      <Group label="Base color">
        <Swatches
          name="base-color"
          options={BASE_COLORS}
          value={theme.baseColor}
          onSelect={(v) => onChange('baseColor', v)}
          shade={400}
          ramp={(v) => BASE_RAMP[v]}
          disabled={disabled}
        />
      </Group>

      <Group label="Theme color">
        <Swatches
          name="theme-color"
          options={THEME_COLORS}
          value={theme.themeColor}
          onSelect={(v) => onChange('themeColor', v)}
          shade={500}
          disabled={disabled}
        />
      </Group>

      <Group label="Heading font">
        <FontPicker
          label="Heading font"
          loading={fontStatus[theme.headingFont] === 'pending'}
          value={theme.headingFont}
          families={families}
          onSelect={(v) => onChange('headingFont', v)}
          disabled={disabled}
        />
      </Group>

      <Group label="Body font">
        <FontPicker
          label="Body font"
          loading={fontStatus[theme.bodyFont] === 'pending'}
          value={theme.bodyFont}
          families={families}
          onSelect={(v) => onChange('bodyFont', v)}
          disabled={disabled}
        />
      </Group>

      {catalogError && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Showing {families.length} popular families.
        </p>
      )}

      <Group label="Radius">
        <Segmented
          name="radius"
          options={RADII}
          value={theme.radius}
          onSelect={(v) => onChange('radius', v)}
          labels={RADIUS_LABELS}
          disabled={disabled}
        />
      </Group>

      <Group label="Menu color">
        <Segmented
          name="menu-color"
          options={MENU_COLORS}
          value={theme.menuColor}
          onSelect={(v) => onChange('menuColor', v)}
          disabled={disabled}
        />
      </Group>

      <Group label="Menu accent">
        <Segmented
          name="menu-accent"
          options={MENU_ACCENTS}
          value={theme.menuAccent}
          onSelect={(v) => onChange('menuAccent', v)}
          disabled={disabled}
        />
      </Group>

      <div className="mt-auto flex items-center gap-3 pt-2">
        <Button onClick={onShuffle} disabled={disabled} className="flex-1 gap-2">
          <Dices className="size-4" aria-hidden />
          Shuffle
        </Button>
        <Button
          variant="ghost"
          onClick={onReset}
          disabled={disabled || isDefault}
          className="gap-1.5"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset
        </Button>
      </div>
    </div>
  )
}
