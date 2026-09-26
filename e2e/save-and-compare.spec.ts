import { expect, test } from '@playwright/test'
import { choose, option, primary } from './helpers'

/**
 * Save & Compare.
 *
 * The behaviour worth protecting is what comparison must NOT do: change the
 * editable theme, or move the URL. Those are asserted explicitly, because a
 * regression there would look fine on screen.
 */

test.describe('save and compare', () => {
  test('compare is unavailable until something is saved', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Compare' })).toBeDisabled()

    await page.getByRole('button', { name: 'Save for comparison' }).click()
    await expect(page.getByRole('button', { name: 'Compare' })).toBeEnabled()
  })

  test('comparing swaps the preview without touching the theme or the URL', async ({ page }) => {
    await page.goto('/')

    await choose(page, 'theme-color', 'rose')
    const saved = await primary(page)
    await page.getByRole('button', { name: 'Save for comparison' }).click()

    // Keep editing. The snapshot must not follow.
    await choose(page, 'theme-color', 'cyan')
    const current = await primary(page)
    expect(current).not.toBe(saved)
    const urlWhileEditing = page.url()

    await page.getByRole('button', { name: 'Compare' }).click()

    // Opens on the snapshot.
    await expect.poll(() => primary(page)).toBe(saved)

    // Toggling shows the current theme...
    await choose(page, 'comparison-view', 'current')
    await expect.poll(() => primary(page)).toBe(current)

    // ...and back to the snapshot.
    await choose(page, 'comparison-view', 'saved')
    await expect.poll(() => primary(page)).toBe(saved)

    // While the snapshot is on screen the controls describe the snapshot, so
    // the panel and the preview never disagree about what is being shown.
    await expect(option(page, 'theme-color', 'rose')).toBeChecked()

    // Comparison is read-only.
    await expect(option(page, 'theme-color', 'amber')).toBeDisabled()

    // The URL never moved, because comparing is not an edit.
    expect(page.url()).toBe(urlWhileEditing)

    // And the edit made before comparing is still there on the way out.
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(option(page, 'theme-color', 'cyan')).toBeChecked()
    await expect.poll(() => primary(page)).toBe(current)
    expect(page.url()).toBe(urlWhileEditing)
  })

  test('restoring moves the controls, the preview and the URL together', async ({ page }) => {
    await page.goto('/')

    await choose(page, 'theme-color', 'rose')
    await choose(page, 'radius', 'none')
    const saved = await primary(page)
    const savedUrl = page.url()
    await page.getByRole('button', { name: 'Save for comparison' }).click()

    await choose(page, 'theme-color', 'cyan')
    await choose(page, 'radius', 'large')
    expect(page.url()).not.toBe(savedUrl)

    await page.getByRole('button', { name: 'Compare' }).click()
    await page.getByRole('button', { name: 'Use saved theme' }).click()

    // Restore goes through the same funnel as any other edit, so all three
    // move at once rather than drifting apart.
    await expect(option(page, 'theme-color', 'rose')).toBeChecked()
    await expect(option(page, 'radius', 'none')).toBeChecked()
    await expect.poll(() => primary(page)).toBe(saved)
    expect(page.url()).toContain('theme=rose')
    expect(page.url()).toContain('radius=none')

    // Comparison closes on restore, and the panel is editable again.
    await expect(page.getByRole('button', { name: 'Use saved theme' })).toHaveCount(0)
    await expect(option(page, 'theme-color', 'amber')).toBeEnabled()
  })
})
