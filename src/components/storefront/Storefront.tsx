import { ArrowRight, Search, ShoppingBag } from 'lucide-react'
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
    <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm tabular-nums text-muted-foreground">
      <div className="flex gap-1.5">
        <dt className="sr-only">Heel-to-toe drop</dt>
        <dd>{product.drop} mm drop</dd>
      </div>
      <span aria-hidden className="opacity-40">
        /
      </span>
      <div className="flex gap-1.5">
        <dt className="sr-only">Stack height</dt>
        <dd>{product.stack} mm stack</dd>
      </div>
      <span aria-hidden className="opacity-40">
        /
      </span>
      <div className="flex gap-1.5">
        <dt className="sr-only">Weight</dt>
        <dd>{product.weight} oz</dd>
      </div>
    </dl>
  )
}

function Header() {
  return (
    <header
      className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4"
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
          <span
            className="rounded-sm px-1.5 text-xs font-semibold tabular-nums"
            style={{
              background: 'var(--menu-accent)',
              color: 'var(--menu-accent-foreground)',
            }}
          >
            2
          </span>
        </span>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="grid items-center gap-8 px-6 py-12 @3xl:grid-cols-[1.05fr_1fr] @3xl:py-16">
      <div>
        <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight text-balance @3xl:text-5xl">
          Find your next favorite run.
        </h1>
        <p className="mt-4 max-w-[38ch] text-muted-foreground">
          Good shoes. Great miles. Find the pair that fits your run.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-5">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
          >
            Shop running shoes
            <ArrowRight className="size-4" aria-hidden />
          </button>
          <a href="#grid" className="text-sm underline underline-offset-4">
            Explore the collection
          </a>
        </div>
      </div>

      <img
        src="/products/hero.webp"
        alt="A runner on an empty road at sunrise"
        className="aspect-[16/10] w-full max-w-full rounded-lg object-cover"
        loading="eager"
      />
    </section>
  )
}

function Featured() {
  return (
    <section className="px-6 pb-12">
      <div className="grid items-center gap-8 rounded-xl bg-muted p-6 @3xl:grid-cols-[1.1fr_1fr] @3xl:p-10">
        <img
          src={FEATURED.image}
          alt={FEATURED.alt}
          className="aspect-[4/3] w-full max-w-full rounded-lg object-cover"
          loading="lazy"
        />
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            This week&rsquo;s pick
          </p>
          <h2 className="font-heading mt-2 text-3xl font-bold tracking-tight">{FEATURED.name}</h2>
          <p className="mt-2 text-muted-foreground">{FEATURED.blurb}</p>
          <div className="mt-4">
            <Spec product={FEATURED} />
          </div>
          <p className="font-heading mt-5 text-2xl font-bold tabular-nums">
            &euro;{FEATURED.price}
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
          >
            Shop {FEATURED.name}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}

function Grid() {
  return (
    <section id="grid" className="px-6 pb-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Find your pace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Four spikes, one last. Sized for racing, not for training.
          </p>
        </div>
        <a href="#" className="flex items-center gap-1.5 text-sm underline underline-offset-4">
          View all
          <ArrowRight className="size-3.5" aria-hidden />
        </a>
      </div>

      <ul className="grid grid-cols-1 gap-5 @lg:grid-cols-2 @4xl:grid-cols-4">
        {PRODUCTS.map((p) => (
          <li key={p.id} className="flex flex-col">
            <img
              src={p.image}
              alt={p.alt}
              className="aspect-[4/3] w-full max-w-full rounded-lg border border-border object-cover"
              loading="lazy"
            />
            <h3 className="font-heading mt-3 text-base font-semibold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.category}</p>
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              {p.drop} mm / {p.stack} mm / {p.weight} oz
            </p>
            <div className="mt-auto flex items-center justify-between gap-3 pt-4">
              <span className="font-heading font-bold tabular-nums">&euro;{p.price}</span>
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

export function Storefront() {
  return (
    // bg-background / text-foreground / font-sans must be re-applied here:
    // shadcn puts them on <body>, which resolves outside this subtree.
    <div className="@container min-h-full bg-background font-sans text-foreground">
      <Header />
      <Hero />
      <Featured />
      <Grid />
    </div>
  )
}
