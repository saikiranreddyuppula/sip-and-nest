export const CSS_A = `
/* Sip & Nest — dark, photo-first. Instrument Serif + Source Sans 3, local only. */
@font-face {
  font-family: "Source Sans 3";
  src: url("/fonts/source-sans.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Instrument Serif";
  src: url("/fonts/instrument-serif.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Instrument Serif";
  src: url("/fonts/instrument-serif-italic.woff2") format("woff2");
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
:root {
  color-scheme: dark;
  --paper: #0b0a08;
  --paper-2: #12100c;
  --surface: #16130f;
  --ink: #f3eadc;
  --ink-2: #cbb89a;
  --accent: #c9a36a;
  --accent-ink: #0b0a08;
  --line: rgba(201, 163, 106, 0.22);
  --field-line: rgba(201, 163, 106, 0.42);
  --btn-bg: #c9a36a;
  --btn-ink: #0b0a08;
  --focus: #e2c48c;
  --good-bg: #1c2a1e;
  --good-ink: #c5dcc8;
  --bad-bg: #2c1614;
  --bad-ink: #edc4c0;
  --dot-open: #8fbf96;
  --dot-shut: #c9a36a;
  --dot-unknown: #8a8074;
  --serif: "Instrument Serif", "Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif;
  --sans: "Source Sans 3", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --gutter: 1.2rem;
  --wrap: 1180px;
  --radius: 2px;
  --header-h: 4.25rem;
}
*, *::before, *::after { box-sizing: border-box; }
html {
  -webkit-text-size-adjust: 100%;
  scroll-padding-top: calc(var(--header-h) + .75rem);
  background: var(--paper);
  overflow-x: clip;
  overflow-y: auto;
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
  #intro { display: none !important; }
  html:not(.no-js):not(.intro-seen) { overflow: auto; }
  .hero__photo { animation: none !important; transform: none; }
}
body {
  margin: 0;
  min-height: 100dvh;
  overflow-x: clip;
  overflow-y: auto;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 1.05rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-wrap: break-word;
  font-synthesis: none;
}
[hidden] { display: none !important; }
.no-js .js-only { display: none !important; }
img, svg { display: block; max-width: 100%; }
img { height: auto; }
h1, h2, h3 { margin: 0 0 .5em; color: var(--ink); }
h1, h2 {
  font-family: var(--serif);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.02em;
}
h1 { font-size: clamp(2.75rem, 8.5vw, 5.75rem); }
h2 { font-size: clamp(1.9rem, 4.2vw, 3.05rem); }
h3 { font-family: var(--sans); font-weight: 650; line-height: 1.25; font-size: 1.05rem; }
p { margin: 0 0 1rem; }
a { color: var(--ink); text-underline-offset: .22em; }
a:hover { color: var(--accent); }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
a, button, input, select, textarea { scroll-margin-top: calc(var(--header-h) + 1rem); }
#order-form :is(a, button, input, select, textarea), #slip { scroll-margin-top: calc(var(--header-h) + 1rem); }
::selection { background: var(--accent); color: var(--accent-ink); }

.wrap {
  width: min(100% - var(--gutter) * 2, var(--wrap));
  margin-inline: auto;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
.section { padding-block: clamp(3.25rem, 8vw, 6.5rem); }
.hero + .section { padding-top: clamp(1.5rem, 3.5vw, 2.5rem); }
.section__head { margin-bottom: clamp(1.5rem, 4vw, 2.5rem); }
.section__head h2 { margin: 0; }
.center { text-align: center; margin-inline: auto; }
.skip {
  position: absolute; left: -9999px; top: 0; z-index: 100;
  background: var(--btn-bg); color: var(--btn-ink);
  padding: .7rem 1rem; font-weight: 600;
}
.skip:focus { left: 0; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Opening credits: timed overlay, not a network wait. */
.no-js #intro { display: none; }
html.has-intro:not(.intro-seen) { overflow: hidden; }
html.intro-seen #intro { display: none; }
#intro {
  position: fixed; inset: 0; z-index: 80;
  display: grid; place-items: center;
  background: #0b0a08;
  color: var(--ink);
  pointer-events: auto;
}
#intro.is-out {
  transform: translateY(-100%);
  pointer-events: none;
  transition: transform .75s cubic-bezier(.77, 0, .18, 1);
}
#intro.is-done {
  visibility: hidden;
  pointer-events: none;
}
.intro__stage {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; padding: 1.5rem;
}
.intro__mark {
  width: 4.5rem; height: 4.5rem; margin: 0 0 1.15rem;
  overflow: visible;
}
#intro .intro__draw {
  fill: none;
  stroke: var(--accent);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: intro-draw .72s cubic-bezier(.4, 0, .2, 1) forwards;
}
#intro .intro__draw--rim { animation-delay: .08s; }
#intro .intro__draw--stem { animation-delay: .2s; }
#intro .intro__draw--foot { animation-delay: .32s; }
#intro .intro__beans {
  fill: var(--accent);
  opacity: 0;
  animation: intro-fade .4s ease .52s forwards;
}
.intro__word {
  font-family: var(--serif);
  font-size: clamp(2.05rem, 6.2vw, 3.35rem);
  font-weight: 400;
  line-height: 1;
  color: var(--ink);
  margin: 0 0 1.05rem;
  white-space: nowrap;
  opacity: 0;
  letter-spacing: .28em;
  animation: intro-word .85s ease .42s forwards;
}
.intro__pour {
  display: block;
  width: 140px; height: 1px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left center;
  margin: 0 0 1rem;
  animation: intro-pour .5s cubic-bezier(.4, 0, .2, 1) .92s forwards;
}
.intro__place {
  margin: 0;
  opacity: 0;
  animation: intro-fade .45s ease 1.18s forwards;
}
@keyframes intro-draw { to { stroke-dashoffset: 0; } }
@keyframes intro-fade { to { opacity: 1; } }
@keyframes intro-word {
  from { opacity: 0; letter-spacing: .28em; }
  to { opacity: 1; letter-spacing: .1em; }
}
@keyframes intro-pour { to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) {
  #intro { display: none !important; }
  html:not(.no-js):not(.intro-seen) { overflow: auto; }
  .hero__photo { animation: none !important; transform: none; }
}
.kicker {
  color: var(--accent);
  font-size: .72rem;
  font-weight: 650;
  letter-spacing: .22em;
  text-transform: uppercase;
  margin: 0 0 .85rem;
}
.lede {
  font-size: 1.12rem;
  color: var(--ink-2);
  max-width: 28rem;
  line-height: 1.55;
}
.lede em { font-family: var(--serif); font-style: italic; color: var(--ink); }
.muted { color: var(--ink-2); }
.small { font-size: .95rem; }
.tabular { font-variant-numeric: tabular-nums; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
  min-height: 46px; padding: .55rem 1.25rem;
  border: 1px solid var(--btn-bg); border-radius: var(--radius);
  background: var(--btn-bg); color: var(--btn-ink);
  font: inherit; font-size: .95rem; font-weight: 650;
  letter-spacing: .04em;
  text-decoration: none; cursor: pointer; text-align: center;
  transition: background-color .2s ease, color .2s ease, border-color .2s ease;
}
@media (hover: hover) and (pointer: fine) {
  .btn:hover { background: #d8b57c; border-color: #d8b57c; color: var(--btn-ink); }
}
.btn[disabled], .btn[aria-disabled="true"] { opacity: .5; cursor: not-allowed; }
.btn--ghost {
  background: transparent; color: var(--ink); border-color: var(--line);
}
.btn--ghost:hover { background: transparent; color: var(--accent); border-color: var(--accent); }
.btn--wide { width: 100%; }
.btn--lg { min-height: 50px; padding: .7rem 1.3rem; }
.btn-row { display: flex; flex-wrap: wrap; gap: .7rem; }
.btn.is-added { background: var(--good-bg); color: var(--good-ink); border-color: transparent; }
.btn.is-added:hover { color: var(--good-ink); }

.site-header {
  position: sticky; top: 0; z-index: 50;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  padding-top: env(safe-area-inset-top);
  transition: background-color .28s ease, border-color .28s ease, background-image .28s ease;
}
.has-hero .site-header {
  background-color: transparent;
  background-image: linear-gradient(180deg, rgba(11,10,8,.72) 0%, rgba(11,10,8,.28) 58%, rgba(11,10,8,0) 100%);
  border-bottom-color: transparent;
}
.has-hero .site-header.is-solid {
  background-image: none;
  background-color: var(--paper);
  border-bottom-color: var(--line);
}
.site-header__inner {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  min-height: var(--header-h);
}
`;
