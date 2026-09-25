/**
 * The theme model: one typed object that is the single source of truth for
 * everything the builder controls.
 *
 * Option lists are declared `as const` and the types are derived from them, so
 * adding a swatch to a list automatically widens the type, the URL validator
 * and Shuffle - there is no second place to update and no way for them to drift.
 */

export const BASE_COLORS = ['neutral', 'slate', 'gray', 'zinc', 'stone'] as const
export type BaseColor = (typeof BASE_COLORS)[number]

export const THEME_COLORS = [
  'lime', 'blue', 'rose', 'amber', 'cyan',
  'emerald', 'violet', 'orange', 'teal', 'fuchsia', 'red', 'indigo',
] as const
export type ThemeColor = (typeof THEME_COLORS)[number]

export const RADII = ['none', 'small', 'medium', 'large'] as const
export type Radius = (typeof RADII)[number]

export const MENU_COLORS = ['default', 'inverted'] as const
export type MenuColor = (typeof MENU_COLORS)[number]

export const MENU_ACCENTS = ['subtle', 'bold'] as const
export type MenuAccent = (typeof MENU_ACCENTS)[number]

export interface Theme {
  baseColor: BaseColor
  themeColor: ThemeColor
  headingFont: string
  bodyFont: string
  radius: Radius
  menuColor: MenuColor
  menuAccent: MenuAccent
}

/** The theme that ships when there is no URL to restore from. */
export const DEFAULT_THEME: Theme = {
  baseColor: 'neutral',
  themeColor: 'lime',
  headingFont: 'Inter Tight',
  bodyFont: 'Inter',
  radius: 'medium',
  menuColor: 'inverted',
  menuAccent: 'bold',
}

/** Human labels for the sidebar. Kept beside the lists so they cannot drift. */
export const RADIUS_LABELS: Record<Radius, string> = {
  none: 'None',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

export const RADIUS_REM: Record<Radius, string> = {
  none: '0rem',
  small: '0.375rem',
  medium: '0.625rem',
  large: '1rem',
}

export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
