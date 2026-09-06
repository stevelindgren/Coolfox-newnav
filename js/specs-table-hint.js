(function () {
  var wrappers = document.querySelectorAll(".specs-table");
  if (!wrappers.length) return;

  var mobileTabletQuery = window.matchMedia("(max-width: 1199.98px)");

  function ensureHint(wrapper) {
    var sibling = wrapper.previousElementSibling;
    if (sibling && sibling.classList.contains("specs-table-scroll-hint")) {
      return sibling;
    }

    var hint = document.createElement("p");
    hint.className = "specs-table-scroll-hint is-at-start";
    hint.hidden = true;
    hint.innerHTML =
      '<span class="specs-table-scroll-hint__text">Scroll left and right to see all model options</span>' +
      '<span class="specs-table-scroll-hint__arrow specs-table-scroll-hint__arrow--left" aria-hidden="true"><i class="icon icon-16 icon-solid fa-chevron-left"></i></span>' +
      '<span class="specs-table-scroll-hint__arrow specs-table-scroll-hint__arrow--right" aria-hidden="true"><i class="icon icon-16 icon-solid fa-chevron-right"></i></span>';

    wrapper.parentNode.insertBefore(hint, wrapper);
    return hint;
  }

  function isScrollable(wrapper) {
    return wrapper.scrollWidth > wrapper.clientWidth + 2;
  }

  function setDirectionState(hint, direction) {
    hint.classList.toggle("is-direction-left", direction === "left");
    hint.classList.toggle("is-direction-right", direction === "right");
  }

  function updateHintState(wrapper, hint) {
    if (!mobileTabletQuery.matches || !isScrollable(wrapper)) {
      hint.hidden = true;
      wrapper.classList.remove("is-scrolled-x");
      return;
    }

    hint.hidden = false;

    var maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
    var scrollLeft = wrapper.scrollLeft;
    var atStart = scrollLeft <= 1.5;
    var atEnd = scrollLeft >= maxScroll - 1.5;

    wrapper.classList.toggle("is-scrolled-x", !atStart);
    hint.classList.toggle("is-at-start", atStart);
    hint.classList.toggle("is-at-end", atEnd);

    if (atEnd) {
      setDirectionState(hint, "right");
      return;
    }
    setDirectionState(hint, "left");
  }

  var tracked = [];
  for (var i = 0; i < wrappers.length; i++) {
    var wrapper = wrappers[i];
    var hint = ensureHint(wrapper);
    tracked.push({ wrapper: wrapper, hint: hint });

    wrapper.addEventListener("scroll", (function (w, h) {
      return function () {
        updateHintState(w, h);
      };
    })(wrapper, hint), { passive: true });
  }

  function refreshAllHints() {
    for (var i = 0; i < tracked.length; i++) {
      updateHintState(tracked[i].wrapper, tracked[i].hint);
    }
  }

  window.addEventListener("resize", refreshAllHints);
  window.addEventListener("load", refreshAllHints);

  if (typeof mobileTabletQuery.addEventListener === "function") {
    mobileTabletQuery.addEventListener("change", refreshAllHints);
  } else if (typeof mobileTabletQuery.addListener === "function") {
    mobileTabletQuery.addListener(refreshAllHints);
  }

  refreshAllHints();
})();
