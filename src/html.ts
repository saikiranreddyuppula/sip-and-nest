import { pickupDays, pickupSlots, site } from "./config";
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
function jsonScript(value: unknown): string {
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

function img({ src, alt, width, height, sizes, className, priority }: ImgOptions): string {
  const set = srcsetFor(src);
  return `<img src="${esc(src)}" alt="${esc(alt)}" width="${width}" height="${height}"${
    className ? ` class="${className}"` : ""
  }${set ? ` srcset="${esc(set)}"` : ""}${sizes && set ? ` sizes="${esc(sizes)}"` : ""}${
    priority ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"'
  }>`;
}

const CSS = `
/* ---------- tokens ---------- */
:root {
  color-scheme: light;
  --paper: #f7f2ea;
  --paper-2: #f1e9de;
  --surface: #fffcf7;
  --ink: #1b1310;
  --ink-2: #574a40;
  --copper: #8b3a2a;
  --copper-ink: #8b3a2a;
  --copper-soft: #f0e2d9;
  --line: #e5d9ca;
  --line-strong: #d6c6b3;
  --field-line: #998772;
  --night: #17100c;
  --night-ink: #f4ece2;
  --night-ink-2: #c3b3a3;
  --btn-bg: #8b3a2a;
  --btn-ink: #fdf8f2;
  --focus: #8b3a2a;
  --good-bg: #e4eee2;
  --good-ink: #2f4a33;
  --bad-bg: #f6e2da;
  --bad-ink: #8a2f1c;
  --shadow: 0 1px 2px rgba(27,19,16,.05), 0 8px 24px -12px rgba(27,19,16,.18);
  --shadow-lift: 0 2px 4px rgba(27,19,16,.06), 0 18px 36px -18px rgba(27,19,16,.28);

  --serif: Palatino, "Palatino Linotype", "Iowan Old Style", "Book Antiqua", Georgia, "Times New Roman", serif;
  --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  --fs-display: clamp(2.6rem, 1.5rem + 5vw, 5.25rem);
  --fs-h1: clamp(2rem, 1.45rem + 2.4vw, 3.15rem);
  --fs-h2: clamp(1.45rem, 1.2rem + 1.1vw, 2.05rem);
  --fs-h3: clamp(1.12rem, 1.05rem + .35vw, 1.32rem);
  --fs-body: clamp(1rem, .975rem + .12vw, 1.075rem);
  --fs-sm: .9375rem;
  --fs-xs: .8125rem;

  --gutter: clamp(1.15rem, 4vw, 2.75rem);
  --wrap: 1240px;
  --wrap-text: 40rem;
  --section: clamp(3.25rem, 7vw, 6rem);
  --radius: 18px;
  --radius-sm: 12px;
  --radius-pill: 999px;
  --header-h: 60px;
  --photo-filter: sepia(.12) saturate(1.04) brightness(.99);
}
@media (min-width: 800px) { :root { --header-h: 72px; } }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --paper: #13100d;
    --paper-2: #191512;
    --surface: #1d1814;
    --ink: #f4ece2;
    --ink-2: #b7a596;
    --copper: #e0916b;
    --copper-ink: #e5a081;
    --copper-soft: #33231b;
    --line: #322820;
    --line-strong: #453729;
  --field-line: #857260;
    --field-line: #857260;
    --night: #0d0a08;
    --btn-bg: #a4482f;
    --btn-ink: #fff6ee;
    --focus: #e0916b;
    --good-bg: #1e2b1f;
    --good-ink: #b9d6bb;
    --bad-bg: #3a1f17;
    --bad-ink: #f0a68d;
    --shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 28px -14px rgba(0,0,0,.7);
    --shadow-lift: 0 2px 6px rgba(0,0,0,.45), 0 20px 40px -18px rgba(0,0,0,.8);
    --photo-filter: brightness(.9) saturate(.94);
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #13100d;
  --paper-2: #191512;
  --surface: #1d1814;
  --ink: #f4ece2;
  --ink-2: #b7a596;
  --copper: #e0916b;
  --copper-ink: #e5a081;
  --copper-soft: #33231b;
  --line: #322820;
  --line-strong: #453729;
  --night: #0d0a08;
  --btn-bg: #a4482f;
  --btn-ink: #fff6ee;
  --focus: #e0916b;
  --good-bg: #1e2b1f;
  --good-ink: #b9d6bb;
  --bad-bg: #3a1f17;
  --bad-ink: #f0a68d;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 28px -14px rgba(0,0,0,.7);
  --shadow-lift: 0 2px 6px rgba(0,0,0,.45), 0 20px 40px -18px rgba(0,0,0,.8);
  --photo-filter: brightness(.9) saturate(.94);
}

/* ---------- base ---------- */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
body {
  margin: 0;
  min-height: 100dvh;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: var(--fs-body);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-wrap: break-word;
}
[hidden] { display: none !important; }
.no-js .js-only { display: none !important; }
img, svg, video { display: block; max-width: 100%; }
img { height: auto; }
h1, h2, h3 { font-family: var(--serif); font-weight: 600; line-height: 1.12; letter-spacing: -.015em; margin: 0 0 .5em; }
h1 { font-size: var(--fs-h1); }
h2 { font-size: var(--fs-h2); }
h3 { font-size: var(--fs-h3); letter-spacing: -.005em; }
p { margin: 0 0 1rem; }
a { color: var(--copper-ink); text-decoration-thickness: 1px; text-underline-offset: 3px; }
a:hover { text-decoration-thickness: 2px; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; border-radius: 4px; }
a, button, input, select, textarea, summary { scroll-margin-top: calc(var(--header-h) + 1rem); }
::selection { background: var(--copper); color: #fff; }
hr { border: 0; border-top: 1px solid var(--line); margin: 2rem 0; }

.wrap {
  width: min(100% - var(--gutter) * 2, var(--wrap));
  margin-inline: auto;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
.wrap-text { max-width: var(--wrap-text); }
.section { padding-block: var(--section); }
.center { text-align: center; margin-inline: auto; }
.skip {
  position: absolute; left: -9999px; top: 0; z-index: 100;
  background: var(--btn-bg); color: var(--btn-ink);
  padding: .75rem 1.15rem; border-radius: 0 0 var(--radius-sm) 0; font-weight: 600;
}
.skip:focus { left: 0; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.kicker {
  font-family: var(--sans);
  font-size: var(--fs-xs);
  letter-spacing: .18em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--copper-ink);
  margin: 0 0 .75rem;
}
.lede { font-size: clamp(1.05rem, 1rem + .5vw, 1.28rem); line-height: 1.55; color: var(--ink-2); max-width: 34rem; }
.muted { color: var(--ink-2); }
.small { font-size: var(--fs-sm); }
.tabular { font-variant-numeric: tabular-nums; }

/* ---------- buttons ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  min-height: 46px; padding: .7rem 1.35rem;
  border: 1px solid transparent; border-radius: var(--radius-pill);
  background: var(--btn-bg); color: var(--btn-ink);
  font: inherit; font-size: var(--fs-sm); font-weight: 600; letter-spacing: .01em;
  text-decoration: none; cursor: pointer; text-align: center;
  transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease;
}
@media (hover: hover) and (pointer: fine) {
  .btn:hover { color: var(--btn-ink); transform: translateY(-1px); box-shadow: var(--shadow-lift); }
}
.btn:active { transform: translateY(0); }
.btn[disabled], .btn[aria-disabled="true"] { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
.btn--ghost { background: transparent; color: var(--copper-ink); border-color: var(--field-line); }
.btn--ghost:hover { color: var(--copper-ink); background: var(--copper-soft); }
.btn--onnight { background: var(--night-ink); color: var(--night); }
.btn--onnight:hover { color: var(--night); }
.btn--ghost-onnight { background: transparent; color: var(--night-ink); border-color: rgba(244,236,226,.4); }
.btn--ghost-onnight:hover { color: var(--night-ink); background: rgba(244,236,226,.12); }
.btn--wide { width: 100%; }
.btn--lg { min-height: 52px; padding: .85rem 1.75rem; font-size: 1rem; }
.btn-row { display: flex; flex-wrap: wrap; gap: .7rem; }

/* ---------- header ---------- */
.site-header {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in srgb, var(--paper) 95%, transparent);
  -webkit-backdrop-filter: saturate(1.4) blur(12px);
  backdrop-filter: saturate(1.4) blur(12px);
  border-bottom: 1px solid var(--line);
  padding-top: env(safe-area-inset-top);
}
.site-header__inner {
  display: flex; align-items: center; gap: 1rem;
  min-height: var(--header-h);
}
.brand { display: inline-flex; align-items: center; gap: .55rem; min-height: 44px; text-decoration: none; color: var(--ink); flex: none; }
.brand:hover { color: var(--ink); }
.brand__mark { width: 30px; height: 30px; flex: none; }
.brand__name { font-family: var(--serif); font-size: 1.22rem; font-weight: 600; letter-spacing: -.01em; line-height: 1; }
.brand__sub { display: none; font-size: var(--fs-xs); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-2); }
@media (min-width: 900px) { .brand__sub { display: block; } }
.site-nav { display: none; margin-left: auto; align-items: center; gap: .25rem; }
@media (min-width: 800px) { .site-nav { display: flex; } }
.site-nav a {
  display: inline-flex; align-items: center; min-height: 44px; padding: 0 .8rem;
  color: var(--ink); text-decoration: none; font-size: var(--fs-sm); font-weight: 600;
  border-radius: var(--radius-sm);
}
.site-nav a:hover { color: var(--copper-ink); background: var(--copper-soft); }
.site-nav a[aria-current="page"] { color: var(--copper-ink); }
.header-actions { display: flex; align-items: center; gap: .5rem; margin-left: auto; }
@media (min-width: 800px) { .header-actions { margin-left: .5rem; } }
.icon-btn {
  display: none; align-items: center; justify-content: center;
  width: 44px; height: 44px; flex: none;
  background: transparent; border: 1px solid var(--line); border-radius: var(--radius-pill);
  color: var(--ink); cursor: pointer; padding: 0;
}
.icon-btn:hover { background: var(--copper-soft); color: var(--copper-ink); }
.icon-btn svg { width: 19px; height: 19px; }
html:not(.no-js) .icon-btn { display: inline-flex; }
.header-cta { display: none; }
@media (min-width: 360px) { .header-cta { display: inline-flex; } }
@media (max-width: 559px) { .header-cta { padding: .6rem 1rem; } .brand__mark { width: 27px; height: 27px; } }

/* ---------- hero ---------- */
.hero { position: relative; isolation: isolate; background: var(--night); color: var(--night-ink); }
.hero__media { position: absolute; inset: 0; z-index: -2; }
.hero__media img { width: 100%; height: 100%; object-fit: cover; object-position: 62% 55%; }
.hero::after {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background:
    linear-gradient(180deg, rgba(12,8,6,.72) 0%, rgba(12,8,6,.28) 32%, rgba(12,8,6,.55) 72%, rgba(12,8,6,.92) 100%),
    linear-gradient(95deg, rgba(12,8,6,.78) 0%, rgba(12,8,6,.35) 55%, rgba(12,8,6,.1) 100%);
}
.hero__inner {
  display: flex; flex-direction: column; justify-content: flex-end;
  min-height: min(88svh, 720px);
  padding-block: clamp(3.5rem, 12vw, 7rem) clamp(2.25rem, 6vw, 4rem);
}
.hero h1 {
  font-size: var(--fs-display);
  max-width: 15ch;
  margin: 0 0 1rem;
  color: var(--night-ink);
  text-wrap: balance;
}
.hero .kicker { color: #e8a683; }
.hero__lede { color: var(--night-ink-2); font-size: clamp(1.05rem, 1rem + .55vw, 1.3rem); max-width: 34rem; margin-bottom: 1.75rem; }
.hero .btn-row { margin-bottom: 1.5rem; }
.status {
  display: inline-flex; align-self: flex-start; align-items: center; gap: .55rem;
  font-size: var(--fs-sm); color: var(--night-ink-2);
  background: rgba(12,8,6,.45); border: 1px solid rgba(244,236,226,.22);
  border-radius: var(--radius-pill); padding: .45rem .95rem;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.status__dot { width: 8px; height: 8px; border-radius: 50%; background: #8fbf82; flex: none; box-shadow: 0 0 0 3px rgba(143,191,130,.22); }
.status[data-open="false"] .status__dot { background: #d9a04f; box-shadow: 0 0 0 3px rgba(217,160,79,.2); }
.status[data-open="unknown"] .status__dot { background: #b9a89a; box-shadow: 0 0 0 3px rgba(185,168,154,.18); }

/* ---------- marquee / info strip ---------- */
.strip {
  background: var(--paper-2); border-block: 1px solid var(--line);
  font-size: var(--fs-sm);
}
.strip__inner { display: flex; flex-wrap: wrap; gap: .5rem 2rem; padding-block: .9rem; align-items: center; }
.strip__item { display: inline-flex; align-items: center; gap: .5rem; color: var(--ink-2); }
.strip__item strong { color: var(--ink); font-weight: 600; }
.strip a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line-strong); }
.strip a:hover { color: var(--copper-ink); border-color: currentColor; }

/* ---------- section headings ---------- */
.section-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: clamp(1.5rem, 3vw, 2.5rem); }
.section-head h2 { margin: 0; }
.section-head p { margin: 0; }
.section-head a { display: inline-block; padding-block: 4px; }
.rule-label {
  font-family: var(--sans);
  font-weight: 600;
  display: flex; align-items: center; gap: 1rem;
  font-size: var(--fs-xs); letter-spacing: .18em; text-transform: uppercase; font-weight: 600;
  color: var(--ink-2); margin: 0 0 1.5rem;
}
.rule-label::after { content: ""; flex: 1; height: 1px; background: var(--line); }

/* ---------- drink cards ---------- */
.grid { display: grid; gap: clamp(1.25rem, 2.5vw, 2rem); grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); }
.grid--fit { grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); }
.card {
  display: flex; flex-direction: column;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
  overflow: hidden; box-shadow: var(--shadow);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); border-color: var(--line-strong); }
}
.card { scroll-margin-top: calc(var(--header-h) + 84px); }
.card__media { position: relative; background: var(--paper-2); }
.card__media img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; filter: var(--photo-filter); }
.card__flag {
  position: absolute; top: .7rem; left: .7rem;
  background: var(--surface); color: var(--copper-ink);
  border-radius: var(--radius-pill); padding: .25rem .7rem;
  font-size: var(--fs-xs); font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  box-shadow: var(--shadow);
}
.card__body { display: flex; flex-direction: column; flex: 1; padding: 1.05rem 1.15rem 1.15rem; }
.card__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .1rem .75rem; }
.card__name { flex: 1 1 auto; min-width: min(100%, 9rem); }
.card__price { flex: 0 0 auto; }
.card__name { font-family: var(--serif); font-size: var(--fs-h3); margin: 0; }
.card__price { font-weight: 600; font-size: var(--fs-sm); color: var(--copper-ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
.card__desc { color: var(--ink-2); font-size: var(--fs-sm); margin: .4rem 0 1rem; }
.card__actions { margin-top: auto; display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.card__actions select { flex: 1 1 100%; width: 100%; }
.card__actions .stepper { flex: 0 0 auto; }
.card__actions .btn { flex: 1 1 5rem; }
.btn.is-added { background: var(--good-bg); color: var(--good-ink); }
.btn.is-added:hover { color: var(--good-ink); }
.card--out { opacity: .72; }
.card--out .card__media img { filter: grayscale(.75); }

/* ---------- form controls ---------- */
label { display: block; font-size: var(--fs-sm); font-weight: 600; margin: 0 0 .35rem; }
.field { margin-bottom: 1.15rem; }
.field__hint { font-size: var(--fs-xs); color: var(--ink-2); font-weight: 400; margin: .3rem 0 0; }
input, select, textarea {
  font: inherit; font-size: max(16px, var(--fs-sm)); color: var(--ink);
  background: var(--surface); border: 1px solid var(--field-line);
  border-radius: var(--radius-sm); padding: .7rem .85rem; min-height: 46px; width: 100%;
  transition: border-color .15s ease, box-shadow .15s ease;
}
input:hover, select:hover, textarea:hover { border-color: var(--copper); }
input:focus-visible, select:focus-visible, textarea:focus-visible { border-color: var(--copper); outline-offset: 0; }
textarea { min-height: 7rem; resize: vertical; line-height: 1.5; }
select {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: right 1.05rem center, right .78rem center;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 2.25rem;
}
.field-row { display: grid; gap: 1rem; grid-template-columns: 1fr; }
@media (min-width: 560px) { .field-row { grid-template-columns: 1fr 1fr; } }

.stepper { display: inline-flex; align-items: center; border: 1px solid var(--field-line); border-radius: var(--radius-pill); background: var(--surface); flex: none; }
.stepper button {
  width: 36px; height: 44px; border: 0; background: transparent; color: var(--ink);
  font: inherit; font-size: 1.15rem; line-height: 1; cursor: pointer; border-radius: var(--radius-pill);
}
.stepper button:hover { color: var(--copper-ink); background: var(--copper-soft); }
.stepper output { min-width: 1.5rem; text-align: center; font-size: var(--fs-sm); font-weight: 600; font-variant-numeric: tabular-nums; }

/* ---------- notices ---------- */
.notice { border-radius: var(--radius-sm); padding: .85rem 1.1rem; margin: 0 0 1.5rem; font-size: var(--fs-sm); display: flex; gap: .6rem; }
.notice--good { background: var(--good-bg); color: var(--good-ink); }
.notice--bad { background: var(--bad-bg); color: var(--bad-ink); }
.recall {
  display: inline-flex; align-items: center; gap: .5rem;
  background: var(--copper-soft); color: var(--copper-ink);
  border-radius: var(--radius-pill); padding: .5rem 1rem; font-size: var(--fs-sm); margin: 0 0 1.25rem;
}
.trap { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.nojs-note { display: none; }
.no-js .nojs-note { display: flex; }
.no-js .slip { display: none; }

/* ---------- menu page ---------- */
.page-head { display: grid; gap: clamp(1.5rem, 3vw, 2.5rem); padding-top: clamp(2rem, 5vw, 3.5rem); align-items: start; }
@media (min-width: 900px) { .page-head { grid-template-columns: minmax(0, 1fr) 320px; } }
.page-head h1 { margin-bottom: .4rem; }
.page-head__aside { font-size: var(--fs-sm); }
.stack { margin: .9rem 0 0; padding: .9rem 0 0; border-top: 1px solid var(--line); }
.stack dt { font-size: var(--fs-xs); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); margin: 0 0 .15rem; }
.stack dd { margin: 0 0 .75rem; }
.stack dd:last-child { margin-bottom: 0; }
.status--plain {
  background: transparent; border: 0; padding: 0; color: var(--ink);
  font-weight: 600; -webkit-backdrop-filter: none; backdrop-filter: none;
}
.catnav {
  position: sticky; top: var(--header-h); z-index: 40;
  background: color-mix(in srgb, var(--paper) 96%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
  margin-bottom: clamp(1.5rem, 3vw, 2.25rem);
}
.catnav__inner { display: flex; gap: .5rem; overflow-x: auto; padding-block: .7rem; scrollbar-width: none; }
.catnav__inner::-webkit-scrollbar { display: none; }
.catnav a {
  flex: none; display: inline-flex; align-items: center; min-height: 40px; padding: 0 1rem;
  border: 1px solid var(--field-line); border-radius: var(--radius-pill);
  font-size: var(--fs-sm); font-weight: 600; color: var(--ink); text-decoration: none; white-space: nowrap;
}
.catnav a:hover { background: var(--copper-soft); color: var(--copper-ink); border-color: var(--copper); }
.menu-cat { scroll-margin-top: calc(var(--header-h) + 72px); padding-bottom: clamp(2rem, 4vw, 3rem); }

.order-layout { display: grid; gap: clamp(2rem, 4vw, 3rem); align-items: start; }
@media (min-width: 1040px) { .order-layout { grid-template-columns: minmax(0, 1fr) 340px; } }

.slip {
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 1.25rem; box-shadow: var(--shadow);
}
@media (min-width: 1040px) { .slip { position: sticky; top: calc(var(--header-h) + 1.25rem); } }
.slip h2 { font-size: 1.2rem; margin: 0 0 .25rem; }
.slip__lines { list-style: none; margin: 1rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .8rem; }
@keyframes slip-in { from { opacity: 0; transform: translateY(4px); } }
.slip__line { animation: slip-in .2s cubic-bezier(.2,.7,.3,1); display: grid; grid-template-columns: 1fr auto; gap: .15rem .75rem; padding-bottom: .8rem; border-bottom: 1px dashed var(--line); }
.slip__line:last-child { border-bottom: 0; padding-bottom: 0; }
.slip__name { font-weight: 600; font-size: var(--fs-sm); }
.slip__meta { grid-column: 1; font-size: var(--fs-xs); color: var(--ink-2); display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.slip__cost { grid-row: 1; grid-column: 2; font-weight: 600; font-size: var(--fs-sm); font-variant-numeric: tabular-nums; }
.slip__remove { background: none; border: 0; padding: .25rem .3rem; margin: 0; color: var(--copper-ink); font: inherit; font-size: var(--fs-xs); text-decoration: underline; cursor: pointer; min-height: 32px; }
.slip__total { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid var(--line); font-weight: 700; }
.slip__total span:last-child { font-family: var(--serif); font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.slip__note { font-size: var(--fs-xs); color: var(--ink-2); margin: .85rem 0 0; }
.slip__empty { color: var(--ink-2); font-size: var(--fs-sm); margin: .75rem 0 0; }

.checkout { background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--radius); padding: clamp(1.25rem, 3vw, 2rem); max-width: 54rem; }
.checkout h2 { margin-top: 0; }

.dock {
  position: sticky; bottom: 0; z-index: 45;
  display: flex; align-items: center; gap: 1rem;
  background: color-mix(in srgb, var(--paper) 97%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--line);
  padding: .7rem var(--gutter) calc(.7rem + env(safe-area-inset-bottom));
  margin-top: 2rem;
}
@media (min-width: 1040px) { .dock { display: none; } }
.dock__info { flex: 1 1 auto; font-size: var(--fs-sm); line-height: 1.3; }
.dock__info strong { display: block; font-size: 1.05rem; font-family: var(--serif); font-variant-numeric: tabular-nums; }
.dock .btn { flex: 0 0 auto; }

/* ---------- night band ---------- */
.night { background: var(--night); color: var(--night-ink); border-block: 1px solid rgba(244,236,226,.1); }
.night h2, .night h3 { color: var(--night-ink); }
.night p { color: var(--night-ink-2); }
.night .kicker { color: #e8a683; }
.night a:not(.btn) { color: #e8a683; }
.split { display: grid; gap: clamp(1.75rem, 4vw, 3.5rem); align-items: start; }
.split--center { align-items: center; }
@media (min-width: 860px) { .split { grid-template-columns: 1fr 1fr; } }
.split--wide-left { }
@media (min-width: 860px) { .split--wide-left { grid-template-columns: 1.15fr .85fr; } }
.framed { border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-lift); }
.framed img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; filter: var(--photo-filter); }

/* ---------- hours + visit ---------- */
.hours { list-style: none; margin: 0; padding: 0; font-size: var(--fs-sm); }
.hours li { display: flex; justify-content: space-between; gap: 1rem; padding: .55rem 0; border-bottom: 1px solid var(--line); }
.hours li:last-child { border-bottom: 0; }
.hours [data-today] { font-weight: 700; color: var(--copper-ink); }
.steps { list-style: none; margin: 0; padding: 0; counter-reset: step; }
.steps li { display: flex; gap: 1rem; padding: .85rem 0; border-bottom: 1px solid rgba(244,236,226,.14); }
.steps li:last-child { border-bottom: 0; }
.steps b { display: block; font-weight: 600; }
.steps span[data-n] { font-family: var(--serif); font-size: 1.4rem; line-height: 1; color: #e8a683; flex: none; width: 1.5rem; }
.night .hours li { border-color: rgba(244,236,226,.14); }
.night .hours [data-today] { color: #e8a683; }
.info-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: clamp(1.15rem, 2.5vw, 1.75rem); box-shadow: var(--shadow); }
.night .info-card { background: rgba(255,255,255,.045); border-color: rgba(244,236,226,.16); box-shadow: none; }

/* ---------- receipt ---------- */
.receipt { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: clamp(1.25rem, 3vw, 2rem); box-shadow: var(--shadow); }
.receipt__number { font-family: var(--serif); font-size: clamp(2.25rem, 1.5rem + 3.5vw, 3.5rem); letter-spacing: .02em; line-height: 1; margin: .25rem 0 0; }
.receipt__lines { list-style: none; margin: 1.5rem 0 0; padding: 0; }
.receipt__lines li { display: flex; justify-content: space-between; gap: 1rem; padding: .6rem 0; border-bottom: 1px dashed var(--line); font-size: var(--fs-sm); }
.receipt__total { display: flex; justify-content: space-between; gap: 1rem; padding-top: .9rem; font-weight: 700; }

/* ---------- footer ---------- */
.site-footer { background: var(--night); color: var(--night-ink-2); margin-top: var(--section); padding-block: clamp(2.5rem, 5vw, 4rem); border-top: 1px solid rgba(244,236,226,.1); }
.site-footer a:not(.btn) { color: var(--night-ink); text-decoration: none; }
.site-footer a:not(.btn):hover { color: #e8a683; text-decoration: underline; }
.footer-grid { display: grid; gap: 2rem; grid-template-columns: 1fr; }
@media (min-width: 700px) { .footer-grid { grid-template-columns: 1.4fr 1fr 1fr; } }
.site-footer h3 { font-family: var(--sans); font-size: var(--fs-xs); letter-spacing: .18em; text-transform: uppercase; color: var(--night-ink-2); margin: 0 0 .9rem; }
.site-footer ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; font-size: var(--fs-sm); }
.site-footer ul a, .strip a, .hours a, .stack a { display: inline-block; padding-block: 4px; }
.site-footer .brand__name { color: var(--night-ink); }
.footer-bottom { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(244,236,226,.15); font-size: var(--fs-xs); display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; justify-content: space-between; }
.footer-bottom p { margin: 0; }

/* ---------- print ---------- */
@media print {
  .site-header, .site-footer, .dock, .catnav, .btn { display: none !important; }
  body { background: #fff; color: #000; }
}
`.trim();


/** Digits-only tel: target, e.g. "(919) 555-0148" -> "+19195550148". */
function telHref(): string {
  const digits = site.phone.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function mapsHref(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${site.legalName}, ${site.address}`,
  )}`;
}

/** Evaluated per request — Workers freeze the clock outside a request. */
function currentYear(): number {
  return new Date().getUTCFullYear();
}

/** Inline brand mark. Uses CSS custom properties so it follows the theme. */
function markSvg(className = "brand__mark"): string {
  return `<svg class="${className}" viewBox="0 0 64 64" role="img" aria-hidden="true" focusable="false">
  <path d="M10 21C10 34.5 19.5 43 32 43S54 34.5 54 21Z" fill="var(--ink)"></path>
  <ellipse cx="32" cy="21" rx="22" ry="4" fill="var(--paper)"></ellipse>
  <ellipse cx="32" cy="21" rx="22" ry="4" fill="none" stroke="var(--copper)" stroke-width="1.6"></ellipse>
  <g fill="var(--copper)">
    <ellipse cx="26.5" cy="20.4" rx="2.5" ry="1.6" transform="rotate(-18 26.5 20.4)"></ellipse>
    <ellipse cx="32" cy="22.4" rx="2.5" ry="1.6" transform="rotate(12 32 22.4)"></ellipse>
    <ellipse cx="37.4" cy="20.2" rx="2.5" ry="1.6" transform="rotate(-8 37.4 20.2)"></ellipse>
    <rect x="30.4" y="42" width="3.2" height="13" rx="1.5"></rect>
    <ellipse cx="32" cy="56.4" rx="12" ry="2.8"></ellipse>
  </g>
</svg>`;
}

const NAV = [
  ["/menu", "Menu"],
  ["/#visit", "Visit"],
  ["/#about", "About"],
] as const;

function header(path: string): string {
  const links = NAV.map(([href, label]) => {
    const current = href === path || (href === "/menu" && path.startsWith("/menu"));
    return `<a href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a>`;
  }).join("");
  return `<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="/">
      ${markSvg()}
      <span>
        <span class="brand__name">Sip &amp; Nest</span>
        <span class="brand__sub">Holly Springs</span>
      </span>
    </a>
    <nav class="site-nav" aria-label="Primary">${links}</nav>
    <div class="header-actions">
      <button type="button" class="icon-btn" id="theme-toggle" aria-pressed="false">
        <span class="sr-only">Switch to dark theme</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.7"></circle><path d="M12 3.4a8.6 8.6 0 0 1 0 17.2z" fill="currentColor"></path></svg>
      </button>
      <a class="btn header-cta" href="/menu">Order ahead</a>
    </div>
  </div>
</header>`;
}

function footer(): string {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="/"><span class="brand__name">Sip &amp; Nest</span></a>
        <p class="small" style="margin-top:.9rem;max-width:24rem">A small specialty coffee bar on Hartness Drive. Order ahead, pay when you pick up.</p>
      </div>
      <div>
        <h3>Find us</h3>
        <ul>
          <li><a href="${mapsHref()}" target="_blank" rel="noopener">${esc(site.address)}</a></li>
          <li><a href="tel:${telHref()}">${esc(site.phone)}</a></li>
          <li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>
        </ul>
      </div>
      <div>
        <h3>Hours</h3>
        <ul>
          <li>Tue–Sun · 7:30am–4pm</li>
          <li>Monday · Closed</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${currentYear()} ${esc(site.legalName)}.</p>
      <p>Holly Springs, North Carolina</p>
    </div>
  </div>
</footer>`;
}

const HOURS = [
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
    hasMenu: {
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
    },
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
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta name="theme-color" content="#f7f2ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#13100d" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(social)}">
<meta property="og:image:alt" content="An espresso martini on the bar at Sip &amp; Nest">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(social)}">
<link rel="icon" href="/mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<script>document.documentElement.classList.remove("no-js");try{var t=localStorage.getItem("sn-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header(path)}
<main id="main">
${body}
</main>
${footer()}
${drinks && drinks.length ? structuredData(drinks) : ""}
<script>${CHROME_JS}</script>
</body>
</html>`;
}

/** Runs on every page: theme toggle, live open/closed status, today's hours. */
const CHROME_JS = `
(function () {
  var root = document.documentElement;

  /* --- theme toggle --- */
  var toggle = document.getElementById("theme-toggle");
  function stored() { try { return localStorage.getItem("sn-theme"); } catch (e) { return null; } }
  function systemDark() { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function isDark() { var s = stored(); return s ? s === "dark" : systemDark(); }
  function paint() {
    if (!toggle) return;
    var dark = isDark();
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    toggle.querySelector(".sr-only").textContent = dark ? "Switch to light theme" : "Switch to dark theme";
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("sn-theme", next); } catch (e) {}
      paint();
    });
    paint();
    if (window.matchMedia) {
      var scheme = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { if (!stored()) paint(); };
      if (scheme.addEventListener) scheme.addEventListener("change", onChange);
      else if (scheme.addListener) scheme.addListener(onChange);
    }
  }

  /* --- the last order placed on this device, so the number is never lost --- */
  var recall = document.getElementById("recall");
  if (recall) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem("sn-last-order") || "null"); } catch (e) {}
    if (saved && saved.n) {
      var link = document.createElement("a");
      link.href = "/order/thanks?n=" + encodeURIComponent(saved.n) + (saved.t ? "&t=" + encodeURIComponent(saved.t) : "");
      link.textContent = "View order " + saved.n;
      recall.textContent = saved.at ? "Your last order — pickup " + saved.at + ". " : "Your last order. ";
      recall.appendChild(link);
      recall.hidden = false;
    }
  }

  /* --- open now / closed, in the cafe's own timezone --- */
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var OPEN_MIN = 7 * 60 + 30;
  var CLOSE_MIN = 16 * 60;
  function localNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false
      }).formatToParts(new Date());
      var out = {};
      parts.forEach(function (p) { out[p.type] = p.value; });
      var day = DAYS.indexOf(out.weekday);
      var hour = parseInt(out.hour, 10) % 24;
      return { day: day, minutes: hour * 60 + parseInt(out.minute, 10) };
    } catch (e) { return null; }
  }
  function nextOpenDay(day) {
    for (var i = 1; i <= 7; i++) { var d = (day + i) % 7; if (d !== 1) return DAYS[d]; }
    return DAYS[2];
  }
  var now = localNow();
  if (now) {
    var todayCell = document.querySelector('[data-day="' + DAYS[now.day] + '"]');
    if (todayCell) { todayCell.setAttribute("data-today", "true"); }
    var chip = document.querySelector("[data-status]");
    if (chip) {
      var label = chip.querySelector("[data-status-text]");
      var openToday = now.day !== 1;
      var open = openToday && now.minutes >= OPEN_MIN && now.minutes < CLOSE_MIN;
      var text;
      if (open) {
        var left = CLOSE_MIN - now.minutes;
        text = left <= 60 ? "Open · last orders soon, we close at 4pm" : "Open now · until 4pm today";
      } else if (openToday && now.minutes < OPEN_MIN) {
        text = "Opens today at 7:30am";
      } else {
        text = "Closed · opens " + nextOpenDay(now.day) + " at 7:30am";
      }
      chip.setAttribute("data-open", open ? "true" : "false");
      if (label) { label.textContent = text; }
    }
  }
})();
`.trim();

function priceLabel(drink: CoffeeType): string {
  const sizes = parseSizes(drink.sizes_json);
  if (!sizes.length) return formatCents(drink.price_cents);
  const min = Math.min(...sizes.map((s) => s.cents));
  return sizes.length === 1 ? formatCents(min) : `from ${formatCents(min)}`;
}

const CARD_SIZES = "(min-width: 1100px) 340px, (min-width: 700px) 45vw, 92vw";

function drinkCard(drink: CoffeeType, interactive: boolean, eager = false): string {
  const sizes = parseSizes(drink.sizes_json);
  const soldOut = !drink.available;
  const media = drink.image
    ? `<div class="card__media">${img({
        src: drink.image,
        // the drink name is in the <h3> directly below, so the photo is decorative here
        alt: "",
        width: 1200,
        height: 800,
        sizes: CARD_SIZES,
        priority: eager,
      })}${
        soldOut
          ? `<p class="card__flag">Sold out today</p>`
          : drink.featured
            ? `<p class="card__flag">House favorite</p>`
            : ""
      }</div>`
    : "";

  let actions: string;
  if (soldOut) {
    actions = `<p class="small muted" style="margin:0">Back on the board soon.</p>`;
  } else if (interactive) {
    const sizeField =
      sizes.length > 1
        ? `<select data-size="${esc(drink.slug)}" aria-label="Size for ${esc(drink.name)}">${sizes
            .map((s) => `<option value="${esc(s.label)}">${esc(s.label)} · ${formatCents(s.cents)}</option>`)
            .join("")}</select>`
        : `<input type="hidden" data-size="${esc(drink.slug)}" value="${esc(sizes[0]?.label ?? "")}">`;
    actions = `${sizeField}
        <div class="stepper" role="group" aria-label="Quantity for ${esc(drink.name)}">
          <button type="button" data-step="-1" data-for="${esc(drink.slug)}" aria-label="One fewer ${esc(drink.name)}">&minus;</button>
          <output data-qty="${esc(drink.slug)}" aria-live="off">1</output>
          <button type="button" data-step="1" data-for="${esc(drink.slug)}" aria-label="One more ${esc(drink.name)}">+</button>
        </div>
        <button type="button" class="btn" data-add="${esc(drink.slug)}">Add<span class="sr-only"> ${esc(drink.name)} to your slip</span></button>`;
  } else {
    actions = `<a class="btn btn--ghost" href="/menu#${esc(drink.slug)}">Order ahead<span class="sr-only"> — ${esc(drink.name)}</span></a>`;
  }

  return `<article class="card${soldOut ? " card--out" : ""}" id="${esc(drink.slug)}">
    ${media}
    <div class="card__body">
      <div class="card__head">
        <h3 class="card__name">${esc(drink.name)}</h3>
        <p class="card__price">${esc(priceLabel(drink))}</p>
      </div>
      <p class="card__desc">${esc(drink.description)}</p>
      <div class="card__actions${interactive && !soldOut ? " js-only" : ""}">${actions}</div>
    </div>
  </article>`;
}

function hoursList(): string {
  return `<ul class="hours">${HOURS.map(
    ([day, when]) =>
      `<li data-day="${day}"><span>${day}</span><span class="tabular">${when}</span></li>`,
  ).join("")}</ul>`;
}

function statusChip(): string {
  return `<p class="status" data-status data-open="unknown">
    <span class="status__dot" aria-hidden="true"></span>
    <span data-status-text>Tue–Sun · 7:30am–4pm · closed Monday</span>
  </p>`;
}

/** What the visitor typed, echoed back when their note is rejected. */
export type MessageFormValues = { name?: string; contact?: string; body?: string };

function contactForm(notice?: string, error?: string, values: MessageFormValues = {}): string {
  const flash = error
    ? `<p class="notice notice--bad" role="alert" id="note-error" tabindex="-1">${esc(error)}</p>`
    : notice
      ? `<p class="notice notice--good" role="status">${esc(notice)}</p>`
      : "";
  return `<div class="info-card">
    <h3 style="margin-top:0">Leave us a note</h3>
    <p class="small muted">Catering, a big order, a lost umbrella — we read every one.</p>
    ${flash}
    <form method="post" action="/api/message">
      <div class="field">
        <label for="mname">Your name</label>
        <input id="mname" name="name" required maxlength="80" autocomplete="name" value="${esc(values.name ?? "")}">
      </div>
      <div class="field">
        <label for="mcontact">Phone or email</label>
        <input id="mcontact" name="contact" required maxlength="120" autocomplete="email" value="${esc(values.contact ?? "")}">
        <p class="field__hint" id="mcontact-hint">So we can write back.</p>
      </div>
      <div class="field">
        <label for="mbody">Message</label>
        <textarea id="mbody" name="body" required maxlength="1000">${esc(values.body ?? "")}</textarea>
      </div>
      <div class="trap" aria-hidden="true">
        <label for="mfax">Leave this empty</label>
        <input id="mfax" name="fax" tabindex="-1" autocomplete="off">
      </div>
      <button class="btn btn--wide" type="submit">Send note</button>
    </form>
  </div>`;
}

export function homePage(
  drinks: CoffeeType[],
  opts: { notice?: string; error?: string; values?: MessageFormValues } = {},
): string {
  const available = drinks.filter((d) => d.available);
  const ordered = available
    .filter((d) => d.featured)
    .concat(available.filter((d) => !d.featured));
  const highlights = ordered.slice(0, 3);

  const body = `
  <section class="hero">
    <div class="hero__media">${img({
      src: "/img/hero.webp",
      alt: "An espresso martini on the bar, three beans on the foam",
      width: 1536,
      height: 1024,
      sizes: "100vw",
      priority: true,
    })}</div>
    <div class="wrap hero__inner">
      <p class="kicker">Holly Springs, North Carolina</p>
      <h1>Serious espresso, a quiet seat, and a martini before four.</h1>
      <p class="hero__lede">A small specialty coffee bar on Hartness Drive. Order ahead, walk in, and pay at the counter — it will be waiting under your name.</p>
      <div class="btn-row">
        <a class="btn btn--lg btn--onnight" href="/menu">Order ahead</a>
        <a class="btn btn--lg btn--ghost-onnight" href="#visit">Find us</a>
      </div>
      ${statusChip()}
    </div>
  </section>

  <section class="strip">
    <div class="wrap strip__inner">
      <span class="strip__item"><strong>Today</strong> Tue–Sun, 7:30am–4pm</span>
      <span class="strip__item"><a href="${mapsHref()}" target="_blank" rel="noopener">${esc(site.address)}</a></span>
      <span class="strip__item"><a href="tel:${telHref()}">${esc(site.phone)}</a></span>
      <span class="strip__item"><strong>Pay at pickup</strong> no card needed online</span>
    </div>
  </section>

  <section class="section wrap" aria-labelledby="short-list">
    <div class="section-head">
      <div>
        <p class="kicker">On the board</p>
        <h2 id="short-list">The short list</h2>
      </div>
      <p><a href="/menu">See the whole menu &rarr;</a></p>
    </div>
    <div class="grid grid--fit">${highlights.map((d) => drinkCard(d, false)).join("")}</div>
  </section>

  <section class="night">
    <div class="wrap section">
      <div class="split split--center split--wide-left">
        <div>
          <p class="kicker">How it works</p>
          <h2>Three steps, no card details.</h2>
          <ol class="steps">
            <li><span data-n aria-hidden="true">1</span><span><b>Build your slip</b><span class="small">Pick your drinks and a pickup time.</span></span></li>
            <li><span data-n aria-hidden="true">2</span><span><b>We make it fresh</b><span class="small">Your ticket prints behind the bar.</span></span></li>
            <li><span data-n aria-hidden="true">3</span><span><b>Pay at the counter</b><span class="small">Settle up when you collect, not before.</span></span></li>
          </ol>
          <p class="btn-row" style="margin-top:1.5rem"><a class="btn btn--onnight" href="/menu">Start an order</a></p>
        </div>
        <div class="framed">${img({
          src: "/img/machine.webp",
          alt: "The espresso machine at Sip and Nest",
          width: 1400,
          height: 933,
          sizes: "(min-width: 860px) 44vw, 92vw",
        })}</div>
      </div>
    </div>
  </section>

  <section class="section wrap" id="visit" style="scroll-margin-top:calc(var(--header-h) + 1rem)" aria-labelledby="visit-h">
    <div class="section-head">
      <div>
        <p class="kicker">Visit</p>
        <h2 id="visit-h">112 Hartness Drive</h2>
      </div>
    </div>
    <div class="split">
      <div class="info-card">
        <h3 style="margin-top:0">Hours</h3>
        ${hoursList()}
        <p class="small muted" style="margin:1rem 0 0">The last order-ahead pickup slot is 3:30pm.</p>
      </div>
      <div class="info-card">
        <h3 style="margin-top:0">Getting here</h3>
        <p class="small muted">We are on Hartness Drive in Holly Springs. Call the bar if you need directions or want to check on an order.</p>
        <ul class="hours">
          <li><span>Address</span><span>${esc(site.address)}</span></li>
          <li><span>Phone</span><span><a href="tel:${telHref()}">${esc(site.phone)}</a></span></li>
          <li><span>Email</span><span><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></span></li>
        </ul>
        <p class="btn-row" style="margin-top:1.25rem">
          <a class="btn btn--ghost" href="${mapsHref()}" target="_blank" rel="noopener">Get directions</a>
          <a class="btn btn--ghost" href="tel:${telHref()}">Call the bar</a>
        </p>
      </div>
    </div>
  </section>

  <section class="section wrap" id="about" style="scroll-margin-top:calc(var(--header-h) + 1rem)" aria-labelledby="about-h">
    <div class="split">
      <div>
        <p class="kicker">About</p>
        <h2 id="about-h">A specialty bar, not a drive-through.</h2>
        <p class="lede">Espresso in the morning, shaken over ice through the afternoon, and espresso martinis before we close.</p>
        <p class="muted">Everything is made to order, which is why ordering ahead helps. There is a notes box on every order — tell us how you take it and we will make it that way.</p>
        <p class="muted">Closed Mondays so the bar gets a day off.</p>
      </div>
      <div id="contact" style="scroll-margin-top:calc(var(--header-h) + 1rem)">
        ${contactForm(opts.notice, opts.error, opts.values)}
        ${opts.error ? `<script>(function(){var e=document.getElementById("note-error");if(e){e.scrollIntoView({block:"center"});e.focus();}})();</script>` : ""}
      </div>
    </div>
  </section>`;

  return layout({
    title: "Home",
    path: "/",
    description:
      "Specialty coffee bar in Holly Springs, NC. Espresso martinis, shaken espresso, cortados and pastry. Order ahead, pay at pickup. Open Tue–Sun, 7:30am–4pm.",
    body,
    drinks: available,
  });
}

const CATEGORY_LABEL: Record<string, string> = {
  specialty: "Specialty",
  coffee: "Coffee",
  pastry: "From the case",
  tea: "Tea",
};

const CATEGORY_NOTE: Record<string, string> = {
  specialty: "The reason people drive over.",
  coffee: "The everyday order, made properly.",
  pastry: "Made in the morning, gone by the afternoon.",
  tea: "For the afternoon nest.",
};

/** What the customer typed, echoed back when the server rejects the order. */
export type OrderFormValues = {
  name?: string;
  contact?: string;
  pickup_day?: string;
  pickup_slot?: string;
  notes?: string;
};

export function orderPage(
  drinks: CoffeeType[],
  error?: string,
  notice?: string,
  values: OrderFormValues = {},
): string {
  const payload = drinks
    .filter((d) => d.available)
    .map((d) => ({ slug: d.slug, name: d.name, sizes: parseSizes(d.sizes_json) }));

  const cats: string[] = [];
  for (const d of drinks) if (!cats.includes(d.category)) cats.push(d.category);

  const catnav = cats.length
    ? `<div class="catnav"><nav class="wrap catnav__inner" aria-label="Menu sections">${cats
        .map((c) => `<a href="#cat-${esc(c)}">${esc(CATEGORY_LABEL[c] ?? c)}</a>`)
        .join("")}</nav></div>`
    : "";

  const sections = cats
    .map((cat, i) => {
      const group = drinks.filter((d) => d.category === cat);
      return `<section class="menu-cat" id="cat-${esc(cat)}" aria-labelledby="cat-${esc(cat)}-h">
        <h2 class="rule-label" id="cat-${esc(cat)}-h">${esc(CATEGORY_LABEL[cat] ?? cat)}${
          CATEGORY_NOTE[cat] ? ` — ${esc(CATEGORY_NOTE[cat])}` : ""
        }</h2>
        <div class="grid">${group.map((d, j) => drinkCard(d, true, i === 0 && j === 0)).join("")}</div>
      </section>`;
    })
    .join("");

  const flash = error
    ? `<p class="notice notice--bad" role="alert" id="order-error" tabindex="-1">${esc(error)}</p>`
    : notice
      ? `<p class="notice notice--good" role="status">${esc(notice)}</p>`
      : "";

  const days = pickupDays();
  // Without JS there is no way to filter sizes per drink, so each option is a
  // real drink-and-size pair rather than a union that is wrong for most rows.
  const noscriptChoices = drinks
    .filter((d) => d.available)
    .flatMap((d) =>
      parseSizes(d.sizes_json).map((size) => ({
        value: `${d.slug}|${size.label}`,
        label: `${d.name} · ${size.label} · ${formatCents(size.cents)}`,
      })),
    );

  const body = `
  <div class="wrap page-head">
    <div>
      <p class="kicker">Order ahead</p>
      <h1>The menu</h1>
      <p class="lede">${esc(site.pickupCopy)}</p>
      <p class="recall" id="recall" hidden></p>
      ${flash}
      <p class="notice notice--bad nojs-note">JavaScript is off, so the multi-item slip will not work. Use the single-item form at the bottom of this page, or call the bar.</p>
    </div>
    <div class="info-card page-head__aside">
      <p class="status status--plain" data-status data-open="unknown">
        <span class="status__dot" aria-hidden="true"></span>
        <span data-status-text>Tue–Sun · 7:30am–4pm · closed Monday</span>
      </p>
      <dl class="stack">
        <dt>Pick up at</dt>
        <dd><a href="${mapsHref()}" target="_blank" rel="noopener">${esc(site.address)}</a></dd>
        <dt>Questions</dt>
        <dd><a href="tel:${telHref()}">${esc(site.phone)}</a></dd>
      </dl>
    </div>
  </div>
  ${catnav}
  <form id="order-form" method="post" action="/api/order">
    <div class="wrap order-layout">
      <div>
        ${
          drinks.length
            ? sections
            : `<div class="info-card"><h2 style="margin-top:0">The board is bare</h2><p class="muted" style="margin:0">Nothing is loaded on the menu right now. Give the bar a call on <a href="tel:${telHref()}">${esc(site.phone)}</a> and we will sort you out.</p></div>`
        }
      </div>

      <aside class="slip" aria-labelledby="slip-h">
        <h2 id="slip-h">Your slip</h2>
        <p class="small muted" style="margin:0">Nothing is charged here.</p>
        <p class="slip__empty" id="slip-empty">Empty so far — add something from the menu.</p>
        <ul class="slip__lines" id="slip-lines" hidden></ul>
        <p class="slip__total" id="slip-total" hidden><span>Total at pickup</span><span id="slip-sum">$0.00</span></p>
        <p class="slip__note">Nothing is taken now — you pay when you collect. Closed Mondays.</p>
        <a class="btn btn--wide js-only" href="#details" id="slip-continue" hidden>Add your details</a>
        <p class="sr-only" id="slip-live" role="status" aria-live="polite"></p>
      </aside>
    </div>

    <div class="wrap" style="margin-top:clamp(2rem,4vw,3rem)">
      <div class="checkout" id="details" style="scroll-margin-top:calc(var(--header-h) + 1rem)">
        <p class="kicker">Almost there</p>
        <h2>Your details</h2>
        <p class="muted small">We only use these to find you at the counter.</p>
        <div class="field-row">
          <div class="field">
            <label for="name">Name for the ticket</label>
            <input id="name" name="name" required maxlength="80" autocomplete="name" value="${esc(values.name ?? "")}">
          </div>
          <div class="field">
            <label for="contact">Phone or email</label>
            <input id="contact" name="contact" required maxlength="120" autocomplete="tel" value="${esc(values.contact ?? "")}">
            <p class="field__hint">In case the bar needs to reach you.</p>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="pickup_day">Pickup day</label>
            <select id="pickup_day" name="pickup_day">
              ${days
                .map(
                  (d) =>
                    `<option value="${esc(d.value)}"${d.isToday ? ' data-today="1"' : ""}${
                      values.pickup_day === d.value ? " selected" : ""
                    }>${esc(d.label)}</option>`,
                )
                .join("")}
            </select>
            <p class="field__hint">Closed Mondays, so they are not on the list.</p>
          </div>
          <div class="field">
            <label for="pickup_slot">Pickup time</label>
            <select id="pickup_slot" name="pickup_slot">
              ${pickupSlots
                .map((slot) => `<option${values.pickup_slot === slot ? " selected" : ""}>${slot}</option>`)
                .join("")}
            </select>
            <p class="field__hint" id="slot-hint">Pickups run 7:30am to 3:30pm.</p>
          </div>
        </div>
        <div class="field">
          <label for="notes">Anything we should know?</label>
          <textarea id="notes" name="notes" maxlength="400" placeholder="Oat milk, extra hot, one fork…">${esc(values.notes ?? "")}</textarea>
        </div>
        <input type="hidden" name="pickup_at" id="pickup_at">
        <input type="hidden" name="items" id="items" value="[]">

        <noscript>
          <p class="notice notice--bad">JavaScript is off, so pick one item here and send it through.</p>
          <div class="field-row">
            <div class="field">
              <label for="choice">Drink and size</label>
              <select id="choice" name="choice">
                ${noscriptChoices
                  .map((c) => `<option value="${esc(c.value)}">${esc(c.label)}</option>`)
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label for="qty">Quantity</label>
              <select id="qty" name="qty">${[1, 2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join("")}</select>
            </div>
          </div>
        </noscript>

        <button class="btn btn--lg btn--wide" type="submit"${drinks.length ? "" : " disabled"}>Place order</button>
        <p class="small muted" style="margin:.85rem 0 0;text-align:center">No payment now — you pay at the counter.</p>
      </div>
    </div>

    <div class="dock" id="dock" hidden>
      <p class="dock__info"><span id="dock-count">Your slip is empty</span><strong id="dock-sum"></strong></p>
      <a class="btn" href="#details" id="dock-cta">Review order</a>
    </div>
  </form>
  ${error ? `<script>(function(){var e=document.getElementById("order-error");if(e){e.focus();e.scrollIntoView({block:"center"});}})();</script>` : ""}
  <script type="application/json" id="menu-data">${jsonScript(payload)}</script>
  <script>${ORDER_JS}</script>`;

  return layout({
    title: "Menu & order ahead in Holly Springs",
    path: "/menu",
    description:
      "Espresso martinis, brown sugar shaken espresso, pistachio cortado, Spanish latte and tiramisu. Order ahead in Holly Springs, NC and pay at pickup.",
    body,
    drinks: drinks.filter((d) => d.available),
  });
}

export function menuPage(drinks: CoffeeType[], error?: string, notice?: string): string {
  return orderPage(drinks, error, notice);
}

/** The order page only: slip state, quantity steppers, pickup times, submit guard. */
const ORDER_JS = `
(function () {
  var dataEl = document.getElementById("menu-data");
  var form = document.getElementById("order-form");
  if (!dataEl || !form) return;

  var menu = [];
  try { menu = JSON.parse(dataEl.textContent || "[]"); } catch (e) { return; }
  var bySlug = Object.create(null);
  menu.forEach(function (d) { bySlug[d.slug] = d; });

  var STORE = "sn-slip-v1";
  var MAX_LINES = 12;
  var MAX_QTY = 6;
  var cart = [];

  function money(cents) { return "$" + (cents / 100).toFixed(2); }

  function sizeFor(slug, label) {
    var drink = bySlug[slug];
    if (!drink) return null;
    for (var i = 0; i < drink.sizes.length; i++) {
      if (drink.sizes[i].label === label) return drink.sizes[i];
    }
    return null;
  }

  function load() {
    var raw;
    try { raw = localStorage.getItem(STORE); } catch (e) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(saved)) return;
    saved.forEach(function (line) {
      if (!line || typeof line.slug !== "string") return;
      var size = sizeFor(line.slug, line.size);
      var qty = Math.min(MAX_QTY, Math.max(1, parseInt(line.qty, 10) || 0));
      if (size && cart.length < MAX_LINES) cart.push({ slug: line.slug, size: size.label, qty: qty });
    });
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(cart)); } catch (e) {}
  }

  function announce(message) {
    var live = document.getElementById("slip-live");
    if (live) live.textContent = message;
  }

  function total() {
    return cart.reduce(function (sum, line) {
      var size = sizeFor(line.slug, line.size);
      return sum + (size ? size.cents * line.qty : 0);
    }, 0);
  }

  function render() {
    var empty = document.getElementById("slip-empty");
    var list = document.getElementById("slip-lines");
    var totalRow = document.getElementById("slip-total");
    var sumEl = document.getElementById("slip-sum");
    var field = document.getElementById("items");
    var dock = document.getElementById("dock");
    var dockCount = document.getElementById("dock-count");
    var dockSum = document.getElementById("dock-sum");
    var cont = document.getElementById("slip-continue");

    field.value = JSON.stringify(cart);

    if (!cart.length) {
      empty.hidden = false;
      list.hidden = true;
      list.textContent = "";
      totalRow.hidden = true;
      if (cont) cont.hidden = true;
      if (dock) dock.hidden = true;
      return;
    }

    empty.hidden = true;
    empty.classList.remove("notice", "notice--bad");
    list.hidden = false;
    totalRow.hidden = false;
    if (cont) cont.hidden = false;
    list.textContent = "";

    cart.forEach(function (line, index) {
      var drink = bySlug[line.slug];
      var size = sizeFor(line.slug, line.size);
      if (!drink || !size) return;
      var li = document.createElement("li");
      li.className = "slip__line";

      var name = document.createElement("span");
      name.className = "slip__name";
      name.textContent = drink.name;

      var cost = document.createElement("span");
      cost.className = "slip__cost";
      cost.textContent = money(size.cents * line.qty);

      var meta = document.createElement("span");
      meta.className = "slip__meta";

      var stepper = document.createElement("span");
      stepper.className = "stepper";
      stepper.setAttribute("role", "group");
      stepper.setAttribute("aria-label", "Quantity of " + drink.name);
      stepper.appendChild(stepBtn("-1", index, "One fewer " + drink.name));
      var out = document.createElement("output");
      out.textContent = String(line.qty);
      stepper.appendChild(out);
      stepper.appendChild(stepBtn("1", index, "One more " + drink.name));

      var label = document.createElement("span");
      label.textContent = size.label;

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "slip__remove";
      remove.setAttribute("data-remove", String(index));
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + drink.name + " from your slip");

      meta.appendChild(stepper);
      meta.appendChild(label);
      meta.appendChild(remove);

      li.appendChild(name);
      li.appendChild(cost);
      li.appendChild(meta);
      list.appendChild(li);
    });

    var sum = total();
    sumEl.textContent = money(sum);
    var count = cart.reduce(function (n, l) { return n + l.qty; }, 0);
    if (dock && dockCount && dockSum) {
      dock.hidden = false;
      dockCount.textContent = count === 1 ? "1 item on your slip" : count + " items on your slip";
      dockSum.textContent = money(sum) + " at pickup";
    }
  }

  function stepBtn(delta, index, label) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("data-line-step", delta);
    b.setAttribute("data-line", String(index));
    b.setAttribute("aria-label", label);
    b.textContent = delta === "1" ? "+" : "\\u2212";
    return b;
  }

  function cardQty(slug) {
    var out = document.querySelector('[data-qty="' + CSS.escape(slug) + '"]');
    return out ? Math.min(MAX_QTY, Math.max(1, parseInt(out.textContent, 10) || 1)) : 1;
  }

  function setCardQty(slug, value) {
    var out = document.querySelector('[data-qty="' + CSS.escape(slug) + '"]');
    if (out) out.textContent = String(Math.min(MAX_QTY, Math.max(1, value)));
  }

  function add(slug) {
    var drink = bySlug[slug];
    if (!drink) return false;
    var picker = document.querySelector('[data-size="' + CSS.escape(slug) + '"]');
    var label = picker ? picker.value : (drink.sizes[0] && drink.sizes[0].label);
    var size = sizeFor(slug, label);
    if (!size) return false;
    var qty = cardQty(slug);

    var existing = null;
    cart.forEach(function (line) { if (line.slug === slug && line.size === size.label) existing = line; });
    if (existing) {
      if (existing.qty >= MAX_QTY) {
        announce("Six " + drink.name + " is the most we can put on one line. Give the bar a call for more.");
        return false;
      }
      existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    } else {
      if (cart.length >= MAX_LINES) {
        announce("That is as much as one ticket holds. Give the bar a call for a big order.");
        return false;
      }
      cart.push({ slug: slug, size: size.label, qty: qty });
    }
    setCardQty(slug, 1);
    save();
    render();
    announce(qty + " " + drink.name + " added. Slip total " + money(total()) + ".");
    return true;
  }

  /* After a line disappears, land on a Remove button — never on a stepper, or a
     second press would delete the next line too. */
  function restFocusAfterRemoval(index) {
    var buttons = document.querySelectorAll("#slip-lines [data-remove]");
    var next = buttons[Math.min(index, buttons.length - 1)];
    if (next) { next.focus(); return; }
    var heading = document.getElementById("slip-h");
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus(); }
  }

  /* Hold the label in a closure, so a double tap cannot leave "Added" stuck on. */
  function confirmAdd(button) {
    if (button.dataset.busy) return;
    var original = button.innerHTML;
    button.dataset.busy = "1";
    button.classList.add("is-added");
    button.innerHTML = "Added \u2713";
    setTimeout(function () {
      button.innerHTML = original;
      button.classList.remove("is-added");
      delete button.dataset.busy;
    }, 1200);
  }

  form.addEventListener("click", function (event) {
    var el = event.target.closest ? event.target.closest("button") : null;
    if (!el) return;

    var addSlug = el.getAttribute("data-add");
    if (addSlug) {
      if (add(addSlug)) confirmAdd(el);
      return;
    }

    var step = el.getAttribute("data-step");
    if (step) {
      var slug = el.getAttribute("data-for");
      setCardQty(slug, cardQty(slug) + parseInt(step, 10));
      return;
    }

    var lineStep = el.getAttribute("data-line-step");
    if (lineStep) {
      var i = parseInt(el.getAttribute("data-line"), 10);
      var line = cart[i];
      if (!line) return;
      line.qty = line.qty + parseInt(lineStep, 10);
      var removed = line.qty < 1;
      if (removed) cart.splice(i, 1); else line.qty = Math.min(MAX_QTY, line.qty);
      save();
      render();
      announce(removed ? "Line removed. Total " + money(total()) + "." : "Slip updated. Total " + money(total()) + ".");
      if (removed) {
        restFocusAfterRemoval(i);
      } else {
        var same = document.querySelector('#slip-lines [data-line="' + i + '"][data-line-step="' + lineStep + '"]');
        if (same) same.focus();
      }
      return;
    }

    var removeAt = el.getAttribute("data-remove");
    if (removeAt !== null) {
      var index = parseInt(removeAt, 10);
      var name = bySlug[(cart[index] || {}).slug];
      cart.splice(index, 1);
      save();
      render();
      announce((name ? name.name : "Item") + " removed. Total " + money(total()) + ".");
      restFocusAfterRemoval(index);
    }
  });

  /* --- pickup times: never offer a slot that has already passed today --- */
  var daySel = document.getElementById("pickup_day");
  var slotSel = document.getElementById("pickup_slot");
  var slotHint = document.getElementById("slot-hint");

  function slotMinutes(text) {
    var m = /^(\\d{1,2}):(\\d{2})(am|pm)$/.exec(text.trim());
    if (!m) return null;
    var hour = parseInt(m[1], 10) % 12;
    if (m[3] === "pm") hour += 12;
    return hour * 60 + parseInt(m[2], 10);
  }

  function nowMinutesET() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false
      }).formatToParts(new Date());
      var out = {};
      parts.forEach(function (p) { out[p.type] = p.value; });
      return (parseInt(out.hour, 10) % 24) * 60 + parseInt(out.minute, 10);
    } catch (e) { return null; }
  }

  function isToday() {
    var opt = daySel && daySel.selectedOptions[0];
    return !!(opt && opt.getAttribute("data-today"));
  }

  function trimSlots() {
    if (!daySel || !slotSel) return;
    var minutes = nowMinutesET();
    var today = isToday();
    var firstOpen = null;
    var anyOpen = false;
    Array.prototype.forEach.call(slotSel.options, function (opt) {
      var mins = slotMinutes(opt.textContent);
      var past = today && minutes !== null && mins !== null && mins < minutes + 10;
      opt.disabled = past;
      opt.hidden = past;
      if (!past) { anyOpen = true; if (firstOpen === null) firstOpen = opt; }
    });
    if (!anyOpen && today && daySel.selectedIndex + 1 < daySel.options.length) {
      daySel.selectedIndex = daySel.selectedIndex + 1;
      trimSlots();
      if (slotHint) slotHint.textContent = "Today is done — moved to the next day we are open.";
      return;
    }
    if (slotSel.selectedOptions[0] && slotSel.selectedOptions[0].disabled && firstOpen) {
      firstOpen.selected = true;
    }
    if (slotHint) {
      slotHint.textContent = today
        ? "Only times we can still make today."
        : "Pickups run 7:30am to 3:30pm.";
    }
  }

  if (daySel) daySel.addEventListener("change", trimSlots);
  // A tab left open all afternoon must not still be offering this morning.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) trimSlots();
  });
  trimSlots();

  form.addEventListener("submit", function (event) {
    var usingNoscriptPicker = document.getElementById("slug") && document.getElementById("slug").offsetParent !== null;
    if (!cart.length && !usingNoscriptPicker) {
      event.preventDefault();
      announce("Your slip is empty. Add a drink first.");
      var first = document.querySelector("[data-add]");
      var target = document.getElementById("slip-empty");
      if (target) target.classList.add("notice", "notice--bad");
      if (first) first.focus();
      return;
    }
    trimSlots();
    var slotOption = slotSel && slotSel.selectedOptions[0];
    if (slotSel && (!slotOption || slotOption.disabled)) {
      event.preventDefault();
      announce("That pickup time has passed. Pick another one.");
      slotSel.focus();
      return;
    }
    var day = daySel ? daySel.value : "";
    var slot = slotSel ? slotSel.value : "";
    document.getElementById("pickup_at").value = (day + " \u00b7 " + slot).trim();
    document.getElementById("items").value = JSON.stringify(cart);
  });

  load();
  render();
})();
`.trim();

export function thanksPage(order: OrderRow, lines: OrderLine[], totalCents: number): string {
  const body = `
  <div class="wrap section" style="max-width:46rem">
    <p class="kicker">Order received</p>
    <h1>Thanks, ${esc(order.name.split(" ")[0] ?? order.name)} — it's on the board.</h1>
    <p class="lede">Come by at <strong>${esc(order.pickup_at)}</strong> and give your name at the counter. Nothing has been charged; you pay when you collect.</p>

    <div class="receipt">
      <p class="small muted" style="margin:0">Order number</p>
      <p class="receipt__number">${esc(order.number)}</p>
      <ul class="receipt__lines">
        ${lines
          .map(
            (line) => `<li>
              <span>${esc(line.name)} · ${esc(line.size)}${line.qty > 1 ? ` × ${line.qty}` : ""}${
                line.note ? `<br><span class="small muted">${esc(line.note)}</span>` : ""
              }</span>
              <span class="tabular">${formatCents(line.price_cents * line.qty)}</span>
            </li>`,
          )
          .join("")}
      </ul>
      <p class="receipt__total"><span>Due at pickup</span><span class="tabular">${formatCents(totalCents)}</span></p>
      ${order.notes ? `<p class="small muted" style="margin:1rem 0 0">Note for the bar: ${esc(order.notes)}</p>` : ""}
    </div>

    <div class="split" style="margin-top:2rem">
      <div class="info-card">
        <h2 style="margin-top:0;font-size:1.15rem">Where to come</h2>
        <p class="small muted" style="margin-bottom:1rem">${esc(site.address)}</p>
        <p class="btn-row">
          <a class="btn btn--ghost" href="${mapsHref()}" target="_blank" rel="noopener">Directions</a>
          <a class="btn btn--ghost" href="tel:${telHref()}">Call the bar</a>
        </p>
      </div>
      <div class="info-card">
        <h2 style="margin-top:0;font-size:1.15rem">Need to change it?</h2>
        <p class="small muted">Give us a ring and quote ${esc(order.number)} — we can adjust anything up to the moment we make it.</p>
        <p class="btn-row"><a class="btn" href="/menu">Order something else</a></p>
      </div>
    </div>
  </div>
  <script>
  try {
    localStorage.removeItem("sn-slip-v1");
    localStorage.setItem("sn-last-order", JSON.stringify({ n: ${jsonScript(order.number)}, at: ${jsonScript(order.pickup_at)}, t: ${jsonScript(order.token ?? "")} }));
  } catch (e) {}
  </script>`;

  return layout({
    title: `Order ${order.number}`,
    path: "/order/thanks",
    description: "Your Sip & Nest order is received. Pay when you pick up.",
    body,
    noindex: true,
  });
}

export function errorPage(): string {
  const body = `
  <div class="wrap section center" style="max-width:34rem">
    <p class="kicker">Something went wrong</p>
    <h1>The machine stalled.</h1>
    <p class="lede center">That is on us, not on you. Try again in a moment — or ring the bar on <a href="tel:${telHref()}">${esc(site.phone)}</a> and we will take the order down by hand.</p>
    <p class="btn-row" style="justify-content:center">
      <a class="btn" href="/menu">Back to the menu</a>
      <a class="btn btn--ghost" href="/">Home</a>
    </p>
  </div>`;
  return layout({
    title: "Something went wrong",
    path: "/error",
    description: "Something went wrong at Sip & Nest.",
    body,
    noindex: true,
  });
}

export function notFoundPage(): string {
  const body = `
  <div class="wrap section center" style="max-width:34rem">
    <p class="kicker">404</p>
    <h1>That table is empty.</h1>
    <p class="lede center">We could not find that page. The menu is probably what you were after.</p>
    <p class="btn-row" style="justify-content:center">
      <a class="btn" href="/menu">See the menu</a>
      <a class="btn btn--ghost" href="/">Back home</a>
    </p>
  </div>`;
  return layout({
    title: "Page not found",
    path: "/404",
    description: "Page not found at Sip & Nest.",
    body,
    noindex: true,
  });
}

export const MANIFEST = JSON.stringify({
  name: `${site.name} — ${site.city}`,
  short_name: site.name,
  description: "Specialty coffee bar in Holly Springs, NC. Order ahead, pay at pickup.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#f7f2ea",
  theme_color: "#f7f2ea",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
  ],
});

export const MARK_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#f7f2ea"/>
  <path d="M10 21C10 34.5 19.5 43 32 43S54 34.5 54 21Z" fill="#241a15"/>
  <ellipse cx="32" cy="21" rx="22" ry="4" fill="#fbf4ea"/>
  <ellipse cx="32" cy="21" rx="22" ry="4" fill="none" stroke="#8b3a2a" stroke-width="1.6"/>
  <g fill="#8b3a2a">
    <ellipse cx="26.5" cy="20.4" rx="2.5" ry="1.6" transform="rotate(-18 26.5 20.4)"/>
    <ellipse cx="32" cy="22.4" rx="2.5" ry="1.6" transform="rotate(12 32 22.4)"/>
    <ellipse cx="37.4" cy="20.2" rx="2.5" ry="1.6" transform="rotate(-8 37.4 20.2)"/>
    <rect x="30.4" y="42" width="3.2" height="13" rx="1.5"/>
    <ellipse cx="32" cy="56.4" rx="12" ry="2.8"/>
  </g>
</svg>`;
