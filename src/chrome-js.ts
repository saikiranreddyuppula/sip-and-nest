export const CHROME_JS = `
(function () {
  /* --- opening credits: timed curtain on home, every load; always restore scroll --- */
  var intro = document.getElementById("intro");
  if (intro) {
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    var seen = false;
    function markSeen() {}
    function rest() {
      intro.classList.add("is-done");
      intro.setAttribute("inert", "");
      document.documentElement.classList.add("intro-seen");
      var locked = document.querySelectorAll("header, main, footer, .skip");
      for (var i = 0; i < locked.length; i++) locked[i].removeAttribute("inert");
    }
    function lift() {
      if (intro.classList.contains("is-out") || intro.classList.contains("is-done")) return;
      markSeen();
      intro.classList.add("is-out");
      intro.style.pointerEvents = "none";
      var ended = false;
      function end() {
        if (ended) return;
        ended = true;
        rest();
      }
      intro.addEventListener("transitionend", end);
      setTimeout(end, 900);
    }
    if (seen || reduce) {
      markSeen();
      rest();
    } else {
      markSeen();
      var page = document.querySelectorAll("header, main, footer, .skip");
      for (var j = 0; j < page.length; j++) page[j].setAttribute("inert", "");
      var lifted = false;
      function startLift() {
        if (lifted) return;
        lifted = true;
        lift();
      }
      var hero = document.querySelector(".hero__photo");
      setTimeout(function () {
        if (!hero || hero.complete) startLift();
        else {
          var wait = setTimeout(startLift, 350);
          hero.addEventListener("load", function () {
            clearTimeout(wait);
            setTimeout(startLift, 180);
          });
          hero.addEventListener("error", startLift);
        }
      }, 1480);
      setTimeout(startLift, 2300);
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
    if (todayCell) {
      todayCell.setAttribute("data-today", "true");
    } else if (now.day !== 1) {
      var openRow = document.querySelector("[data-open-days]");
      if (openRow) openRow.setAttribute("data-today", "true");
    }
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

  var headerEl = document.querySelector(".site-header");
  if (headerEl && document.body.classList.contains("has-hero")) {
    var solid = false;
    function paintHeader() {
      var on = window.scrollY > 36;
      if (on === solid) return;
      solid = on;
      headerEl.classList.toggle("is-solid", on);
    }
    paintHeader();
    window.addEventListener("scroll", paintHeader, { passive: true });
  }
})();
`.trim();
