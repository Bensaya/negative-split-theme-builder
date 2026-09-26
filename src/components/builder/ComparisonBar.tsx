import { RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ComparisonView = 'saved' | 'current'

/**
 * The comparison header.
 *
 * Comparison is read-only and URL-neutral: toggling between Saved and Current
 * changes nothing except which token set the preview renders with. Only "Use
 * saved theme" writes, and it goes through the same applyTheme() funnel as
 * every other edit, so the sidebar, the preview and the URL move together.
 */
export function ComparisonBar({
  view,
  onView,
  onRestore,
  onClose,
}: {
  view: ComparisonView
  onView: (v: ComparisonView) => void
  onRestore: () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-muted px-4 py-2.5 sm:px-6">
      {/* Native radios, so arrow keys and Tab order behave without being
          reimplemented. */}
      <fieldset className="flex rounded-md border border-border bg-background p-0.5">
        <legend className="sr-only">Comparison view</legend>
        {(['saved', 'current'] as const).map((option) => (
          <label
            key={option}
            className="cursor-pointer rounded-sm px-3 py-1 text-sm capitalize has-checked:bg-foreground has-checked:font-medium has-checked:text-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name="comparison-view"
              value={option}
              checked={view === option}
              onChange={() => onView(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </fieldset>

      <p className="min-w-0 flex-1 text-sm text-muted-foreground">
        {view === 'saved'
          ? 'Showing the theme you saved. Your current edits are untouched.'
          : 'Showing your current theme.'}{' '}
        <span className="whitespace-nowrap">The snapshot is cleared on refresh.</span>
      </p>

      {/* Announced on change, because the visible difference is the whole page
          re-theming and a screen reader user would otherwise get no signal. */}
      <span aria-live="polite" className="sr-only">
        Showing the {view} theme
      </span>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={onRestore}>
        <RotateCcw className="size-3.5" aria-hidden />
        Use saved theme
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClose}>
        <X className="size-4" aria-hidden />
        Close
      </Button>
    </div>
  )
}
