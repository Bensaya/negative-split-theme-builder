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
      <div
        role="radiogroup"
        aria-label="Comparison view"
        className="flex rounded-md border border-border bg-background p-0.5"
      >
        {(['saved', 'current'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={view === option}
            onClick={() => onView(option)}
            data-selected={view === option}
            className="rounded-sm px-3 py-1 text-sm capitalize data-[selected=true]:bg-foreground data-[selected=true]:font-medium data-[selected=true]:text-background"
          >
            {option}
          </button>
        ))}
      </div>

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
