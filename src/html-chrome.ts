import { site } from "./config";
import { CSS } from "./site-css";
import { CHROME_JS } from "./chrome-js";
import {
  formatCents,
  parseSizes,
  type CoffeeType,
  type OrderLine,
  type OrderRow,
} from "./db";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * JSON destined for a <script> block. Script elements are raw text, so HTML
 * entities are never decoded inside them — escaping with esc() would corrupt
 * the payload. Only `<` needs neutralising so the parser cannot see `</script`.
 */
export function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** Widths we ship pre-scaled copies of, so cards do not download a 1200px photo. */
const VARIANTS: Record<string, number[]> = {
  "/img/hero.webp": [768, 1200, 1536],
  "/img/machine.webp": [700, 1100, 1400],
  "/img/espresso-martini.webp": [480, 800, 1200],
  "/img/shaken-espresso.webp": [480, 800, 1200],
  "/img/pistachio-cortado.webp": [480, 800, 1200],
  "/img/spanish-latte.webp": [480, 800, 1200],
  "/img/affogato.webp": [480, 800, 1200],
  "/img/espresso-tonic.webp": [480, 800, 1200],
  "/img/dirty-chai.webp": [480, 800, 1200],
  "/img/tiramisu.webp": [480, 800, 1200],
};

/** Largest variant is the original file; the rest are `name-<w>.webp`. */
function srcsetFor(path: string): string {
  const widths = VARIANTS[path];
  if (!widths) return "";
  const stem = path.replace(/\.webp$/, "");
  const max = Math.max(...widths);
  return widths
    .map((w) => `${w === max ? path : `${stem}-${w}.webp`} ${w}w`)
    .join(", ");
}

type ImgOptions = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
};

export function img({ src, alt, width, height, sizes, className, priority }: ImgOptions): string {
  const set = srcsetFor(src);
  return `<img src="${esc(src)}" alt="${esc(alt)}" width="${width}" height="${height}"${
    className ? ` class="${className}"` : ""
  }${set ? ` srcset="${esc(set)}"` : ""}${sizes && set ? ` sizes="${esc(sizes)}"` : ""}${
    priority ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"'
  }>`;
}

