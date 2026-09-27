import { Search, ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FEATURED, NAV_LINKS, PRODUCTS, type Product } from '@/data/products'

/**
 * The themed storefront.
 *
 * Every colour, radius and font here comes from a semantic token, never from a
 * Tailwind palette utility like `bg-lime-500`. That is not a style preference:
 * `@theme inline` only makes the *semantic* tokens overridable per subtree, so
 * a stock palette utility would ignore the theme entirely.
 *
 * Widths respond to `@container`, not the viewport, so the preview reflows
 * because the preview is narrow - which is what the device toggle demonstrates.
 */

function Spec({ product }: { product: Product }) {
  return (
    <dl className="grid grid-cols-3 gap-3 border-y border-border py-3 text-sm tabular-nums">
      {[
        ['Drop', `${product.drop} mm`],
        ['Stack', `${product.stack} mm`],
        ['Weight', `${product.weight} oz`],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Header() {
  return (
    <header
      className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4 @3xl:px-8"
      style={{ background: 'var(--menu)', color: 'var(--menu-foreground)' }}
    >
      <span className="font-heading text-lg font-bold tracking-tight uppercase whitespace-nowrap">
        Negative Split
      </span>

      {/*
        Below ~32rem of CONTAINER width the nav drops to its own full-width
        row instead of wrapping one link per line, which is what it did
        before. `ml-auto` on the actions keeps them right-aligned in both
        arrangements, so no flex-1 spacer is needed.
      */}
      <nav
        aria-label="Store"
        className="order-3 flex w-full flex-wrap gap-5 text-sm @lg:order-none @lg:w-auto"
      >
        {NAV_LINKS.map((link, i) => (
          <a
            key={link}
            href="#"
            aria-current={i === 0 ? 'page' : undefined}
            className="border-b-2 border-transparent pb-0.5 opacity-75 transition-opacity hover:opacity-100 aria-[current]:opacity-100"
            style={i === 0 ? { borderBottomColor: 'var(--menu-accent)' } : undefined}
          >
            {link}
          </a>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-4 text-sm whitespace-nowrap">
        <button type="button" aria-label="Search" className="opacity-75 hover:opacity-100">
          <Search className="size-4" />
        </button>
        <span className="flex items-center gap-2">
          <ShoppingBag className="size-4" aria-hidden />
          Bag
          <Badge
            className="tabular-nums"
            style={{
              background: 'var(--menu-accent)',
              color: 'var(--menu-accent-foreground)',
            }}
          >
            2
          </Badge>
        </span>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="store-hero grid items-center gap-7 px-6 py-8 @3xl:grid-cols-[1fr_1.05fr] @3xl:gap-10 @3xl:px-8 @3xl:py-10">
      <div>
        <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          For the miles ahead
        </p>
        <h1 className="font-heading max-w-[14ch] text-4xl leading-[1.04] font-bold tracking-[-0.02em] text-balance @3xl:text-5xl">
          Find your next favorite run.
        </h1>
        <p className="mt-4 max-w-[38ch] text-muted-foreground">
          Good shoes. Great miles. Find the pair that fits your run.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Button size="lg">Shop running shoes</Button>
          <Button variant="link" asChild>
            <a href="#grid">Explore the collection</a>
          </Button>
        </div>
      </div>

      <img
        src="/products/hero.webp"
        alt="A runner on an empty road at sunrise"
        className="hero-image w-full rounded-lg object-cover"
        loading="eager"
      />
    </section>
  )
}

function Featured() {
  return (
    <section className="px-6 pb-10 @3xl:px-8">
      <div className="featured-product grid items-center gap-6 overflow-hidden rounded-xl border border-border bg-card @3xl:grid-cols-[1.1fr_1fr]">
        <img
          src={FEATURED.image}
          alt={FEATURED.alt}
          className="featured-image w-full object-contain"
          loading="lazy"
        />
        <div className="px-6 pb-6 @3xl:py-6 @3xl:pr-8 @3xl:pl-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            This week&rsquo;s pick
          </p>
          <h2 className="font-heading mt-2 text-3xl font-bold tracking-tight">{FEATURED.name}</h2>
          <p className="mt-2 text-muted-foreground">{FEATURED.blurb}</p>
          <div className="mt-4">
            <Spec product={FEATURED} />
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums">&euro;{FEATURED.price}</p>
          <Button size="lg" className="mt-4">
            Shop {FEATURED.name}
          </Button>
        </div>
      </div>
    </section>
  )
}

function Grid() {
  return (
    <section id="grid" className="px-6 pb-10 @3xl:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Find your pace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Four spikes, one last. Sized for racing, not for training.
          </p>
        </div>
        <Button variant="link" asChild className="px-0">
          <a href="#">View all</a>
        </Button>
      </div>

      <ul className="grid grid-cols-1 gap-x-5 gap-y-8 @sm:grid-cols-2 @5xl:grid-cols-4">
        {PRODUCTS.map((p) => (
          <li key={p.id} className="flex flex-col">
            <img
              src={p.image}
              alt={p.alt}
              className="product-image aspect-[4/3] w-full rounded-lg border border-border bg-card object-contain"
              loading="lazy"
            />
            <h3 className="font-heading mt-3 text-base font-semibold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.category}</p>
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              {p.drop} mm drop · {p.weight} oz
            </p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
              <span className="font-bold tabular-nums">&euro;{p.price}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
              >
                <ShoppingBag className="size-3.5" aria-hidden />
                Add to bag
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}


function Footer() {
  const columns = [
    { title: 'Shop', links: ['Racing', 'Track', 'Road', 'Sale'] },
    { title: 'Fitting', links: ['Gait check', 'Size guide', 'Book a fitting'] },
    { title: 'Help', links: ['Delivery', 'Returns', 'Contact'] },
  ]
  return (
    <footer className="border-t border-border px-6 py-10 @3xl:px-8">
      <div className="grid gap-8 @3xl:grid-cols-[1.2fr_repeat(3,auto)]">
        <div className="max-w-[34ch]">
          <p className="font-heading text-base font-semibold">Race-week email</p>
          <p className="mt-1 text-sm text-muted-foreground">
            One note a week: what landed, what is worth your money, and what is not.
          </p>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <Input
              id="newsletter-email"
              type="email"
              placeholder="you@example.com"
              className="min-w-0 flex-1"
            />
            <Button type="submit">Sign up</Button>
          </form>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="font-heading text-sm font-semibold">{column.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-foreground hover:underline underline-offset-4">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
        Negative Split, Haifa. Returns accepted within 50 km of running.
      </p>
    </footer>
  )
}

export function Storefront() {
  return (
    // bg-background / text-foreground / font-sans must be re-applied here:
    // shadcn puts them on <body>, which resolves outside this subtree.
    <div className="storefront @container min-h-full bg-background font-sans text-foreground">
      <Header />
      <Hero />
      <Featured />
      <Grid />
      <Footer />
    </div>
  )
}
