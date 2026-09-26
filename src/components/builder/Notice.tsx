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
  failedFonts = [],
  unresolvedFonts = [],
}: {
  outcome: DecodeOutcome
  onDismiss: () => void
  /** Families the browser could not fetch. The request itself is unchanged. */
  failedFonts?: string[]
  /** Fields whose font is not in the catalogue, so it fell back. */
  unresolvedFonts?: string[]
}) {
  if (unresolvedFonts.length > 0) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 border-b border-border bg-muted px-4 py-2.5 text-sm sm:px-6"
      >
        <p className="flex-1 text-muted-foreground">
          {unresolvedFonts.length === 1
            ? `That link asked for a ${unresolvedFonts[0]} font we do not have, so it fell back to the default.`
            : 'That link asked for heading and body fonts we do not have, so both fell back to the default.'}
        </p>
      </div>
    )
  }

  if (outcome.status === 'ok' && failedFonts.length === 0) return null

  if (outcome.status === 'ok') {
    // A font failed to load. The theme and the URL still hold the requested
    // family: the storefront shows fallback typography, and selecting the
    // family again retries.
    return (
      <div
        role="status"
        className="flex items-start gap-3 border-b border-border bg-muted px-4 py-2.5 text-sm sm:px-6"
      >
        <p className="flex-1 text-muted-foreground">
          {failedFonts.length === 1
            ? `${failedFonts[0]} could not be loaded, so the preview is using fallback type. Your choice is unchanged - pick it again to retry.`
            : `${failedFonts.join(' and ')} could not be loaded, so the preview is using fallback type. Your choices are unchanged - pick them again to retry.`}
        </p>
      </div>
    )
  }

  const message =
    outcome.status === 'unsupported-version'
      ? `This link uses theme format v${outcome.found}, which this build does not understand. Showing the default theme; the link itself has been left as-is.`
      : `Part of this link could not be read, so ${listFields(outcome.fields)} fell back to the default. Everything else was restored.`

  return (
    <div
      role="status"
      className="flex items-start gap-3 border-b border-border bg-muted px-4 py-2.5 text-sm sm:px-6"
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
