import { expect, test } from '@playwright/test'
import { choose, notice, option, token } from './helpers'

/**
 * The shareable link, end to end.
 *
 * These journeys were previously checked by hand. Assertions go through
 * accessible roles and the computed custom properties on the preview wrapper,
 * so a class rename or a layout change cannot break them and a genuine
 * regression cannot pass.
 */

test.describe('shared link', () => {
  test('round-trips every control through the URL', async ({ page }) => {
    await page.goto('/')

    await choose(page, 'base-color', 'slate')
    await choose(page, 'theme-color', 'rose')
    await choose(page, 'radius', 'large')
    await choose(page, 'menu-color', 'default')
    await choose(page, 'menu-accent', 'subtle')

    // Writes are immediate replaceState, so the URL is current straight away.
    await expect(page).toHaveURL(/base=slate/)
    const shared = page.url()
    for (const part of ['theme=rose', 'radius=large', 'menu=default', 'accent=subtle']) {
      expect(shared).toContain(part)
    }

    const expected = {
      primary: await token(page, '--primary'),
      radius: await token(page, '--radius'),
      menu: await token(page, '--menu'),
    }

    // A genuinely fresh page, as a recipient would open it.
    const fresh = await page.context().newPage()
    await fresh.goto(shared)

    await expect(option(fresh, 'base-color', 'slate')).toBeChecked()
    await expect(option(fresh, 'theme-color', 'rose')).toBeChecked()
    await expect(option(fresh, 'radius', 'large')).toBeChecked()
    await expect(option(fresh, 'menu-color', 'default')).toBeChecked()
    await expect(option(fresh, 'menu-accent', 'subtle')).toBeChecked()

    expect(await token(fresh, '--primary')).toBe(expected.primary)
    expect(await token(fresh, '--radius')).toBe(expected.radius)
    expect(await token(fresh, '--menu')).toBe(expected.menu)

    await fresh.close()
  })

  test('restores both fonts from a link', async ({ page }) => {
    // Both families exist in the bundled fallback, so this passes without a key.
    await page.goto('/?v=1&heading=Playfair+Display&body=Lora')

    await expect(page.getByRole('button', { name: 'Heading font' })).toContainText(
      'Playfair Display',
    )
    await expect(page.getByRole('button', { name: 'Body font' })).toContainText('Lora')

    const headingFamily = await page
      .locator('.storefront h1')
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily)
    expect(headingFamily).toContain('Playfair Display')
  })

  test('defaults only the invalid field and leaves the URL untouched', async ({ page }) => {
    const link = '/?v=1&base=chartreuse&theme=rose&radius=large'
    await page.goto(link)

    // The one bad value falls back on its own...
    await expect(option(page, 'base-color', 'neutral')).toBeChecked()
    // ...while everything valid in the same link survives.
    await expect(option(page, 'theme-color', 'rose')).toBeChecked()
    await expect(option(page, 'radius', 'large')).toBeChecked()

    await expect(notice(page)).toContainText('base color')

    // The link is left exactly as it arrived, so it stays inspectable.
    expect(new URL(page.url()).search).toBe(new URL(link, page.url()).search)
  })

  test('reports an unsupported version without rewriting the link', async ({ page }) => {
    await page.goto('/?v=99&base=slate')

    await expect(notice(page)).toContainText('v99')
    await expect(option(page, 'base-color', 'neutral')).toBeChecked()
    expect(page.url()).toContain('v=99')
  })
})
