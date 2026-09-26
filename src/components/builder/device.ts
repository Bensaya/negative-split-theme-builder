export type Device = 'desktop' | 'mobile'

/**
 * Width the preview container is pinned to.
 *
 * Mobile is capped by the space actually available, not a bare 420px: on a
 * phone the panel is narrower than that, and a fixed width would push the
 * page into horizontal scrolling. The storefront reads its own width through
 * @container, so constraining this box is all it takes - the browser viewport
 * and the preview's available width stay separate things.
 */
export const DEVICE_WIDTH: Record<Device, string> = {
  desktop: '100%',
  mobile: 'min(420px, 100%)',
}
