import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ensurePreviewFont, previewStack } from '@/fonts/preview'
import type { FontFamily } from '@/fonts/catalog'

/**
 * Searchable, virtualised font picker. Each row renders in its own typeface.
 *
 * Two things drive the shape of this component:
 *
 * 1. ~1,955 families cannot all be in the DOM, so only the visible window is
 *    rendered. Filtering therefore runs over the WHOLE catalogue first and
 *    the virtualiser windows the result - never the other way round, or
 *    search would only ever find what happened to be mounted.
 *
 * 2. Virtualisation unmounts rows, and an unmounted element cannot be the
 *    target of aria-activedescendant. So this uses a plain listbox with
 *    explicit keyboard handling and keeps the active row scrolled into view,
 *    which guarantees it stays mounted. That is also why cmdk is not used
 *    here: its filtering would have to be disabled anyway, and its active-item
 *    tracking assumes mounted children.
 */

const ROW_HEIGHT = 40
const OVERSCAN = 6
/**
 * The scroll viewport needs an explicit height, not a max-height. The
 * virtualiser measures its scroll element on mount, and shadcn's popover
 * animates in (zoom-in-95) - so a max-height box measures as zero at that
 * instant and the virtualiser caches an empty viewport, rendering no rows.
 */
const LIST_MAX_HEIGHT = 280

interface Props {
  label: string
  value: string
  families: FontFamily[]
  onSelect: (family: string) => void
  disabled?: boolean
}

export function FontPicker({ label, value, families, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  /**
   * Mirrors `active` so key handling composes from the newest value.
   *
   * Reading the state variable inside the handler meant repeated keys
   * arriving in a single tick all computed from the same stale index: forty
   * ArrowDown presses moved the highlight by one. Key repeat can batch this
   * way in practice, not just in a test.
   */
  const activeRef = useRef(0)
  /**
   * The scroll viewport, held in STATE rather than a ref.
   *
   * The popover content mounts after this component, so a ref is still null
   * when the virtualiser first asks for its scroll element - and a ref
   * changing does not re-render, so it never asks again. The list then has a
   * correctly sized spacer and zero rows inside it. A callback ref into state
   * re-renders the moment the element exists, and getScrollElement() returns
   * something real.
   */
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return families
    return families.filter((f) => f.family.toLowerCase().includes(q))
  }, [families, query])

  const virtualizer = useVirtualizer({
    count: matches.length,
    getScrollElement: () => listEl,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  })

  /**
   * Moves the highlight and guarantees the row is rendered.
   *
   * aria-activedescendant must reference a element that exists, but
   * virtualisation unmounts anything off-screen. Scrolling the target into
   * view is what keeps the referenced row mounted - without it, jumping to
   * the end of 1,955 families points the attribute at nothing and a screen
   * reader announces nothing.
   */
  const moveActive = (index: number) => {
    const clamped = Math.max(0, Math.min(index, matches.length - 1))
    activeRef.current = clamped
    setActive(clamped)
    virtualizer.scrollToIndex(clamped, { align: 'auto' })
  }

  // Keep the highlighted row in range whenever the result set changes.
  useEffect(() => {
    activeRef.current = 0
    setActive(0)
    virtualizer.scrollToIndex(0)
  }, [query, virtualizer])

  // Load preview faces only for what is on screen. Each family is fetched at
  // most once; ensurePreviewFont dedupes in-flight requests so fast scrolling
  // cannot stampede.
  const items = virtualizer.getVirtualItems()

  /**
   * Whether the highlighted row is currently rendered.
   *
   * Keyboard movement scrolls the target into view, so it stays mounted. A
   * MANUAL scroll does not: the user can wheel the active row off-screen and
   * the virtualiser unmounts it, leaving aria-activedescendant pointing at an
   * element that no longer exists. The attribute is dropped in that case
   * rather than dangling; the next arrow key re-establishes it.
   */
  const activeIsRendered = items.some((item) => item.index === active)
  useEffect(() => {
    for (const item of items) {
      const font = matches[item.index]
      if (font) void ensurePreviewFont(font)
    }
  }, [items, matches])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const commit = (family: string) => {
    onSelect(family)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (matches.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(activeRef.current + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(activeRef.current - 1)
    } else if (event.key === 'PageDown') {
      event.preventDefault()
      moveActive(activeRef.current + 8)
    } else if (event.key === 'PageUp') {
      event.preventDefault()
      moveActive(activeRef.current - 8)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveActive(matches.length - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      commit(matches[activeRef.current].family)
    }
  }

  const listboxId = `fonts-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-muted-foreground">Aa</span>
        <span className="flex-1 truncate text-left">{value}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[288px] p-0">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search fonts"
            role="combobox"
            aria-label={`Search ${label.toLowerCase()}`}
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              matches.length && activeIsRendered ? `${listboxId}-${active}` : undefined
            }
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground">
          <span>
            {matches.length.toLocaleString()}{' '}
            {matches.length === 1 ? 'family' : 'families'}
          </span>
          {query === '' && <span>by popularity</span>}
        </div>

        {matches.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No family matches &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div
            ref={setListEl}
            id={listboxId}
            role="listbox"
            aria-label={label}
            style={{ height: Math.min(LIST_MAX_HEIGHT, matches.length * ROW_HEIGHT) }}
            className="overflow-y-auto overscroll-contain"
          >
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {items.map((item) => {
                const font = matches[item.index]
                const selected = font.family === value
                return (
                  <button
                    key={font.family}
                    id={`${listboxId}-${item.index}`}
                    role="option"
                    aria-selected={selected}
                    type="button"
                    tabIndex={-1}
                    onClick={() => commit(font.family)}
                    onMouseEnter={() => {
                      activeRef.current = item.index
                      setActive(item.index)
                    }}
                    data-active={item.index === active}
                    className="absolute top-0 left-0 flex w-full items-center gap-2 px-3 text-left data-[active=true]:bg-accent"
                    style={{
                      height: item.size,
                      transform: `translateY(${item.start}px)`,
                    }}
                  >
                    <span
                      className="flex-1 truncate text-[15px]"
                      // The row's own face. Falls back to the stack until (or
                      // unless) the preview file arrives.
                      style={{ fontFamily: previewStack(font) }}
                    >
                      {font.family}
                    </span>
                    {selected && <Check className="size-4 shrink-0" aria-hidden />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
