/**
 * Storefront content.
 *
 * The specs are real running vocabulary at plausible values: heel-to-toe drop
 * and stack height in millimetres, weight in ounces for a men's 9. Track spikes
 * genuinely do sit at 4-6 mm drop and under 6 oz, where the road shoe is 32 mm
 * of stack and 7.4 oz. A store that gets these wrong is obvious to anyone who
 * runs, and dense factual copy is a large part of what makes a fake shop read
 * as a real one.
 */

export interface Product {
  id: string
  name: string
  category: string
  blurb: string
  drop: number
  stack: number
  weight: number
  price: number
  image: string
  alt: string
}

/** The one road shoe, shown large in the featured band. */
export const FEATURED: Product = {
  id: 'velo-4',
  name: 'Velo 4',
  category: 'Tempo',
  blurb: 'A little more pace. A lot more fun.',
  drop: 6,
  stack: 32,
  weight: 7.4,
  price: 165,
  image: '/products/velo-4.webp',
  alt: 'Velo 4 tempo shoe, side profile',
}

/** The racing wall. Four colourways, one silhouette, shot identically. */
export const PRODUCTS: Product[] = [
  {
    id: 'mile-1',
    name: 'Mile 1',
    category: 'Racing',
    blurb: 'The one you save for.',
    drop: 5,
    stack: 18,
    weight: 5.2,
    price: 230,
    image: '/products/mile-1.jpg',
    alt: 'Mile 1 racing spike in white, side profile',
  },
  {
    id: 'split-3',
    name: 'Split 3',
    category: 'Track',
    blurb: 'Built for the back straight.',
    drop: 4,
    stack: 15,
    weight: 4.6,
    price: 180,
    image: '/products/split-3.jpg',
    alt: 'Split 3 racing spike in neon green, side profile',
  },
  {
    id: 'kick-r',
    name: 'Kick R',
    category: 'Road',
    blurb: 'Everyday miles, quick when asked.',
    drop: 8,
    stack: 34,
    weight: 8.6,
    price: 145,
    image: '/products/kick-r.jpg',
    alt: 'Kick R racing spike in red, side profile',
  },
  {
    id: 'lane-8',
    name: 'Lane 8',
    category: 'Sale',
    blurb: 'Last season\u2019s colour, same shoe.',
    drop: 4,
    stack: 16,
    weight: 4.9,
    price: 110,
    image: '/products/lane-8.jpg',
    alt: 'Lane 8 cross country spike in pale blue, side profile',
  },
]

/**
 * The nav names what the shop actually stocks. Listing "Trail" would promise a
 * category none of the products belong to.
 */
export const NAV_LINKS = ['Racing', 'Track', 'Road', 'Sale'] as const
