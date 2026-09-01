export const CSS_C = `.no-js .slip__empty, .no-js .slip__lines, .no-js .slip__total { display: none; }

.page-head { padding-top: 0; margin-bottom: 1.25rem; }
.page-head h1 { margin-bottom: .35rem; }
.page-head .lede { margin-bottom: 0; }
.stack { margin: .75rem 0 0; padding: .75rem 0 0; border-top: 1px solid var(--line); }
.stack dt { font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); margin: 0 0 .2rem; }
.stack dd { margin: 0 0 .7rem; }
.stack dd:last-child { margin-bottom: 0; }
.status--plain { font-weight: 600; color: var(--ink); }

.catnav {
  position: static;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  margin: 0 0 1.5rem;
}
.catnav__inner { display: flex; gap: 1.25rem; overflow-x: auto; padding-block: .7rem; scrollbar-width: none; }
.catnav__inner::-webkit-scrollbar { display: none; }
.catnav a {
  flex: none; display: inline-flex; align-items: center; min-height: 40px;
  font-size: .78rem; font-weight: 650; letter-spacing: .16em; text-transform: uppercase;
  color: var(--ink-2); text-decoration: none; white-space: nowrap;
}
.catnav a:hover { color: var(--accent); text-decoration: none; }
.menu-cat { scroll-margin-top: calc(var(--header-h) + .75rem); padding-bottom: 2.5rem; }
.menu-cat h2 { margin: 0 0 1.25rem; }

.order-layout { display: grid; gap: 2.25rem; align-items: start; padding-top: clamp(1.5rem, 4vw, 2.5rem); padding-bottom: 6rem; }
@media (min-width: 960px) {
  .order-layout { grid-template-columns: minmax(0, 1fr) 380px; gap: 2.5rem 2.25rem; padding-bottom: 2.5rem; }
}

.slip {
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 1.15rem 1.2rem 1.2rem;
}
@media (min-width: 960px) {
  .slip {
    position: sticky;
    top: calc(var(--header-h) + .6rem);
    height: calc(100svh - var(--header-h) - 1.2rem);
    max-height: calc(100svh - var(--header-h) - 1.2rem);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
.slip h2 { font-size: 1.65rem; margin: 0 0 .55rem; }
.slip__head { flex: none; margin-bottom: .85rem; }
.slip__rule {
  display: block; width: 3.25rem; height: 1px;
  background: var(--accent); margin: 0 0 .75rem;
}
.slip__head .status { font-size: .88rem; margin: 0 0 .3rem; }
.slip__where { margin: 0; font-size: .85rem; color: var(--ink-2); line-height: 1.45; }
.slip__where a { color: var(--ink-2); text-decoration: none; }
.slip__where a:hover { color: var(--accent); }
.slip__scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.slip__lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .75rem; }
.slip__line { display: grid; grid-template-columns: 1fr auto; gap: .15rem .75rem; padding-bottom: .75rem; border-bottom: 1px solid var(--line); }
.slip__line:last-child { border-bottom: 0; padding-bottom: 0; }
.slip__name { font-weight: 600; font-size: .95rem; }
.slip__meta { grid-column: 1; font-size: .85rem; color: var(--ink-2); display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.slip__cost { grid-row: 1; grid-column: 2; font-weight: 600; font-size: .95rem; font-variant-numeric: tabular-nums; color: var(--accent); }
.slip__remove { background: none; border: 0; padding: .25rem .3rem; margin: 0; color: var(--ink-2); font: inherit; font-size: .85rem; text-decoration: underline; cursor: pointer; min-height: 32px; }
.slip__remove:hover { color: var(--accent); }
.slip__total { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin: .85rem 0 0; padding-top: .75rem; border-top: 1px solid var(--line); font-weight: 700; }
.slip__total span:last-child { font-size: 1.15rem; font-variant-numeric: tabular-nums; color: var(--accent); }
.slip__empty { color: var(--ink-2); font-size: .92rem; margin: 0 0 1rem; font-style: italic; }
.slip__guest { margin-top: 1rem; padding-top: .9rem; border-top: 1px solid var(--line); }
.slip .field { margin-bottom: .7rem; }
.slip .field-row { grid-template-columns: 1fr; gap: .7rem; }
.slip .slip__when { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; }
.slip label { font-size: .82rem; }
.slip input, .slip select, .slip textarea {
  min-height: 42px; padding: .55rem .7rem;
  background: #241f18;
  border-color: rgba(201, 163, 106, 0.48);
}
.slip textarea { min-height: 4.25rem; }
.slip .stepper button { width: 32px; height: 36px; }
.slip__foot { flex: none; margin-top: .85rem; padding-top: .85rem; border-top: 1px solid var(--line); }
.slip__foot .btn[disabled],
.slip__foot .btn[disabled]:hover {
  opacity: 1;
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  cursor: not-allowed;
}
.slip__pay { font-size: .85rem; color: var(--ink-2); margin: .7rem 0 0; text-align: center; }
.slip .slip__when + .field__hint { margin-top: -.15rem; margin-bottom: .75rem; }
@media (max-width: 959px) {
  .slip { padding-bottom: calc(1.75rem + 6.25rem + env(safe-area-inset-bottom)); }
  #place-order { scroll-margin-bottom: calc(7rem + env(safe-area-inset-bottom)); }
}

.checkout { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.5rem; max-width: 48rem; }
.checkout h2 { margin-top: 0; }

.dock {
  position: sticky; bottom: 0; z-index: 45;
  display: flex; align-items: center; gap: 1rem;
  background: var(--paper);
  border-top: 1px solid var(--line);
  padding: .7rem var(--gutter) calc(.7rem + env(safe-area-inset-bottom));
  margin-top: 2rem;
  min-height: calc(3.5rem + env(safe-area-inset-bottom));
}
@media (min-width: 960px) { .dock { display: none; } }
.dock__info { flex: 1 1 auto; font-size: .95rem; line-height: 1.3; }
.dock__info strong { display: block; font-size: 1.05rem; font-variant-numeric: tabular-nums; color: var(--accent); }
.dock .btn {
  flex: 0 0 auto;
  min-width: 9.5rem;
  white-space: nowrap;
  color: var(--btn-ink);
  background: var(--btn-bg);
  border-color: var(--btn-bg);
  font-size: .9rem;
  font-weight: 650;
}

.split { display: grid; gap: 2.5rem; align-items: start; }
@media (min-width: 860px) { .split { grid-template-columns: 1.05fr .95fr; gap: 4rem; } }

.hours {
  list-style: none; margin: 1.75rem 0 0; padding: 1rem 0 0;
  border-top: 1px solid var(--line);
  font-size: 1.02rem; max-width: 24rem;
}
.hours li { display: flex; justify-content: space-between; gap: 1.25rem; padding: .4rem 0; border: 0; }
.hours [data-day="Monday"] { color: var(--ink-2); }
.hours [data-today] { font-weight: 650; color: var(--accent); }
.info-card { background: transparent; border: 0; border-radius: 0; padding: 0; }
.note h3 {
  margin: 0 0 .4rem;
  font-family: var(--serif); font-weight: 400; font-size: 1.7rem;
}

.receipt { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.5rem 1.5rem 1.6rem; }
.receipt__number { font-family: var(--serif); font-size: 2.4rem; line-height: 1.05; margin: .25rem 0 0; font-weight: 400; color: var(--accent); }
.receipt__lines { list-style: none; margin: 1.25rem 0 0; padding: 0; }
.receipt__lines li { display: flex; justify-content: space-between; gap: 1rem; padding: .55rem 0; border-bottom: 1px solid var(--line); font-size: .95rem; }
.receipt__total { display: flex; justify-content: space-between; gap: 1rem; padding-top: .9rem; font-weight: 700; }
.receipt__where { margin: 1.15rem 0 0; padding-top: .9rem; border-top: 1px solid var(--line); font-size: .95rem; color: var(--ink-2); }
.receipt__where a { color: var(--ink); }

.stage {
  position: relative;
  margin: 0;
  isolation: isolate;
  background: #1a1713;
}
.stage__photo {
  width: 100%;
  height: min(82svh, 48rem);
  object-fit: cover;
  object-position: 58% 48%;
}
.stage__copy {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
  padding-top: 7rem;
  padding-bottom: clamp(2rem, 6vw, 3.5rem);
  background: linear-gradient(180deg, transparent, rgba(11,10,8,.82) 70%);
}
.stage__line {
  font-family: var(--serif);
  font-size: clamp(1.7rem, 4.4vw, 2.75rem);
  line-height: 1.12;
  margin: 0;
  max-width: 14ch;
}

.site-footer {
  border-top: 1px solid var(--line);
  margin-top: 0;
  padding: 2rem 0 calc(2rem + env(safe-area-inset-bottom));
  color: var(--ink-2);
  font-size: .95rem;
}
.site-footer p { margin: 0 0 .4rem; }
.site-footer p:last-child { margin-bottom: 0; }
.site-footer .brand__name { color: var(--ink); }
.site-footer a { color: var(--ink-2); text-decoration: none; }
.site-footer a:hover { color: var(--accent); }

@media print {
  .site-header, .site-footer, .dock, .catnav, .btn, .hero, .stage, #intro { display: none !important; }
  :root {
    --paper: #fff; --paper-2: #fff; --surface: #fff;
    --ink: #000; --ink-2: #333;
    --accent: #000; --accent-ink: #000;
    --line: #999; --field-line: #666;
  }
  body { background: #fff; color: #000; }
  .card, .info-card, .receipt, .slip { border-color: #999; }
}
`;
