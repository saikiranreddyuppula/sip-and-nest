export const CSS_B = `.brand { display: inline-flex; align-items: center; gap: .65rem; min-height: 44px; text-decoration: none; color: var(--ink); }
.brand:hover { color: var(--ink); }
.brand__mark { width: 28px; height: 28px; flex: none; }
.brand__name {
  font-family: var(--serif);
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: .01em;
}
.site-nav { display: flex; align-items: center; margin-left: auto; }
.site-nav a {
  display: inline-flex; align-items: center; min-height: 44px; padding: 0 .1rem;
  color: var(--ink); text-decoration: none;
  font-size: .78rem; font-weight: 650; letter-spacing: .2em; text-transform: uppercase;
}
.site-nav a:hover, .site-nav a[aria-current="page"] { color: var(--accent); }

.hero {
  position: relative;
  isolation: isolate;
  display: grid;
  align-items: end;
  min-height: 100svh;
  margin-top: calc((var(--header-h) + env(safe-area-inset-top, 0px)) * -1);
  padding-top: calc(var(--header-h) + env(safe-area-inset-top, 0px));
  overflow: hidden;
}
.hero__photo {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  /* Coupe bowl is ~50% x, ~42% y in the frame — pin that to the optical center. */
  object-position: 50% 42%;
  z-index: 0; margin: 0; border-radius: 0;
  transform-origin: 50% 42%;
  animation: hero-rise 11s ease-out forwards;
}
@media (min-width: 800px) {
  .hero__photo { object-position: 50% 38%; transform-origin: 50% 38%; }
}
@keyframes hero-rise {
  from { transform: scale(1); }
  to { transform: scale(1.05); }
}
.hero__shade {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(180deg, rgba(11,10,8,.14) 0%, rgba(11,10,8,0) 20%, rgba(11,10,8,0) 58%, rgba(11,10,8,.62) 78%, rgba(11,10,8,.94) 100%);
}
.hero__copy {
  position: relative; z-index: 2;
  padding: 0 0 calc(clamp(2rem, 6vw, 3.75rem) + env(safe-area-inset-bottom, 0px));
  max-width: 30rem;
}
.hero h1 { margin: 0 0 .15rem; max-width: 8em; letter-spacing: -0.03em; }
.hero .btn-row { margin: 1.35rem 0 0; }
.hero .btn { min-height: 52px; padding: .8rem 1.55rem; }
.status {
  display: inline-flex; align-items: center; gap: .5rem;
  font-size: .95rem; color: var(--ink-2); margin: 0;
}
.status__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dot-open); flex: none; }
.status[data-open="false"] .status__dot { background: var(--dot-shut); }
.status[data-open="unknown"] .status__dot { background: var(--dot-unknown); }

.grid { display: grid; gap: 1.75rem; }
@media (min-width: 720px) {
  .order-layout .grid { grid-template-columns: 1fr 1fr; gap: 2rem 1.5rem; }
}
.grid--photos { gap: 2.75rem 1.5rem; }
.grid--photos .card__desc, .grid--photos .card__kicker { display: none; }
@media (min-width: 820px) {
  .grid--photos { grid-template-columns: 1fr 1fr; gap: 3.5rem 2rem; }
  .grid--photos .card:first-child {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(16rem, 1fr);
    gap: 0 3.5rem;
    align-items: center;
  }
  .grid--photos .card:first-child .card__media img { aspect-ratio: 3 / 2; }
  .grid--photos .card:first-child .card__body { padding: 0 0 .4rem; }
}
.grid--photos .card__actions .btn {
  flex: 0 0 auto;
  width: auto;
  min-height: 2.4rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  letter-spacing: .14em;
  text-transform: uppercase;
  font-size: .72rem;
  justify-content: flex-start;
}
.grid--photos .card__actions .btn:hover,
.grid--photos .card__actions .btn.btn--ghost:hover {
  background: transparent;
  color: var(--ink);
  border-color: transparent;
}

.card {
  display: flex; flex-direction: column;
  background: transparent; border: 0; border-radius: 0;
  overflow: hidden;
}
.card { scroll-margin-top: calc(var(--header-h) + 72px); }
.card__media { position: relative; background: #1a1713; }
.card__media img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; object-position: 50% 55%; }
.grid--photos .card__media img { aspect-ratio: 5 / 4; }
.card__flag {
  position: absolute; top: .85rem; right: .85rem; margin: 0;
  background: var(--paper); color: var(--accent);
  padding: .28rem .55rem; border-radius: 0; border: 1px solid var(--line);
  font-size: .68rem; font-weight: 650; letter-spacing: .14em; text-transform: uppercase;
}
.card__kicker { margin: 0 0 .35rem; }
.card__body { display: flex; flex-direction: column; flex: 1; padding: 1.05rem 0 0; }
.card__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .2rem .75rem; }
.card__name {
  flex: 1 1 auto; min-width: min(100%, 9rem); margin: 0;
  font-family: var(--serif); font-weight: 400; font-size: clamp(1.3rem, 2.2vw, 1.7rem); letter-spacing: -0.015em;
}
.card__price { flex: 0 0 auto; font-weight: 600; font-size: .92rem; white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--accent); }
.card__desc { color: var(--ink-2); font-size: .95rem; margin: .35rem 0 .95rem; }
.card__actions { margin-top: auto; display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.card__actions select { flex: 1 1 100%; width: 100%; }
.card__actions .btn { flex: 1 1 5rem; }
.card--out .card__media img { filter: grayscale(.7); opacity: .7; }
.card--out .card__name, .card--out .card__price { color: var(--ink-2); }

.menu-cat .card {
  background: transparent;
  border: 0;
}
.menu-cat .card__body { padding: 1rem 0 0.15rem; }
.menu-cat .card__name { font-size: 1.28rem; }
.menu-cat .card__desc { margin-bottom: .55rem; }
.menu-cat .grid { gap: 2.25rem; }
.menu-cat .card__actions {
  gap: .55rem .85rem;
}
.menu-cat .card__actions select {
  flex: 1 1 8rem;
  width: auto;
  max-width: 12rem;
  min-height: 2.5rem;
  padding-top: .35rem;
  padding-bottom: .35rem;
}
.menu-cat .card__actions .btn {
  flex: 0 0 auto;
  width: auto;
  min-height: 2.5rem;
  padding: 0 .15rem;
  border: 0;
  background: transparent;
  color: var(--accent);
  letter-spacing: .14em;
  text-transform: uppercase;
  font-size: .72rem;
}
.menu-cat .card__actions .btn:hover,
.menu-cat .card__actions .btn.btn--ghost:hover {
  background: transparent;
  color: var(--ink);
  border-color: transparent;
}
.menu-cat .card__actions .btn.is-added,
.menu-cat .card__actions .btn.is-added:hover {
  background: transparent;
  color: var(--accent);
  border: 0;
}

label { display: block; font-size: .9rem; font-weight: 650; letter-spacing: .02em; margin: 0 0 .35rem; }
.field { margin-bottom: 1rem; }
.field__hint { font-size: .85rem; color: var(--ink-2); font-weight: 400; margin: .3rem 0 0; }
input, select, textarea {
  font: inherit; font-size: max(16px, .95rem); color: var(--ink);
  background: #1e1a14; border: 1px solid var(--field-line);
  border-radius: var(--radius); padding: .7rem .85rem; min-height: 44px; width: 100%;
}
input::placeholder, textarea::placeholder { color: #7d7264; }
textarea { min-height: 6.5rem; resize: vertical; line-height: 1.45; }
select {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--accent) 50%), linear-gradient(135deg, var(--accent) 50%, transparent 50%);
  background-position: right 1.05rem center, right .78rem center;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 2.25rem;
}
.field-row { display: grid; gap: 1rem; grid-template-columns: 1fr; }
@media (min-width: 560px) { .field-row { grid-template-columns: 1fr 1fr; } }

.stepper {
  display: inline-flex; align-items: center;
  border: 1px solid var(--field-line); border-radius: var(--radius);
  background: #1e1a14; flex: none;
}
.stepper button {
  width: 36px; height: 44px; border: 0; background: transparent; color: var(--ink);
  font: inherit; font-size: 1.1rem; line-height: 1; cursor: pointer;
}
.stepper button:hover { background: rgba(201, 163, 106, .12); }
.stepper output { min-width: 1.5rem; text-align: center; font-size: .95rem; font-weight: 600; font-variant-numeric: tabular-nums; }

input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"] { border-color: var(--bad-ink); }
.notice { border-radius: var(--radius); padding: .8rem 1rem; margin: 0 0 1.25rem; font-size: .95rem; }
.notice--good { background: var(--good-bg); color: var(--good-ink); }
.notice--bad { background: var(--bad-bg); color: var(--bad-ink); }
.recall {
  display: inline-flex; align-items: center; gap: .5rem;
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius); padding: .5rem .9rem; font-size: .95rem; margin: 0 0 1rem;
}
.trap { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.nojs-note { display: none; }
.no-js .nojs-note { display: block; }
`;