/** Digits-only tel: target, e.g. "(919) 555-0148" -> "+19195550148". */
export function telHref(): string {
  const digits = site.phone.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

export function mapsHref(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${site.legalName}, ${site.address}`,
  )}`;
}

/** Home opening credits. Same coupe geometry as public/mark.svg. Plays on every home load. */
function introOverlay(): string {
  return `<div id="intro" aria-hidden="true" tabindex="-1">
  <div class="intro__stage">
    <svg class="intro__mark" viewBox="0 0 64 64" focusable="false" aria-hidden="true">
      <path class="intro__draw intro__draw--bowl" pathLength="1" d="M10 21C10 34.5 19.5 43 32 43S54 34.5 54 21Z" fill="none" stroke-width="2.2"></path>
      <ellipse class="intro__draw intro__draw--rim" pathLength="1" cx="32" cy="21" rx="22" ry="4" fill="none" stroke-width="2"></ellipse>
      <path class="intro__draw intro__draw--stem" pathLength="1" d="M32 43 L32 55" fill="none" stroke-width="2.4"></path>
      <ellipse class="intro__draw intro__draw--foot" pathLength="1" cx="32" cy="56.4" rx="12" ry="2.8" fill="none" stroke-width="2"></ellipse>
      <g class="intro__beans">
        <ellipse cx="26.5" cy="20.4" rx="2.5" ry="1.6" transform="rotate(-18 26.5 20.4)"></ellipse>
        <ellipse cx="32" cy="22.4" rx="2.5" ry="1.6" transform="rotate(12 32 22.4)"></ellipse>
        <ellipse cx="37.4" cy="20.2" rx="2.5" ry="1.6" transform="rotate(-8 37.4 20.2)"></ellipse>
      </g>
    </svg>
    <p class="intro__word">Sip &amp; Nest</p>
  </div>
</div>`;
}

/** Inline brand mark. Brass coupe on the page tokens. */
function markSvg(className = "brand__mark"): string {
  return `<svg class="${className}" viewBox="0 0 64 64" role="img" aria-hidden="true" focusable="false">
  <path d="M10 21C10 34.5 19.5 43 32 43S54 34.5 54 21Z" fill="none" stroke="var(--accent)" stroke-width="2.2"></path>
  <ellipse cx="32" cy="21" rx="22" ry="4" fill="var(--accent)" fill-opacity=".18"></ellipse>
  <ellipse cx="32" cy="21" rx="22" ry="4" fill="none" stroke="var(--accent)" stroke-width="2"></ellipse>
  <g fill="var(--accent)">
    <ellipse cx="26.5" cy="20.4" rx="2.5" ry="1.6" transform="rotate(-18 26.5 20.4)"></ellipse>
    <ellipse cx="32" cy="22.4" rx="2.5" ry="1.6" transform="rotate(12 32 22.4)"></ellipse>
    <ellipse cx="37.4" cy="20.2" rx="2.5" ry="1.6" transform="rotate(-8 37.4 20.2)"></ellipse>
    <rect x="30.4" y="42" width="3.2" height="13" rx="1.5"></rect>
    <ellipse cx="32" cy="56.4" rx="12" ry="2.8"></ellipse>
  </g>
</svg>`;
}

function header(path: string): string {
  const onMenu = path === "/menu" || path.startsWith("/menu");
  return `<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="/">
      ${markSvg()}
      <span class="brand__name">Sip &amp; Nest</span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      <a href="/menu"${onMenu ? ' aria-current="page"' : ""}>Menu</a>
    </nav>
  </div>
</header>`;
}

function footer(): string {
  return `<footer class="site-footer">
  <div class="wrap">
    <p><a class="brand" href="/"><span class="brand__name">Sip &amp; Nest</span></a></p>
    <p><a href="${mapsHref()}" target="_blank" rel="noopener">${esc(site.address)}</a> · ${esc(site.hoursShort)}</p>
    <p><a href="tel:${telHref()}">${esc(site.phone)}</a> · <a href="/menu">Menu</a> · <a href="/#about">About</a></p>
  </div>
</footer>`;
}

export const HOURS = [
  ["Monday", "Closed"],
  ["Tuesday", "7:30am – 4pm"],
  ["Wednesday", "7:30am – 4pm"],
  ["Thursday", "7:30am – 4pm"],
  ["Friday", "7:30am – 4pm"],
  ["Saturday", "7:30am – 4pm"],
  ["Sunday", "7:30am – 4pm"],
] as const;

function structuredData(drinks: CoffeeType[]): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: site.name,
    legalName: site.legalName,
    description:
      "Specialty coffee bar in Holly Springs, North Carolina. Espresso martinis, shaken espresso, cortados and pastry. Order ahead and pay at pickup.",
    url: `https://${site.domain}/`,
    image: `https://${site.domain}/og.jpg`,
    logo: `https://${site.domain}/icon-512.png`,
    telephone: site.phone,
    email: site.email,
    priceRange: "$$",
    servesCuisine: ["Coffee", "Espresso", "Pastry"],
    address: {
      "@type": "PostalAddress",
      streetAddress: "112 Hartness Dr",
      addressLocality: site.city,
      addressRegion: "NC",
      addressCountry: "US",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "07:30",
        closes: "16:00",
      },
    ],
    acceptsReservations: false,
    hasMap: mapsHref(),
    ...(drinks.length ? { hasMenu: {
      "@type": "Menu",
      url: `https://${site.domain}/menu`,
      hasMenuSection: [
        {
          "@type": "MenuSection",
          name: "The full list",
          hasMenuItem: drinks.map((d) => ({
            "@type": "MenuItem",
            name: d.name,
            description: d.description,
            offers: parseSizes(d.sizes_json).map((s) => ({
              "@type": "Offer",
              name: s.label,
              price: (s.cents / 100).toFixed(2),
              priceCurrency: "USD",
            })),
          })),
        },
      ],
    } } : {}),
  };
  return `<script type="application/ld+json">${jsonScript(data)}</script>`;
}

type LayoutOptions = {
  title: string;
  path: string;
  description: string;
  body: string;
  drinks?: CoffeeType[];
  ogImage?: string;
  /** Receipts and error pages: keep them out of the index and off a shared canonical. */
  noindex?: boolean;
};

export function layout({ title, path, description, body, drinks, ogImage, noindex }: LayoutOptions): string {
  const pageTitle =
    path === "/" ? `${site.name} — Specialty coffee bar in ${site.city}, NC` : `${title} — ${site.name}`;
  const canonical = `https://${site.domain}${path === "/" ? "/" : path}`;
  const social = `https://${site.domain}${ogImage ?? "/og.jpg"}`;
  return `<!doctype html>
<html lang="en" class="no-js${path === "/" ? " has-intro" : ""}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta name="theme-color" content="#0b0a08">
<link rel="preload" href="/fonts/instrument-serif.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/source-sans.woff2" as="font" type="font/woff2" crossorigin>
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(social)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="An espresso martini on the bar at Sip &amp; Nest">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(social)}">
<link rel="icon" href="/mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<script>document.documentElement.classList.remove("no-js");try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("intro-seen")}catch(e){}</script>
<style>${CSS}</style>
</head>
<body${path === "/" ? ' class="has-hero"' : ""}>
<a class="skip" href="#main">Skip to content</a>
${path === "/" ? introOverlay() : ""}
${header(path)}
<main id="main">
${body}
</main>
${footer()}
${noindex ? "" : structuredData(drinks ?? [])}
<script>${CHROME_JS}</script>
</body>
</html>`;
}
