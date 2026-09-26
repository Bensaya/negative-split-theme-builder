import { X } from 'lucide-react'
import type { DecodeOutcome } from '@/url/urlCodec'

/**
 * Feedback about how the incoming link was read.
 *
 * A shared link that was truncated, hand-edited, or written by a future
 * version should not fail silently: the person who opened it is looking at a
 * theme that is not the one they were sent, and deserves to know which part
 * did not survive. The original URL is deliberately left untouched so it stays
 * inspectable.
 */
export function Notice({
  outcome,
  onDismiss,
}: {
  outcome: DecodeOutcome
  onDismiss: () => void
}) {
  if (outcome.status === 'ok') return null

  const message =
    outcome.status === 'unsupported-version'
      ? `This link uses theme format v${outcome.found}, which this build does not understand. Showing the default theme; the link itself has been left as-is.`
      : `Part of this link could not be read, so ${listFields(outcome.fields)} fell back to the default. Everything else was restored.`

  return (
    <div
      role="status"
      className="flex items-start gap-3 border-b border-border bg-muted px-6 py-2.5 text-sm"
    >
      <p className="flex-1 text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

const LABELS: Record<string, string> = {
  base: 'base color',
  theme: 'theme color',
  radius: 'radius',
  menu: 'menu color',
  accent: 'menu accent',
  heading: 'heading font',
  body: 'body font',
}

function listFields(fields: string[]): string {
  const names = fields.map((f) => LABELS[f] ?? f)
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
