import type { Page } from '@playwright/test'

/** The element every theme token is set on. */
export const preview = (page: Page) => page.locator('[style*="--primary"]').first()

/** Reads a resolved custom property, which is what the theme actually is. */
export function token(page: Page, name: string): Promise<string> {
  return preview(page).evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
    name,
  )
}

export const primary = (page: Page) => token(page, '--primary')

/**
 * The radio input for one option. Useful for assertions, which do not need the
 * element to be visible.
 */
export const option = (page: Page, group: string, value: string) =>
  page.locator(`input[name="${group}"][value="${value}"]`)

/**
 * Selects an option by clicking its label.
 *
 * The inputs are `sr-only`: real radios for semantics and keyboard behaviour,
 * visually replaced by the swatch or segment inside the label. Clicking the
 * label is what a person does, and it is the only thing Playwright can click,
 * since a visually hidden input is never "visible".
 */
export async function choose(page: Page, group: string, value: string): Promise<void> {
  await page
    .locator('label')
    .filter({ has: option(page, group, value) })
    .click()
}

/**
 * The page-level notice.
 *
 * Scoped to a direct child of the app shell, because the font pickers also
 * publish a `role="status"` while a family is loading and a bare role lookup
 * matches all three.
 */
export const notice = (page: Page) => page.locator('#root > div > [role="status"]')
