export const ORDER_JS_B = `        announce("That is as much as one ticket holds. Give the bar a call for a big order.");
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
      var moved = daySel.value;
      trimSlots();
      if (slotHint) slotHint.textContent = "Today is done — moved to the next day we are open.";
      announce("Today is finished, so pickup moved to " + moved + ".");
      return;
    }
    if (slotSel.selectedOptions[0] && slotSel.selectedOptions[0].disabled && firstOpen) {
      firstOpen.selected = true;
    }
    if (slotHint) {
      slotHint.textContent = today
        ? "Closed Mondays. Only times we can still make today."
        : "Closed Mondays. Pickups 7:30am–3:30pm.";
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
`;
