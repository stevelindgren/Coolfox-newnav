(function () {
  var nav = document.querySelector(".site-nav");
  if (!nav) return;

  var mobilePanel = document.getElementById("mobileNav");
  var mobileToggle = nav.querySelector(".site-nav__toggler");
  var mobilePanelUsesOffcanvas =
    !!mobilePanel &&
    mobilePanel.classList.contains("offcanvas") &&
    !!mobileToggle &&
    mobileToggle.getAttribute("data-bs-toggle") === "offcanvas";
  var bsOffcanvas =
    mobilePanelUsesOffcanvas &&
    typeof bootstrap !== "undefined" &&
    bootstrap.Offcanvas
      ? bootstrap.Offcanvas.getOrCreateInstance(mobilePanel)
      : null;
  var mobileClose = mobilePanel
    ? mobilePanel.querySelector(".site-nav__mobile-close")
    : null;
  var desktopItems = Array.prototype.slice.call(
    nav.querySelectorAll(".site-nav__menu-item--has-dropdown")
  );
  var mobileGroups = mobilePanel
    ? Array.prototype.slice.call(mobilePanel.querySelectorAll(".site-nav__mobile-group"))
    : [];
  var aliasMap = {
    "": "index.html",
    "index.php": "index.html",
    "gallery-ford-transit-alt.html": "gallery-ford-transit.html",
    "rental-rates.html": "rental.html"
  };
  var hoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
  var desktopMedia = window.matchMedia("(min-width: 1200px)");
  var openDesktopMenu = null;
  var openMobileGroup = null;
  var hoverCloseTimer = null;
  var mobileHideTimer = null;
  var shouldReturnMobileFocus = false;
  var lastScrollY = Math.max(0, window.pageYOffset || window.scrollY || 0);

  var desktopMenuMap = {};
  desktopItems.forEach(function (item) {
    var menuName = item.getAttribute("data-menu");
    var trigger = item.querySelector(".site-nav__menu-trigger");
    var panelId = trigger ? trigger.getAttribute("aria-controls") : null;
    var panel = panelId ? document.getElementById(panelId) : null;

    if (menuName && trigger && panel) {
      desktopMenuMap[menuName] = {
        item: item,
        trigger: trigger,
        panel: panel
      };
    }
  });

  var mobileGroupMap = {};
  mobileGroups.forEach(function (group) {
    var menuName = group.getAttribute("data-menu");
    var trigger = group.querySelector(".site-nav__mobile-trigger");
    var panelId = trigger ? trigger.getAttribute("aria-controls") : null;
    var panel = panelId ? document.getElementById(panelId) : null;

    if (menuName && trigger && panel) {
      mobileGroupMap[menuName] = {
        item: group,
        trigger: trigger,
        panel: panel
      };
    }
  });

  function isDesktopViewport() {
    return desktopMedia.matches;
  }

  function prefersHoverOpen() {
    return hoverMedia.matches;
  }

  function normalizeFile(file) {
    var normalized = file || "index.html";
    if (aliasMap[normalized]) {
      normalized = aliasMap[normalized];
    }
    return normalized;
  }

  function normalizeHash(hash) {
    if (!hash) return "";
    try {
      return decodeURIComponent(hash);
    } catch (error) {
      return hash;
    }
  }

  function getCurrentFile() {
    var file = window.location.pathname.split("/").pop();
    return normalizeFile(file);
  }

  function setNavOffset() {
    document.documentElement.style.setProperty(
      "--nav-offset",
      nav.offsetHeight + "px"
    );
  }

  function updateNavShadow() {
    if (window.scrollY > 0) {
      nav.classList.add("is-scrolled");
    } else {
      nav.classList.remove("is-scrolled");
    }
  }

  function setDesktopNavHidden(hidden) {
    if (!isDesktopViewport() || nav.classList.contains("is-mobile-open") || openDesktopMenu) {
      hidden = false;
    }

    nav.classList.toggle("is-desktop-hidden", !!hidden);
  }

  function updateDesktopNavVisibility() {
    var currentScrollY = Math.max(0, window.pageYOffset || window.scrollY || 0);
    var deltaY = currentScrollY - lastScrollY;
    var navHeight = nav.offsetHeight;

    if (!isDesktopViewport()) {
      setDesktopNavHidden(false);
      lastScrollY = currentScrollY;
      return;
    }

    if (currentScrollY <= navHeight) {
      setDesktopNavHidden(false);
      lastScrollY = currentScrollY;
      return;
    }

    if (deltaY > 6) {
      setDesktopNavHidden(true);
    } else if (deltaY < -6) {
      setDesktopNavHidden(false);
    }

    lastScrollY = currentScrollY;
  }

  function scrollToHashTarget() {
    if (!window.location.hash) return;

    var id = normalizeHash(window.location.hash).slice(1);
    if (!id) return;

    var target = document.getElementById(id);
    if (!target) return;

    var navOffset = nav.offsetHeight;
    var top = target.getBoundingClientRect().top + window.pageYOffset - navOffset;
    window.scrollTo(0, Math.max(0, Math.round(top)));
  }

  function clearActiveStates(root) {
    Array.prototype.forEach.call(root.querySelectorAll(".is-active"), function (el) {
      el.classList.remove("is-active");
    });
    Array.prototype.forEach.call(root.querySelectorAll(".is-current"), function (el) {
      el.classList.remove("is-current");
    });
    Array.prototype.forEach.call(root.querySelectorAll("[aria-current='page']"), function (el) {
      el.removeAttribute("aria-current");
    });
  }

  function shouldMatchLink(linkUrl, currentUrl, currentFile, currentBase, currentHash) {
    var linkFile = normalizeFile(linkUrl.pathname.split("/").pop());
    var linkBase = linkFile.replace(/\.html?$/i, "");
    var fileMatches = linkFile === currentFile || linkBase === currentBase;

    if (!fileMatches) return false;

    if (linkUrl.hash) {
      return normalizeHash(linkUrl.hash) === currentHash;
    }

    return currentHash === "";
  }

  function markParentStates(link) {
    var desktopPanel = link.closest(".site-nav__dropdown-panel");
    if (desktopPanel) {
      var menuItem = desktopPanel
        .closest(".site-nav")
        .querySelector(
          '.site-nav__menu-item--has-dropdown [aria-controls="' +
            desktopPanel.id +
            '"]'
        );

      if (menuItem) {
        var parentItem = menuItem.closest(".site-nav__menu-item");
        if (parentItem) parentItem.classList.add("is-current");
      }
    }

    var mobileSubmenu = link.closest(".site-nav__mobile-submenu");
    if (mobileSubmenu) {
      var mobileGroup = mobileSubmenu.closest(".site-nav__mobile-group");
      if (mobileGroup) mobileGroup.classList.add("is-current");
    }

    var menuControl = link.closest(".site-nav__menu-item");
    if (menuControl) {
      menuControl.classList.add("is-current");
    }
  }

  function setActiveNavLink() {
    var roots = [nav];
    var currentUrl = new URL(window.location.href);
    var currentFile = getCurrentFile();
    var currentBase = currentFile.replace(/\.html?$/i, "");
    var currentHash = normalizeHash(window.location.hash);

    if (mobilePanel) {
      roots.push(mobilePanel);
    }

    roots.forEach(clearActiveStates);

    roots.forEach(function (root) {
      Array.prototype.forEach.call(root.querySelectorAll("a[href]"), function (link) {
        var href = link.getAttribute("href");
        var linkUrl;

        if (!href || href === "#") return;
        if (href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
        if (link.classList.contains("site-nav__brand")) return;

        try {
          linkUrl = new URL(href, currentUrl.href);
        } catch (error) {
          return;
        }

        if (linkUrl.origin !== currentUrl.origin) return;

        if (!shouldMatchLink(linkUrl, currentUrl, currentFile, currentBase, currentHash)) {
          return;
        }

        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
        markParentStates(link);
      });
    });
  }

  function cancelHoverClose() {
    if (hoverCloseTimer) {
      window.clearTimeout(hoverCloseTimer);
      hoverCloseTimer = null;
    }
  }

  function hideDesktopPanel(menuName) {
    var entry = desktopMenuMap[menuName];
    if (!entry) return;

    entry.item.classList.remove("is-open");
    entry.trigger.setAttribute("aria-expanded", "false");
    entry.panel.classList.remove("is-open");

    window.clearTimeout(entry.panel._hideTimer);
    entry.panel._hideTimer = window.setTimeout(function () {
      if (!entry.panel.classList.contains("is-open")) {
        entry.panel.hidden = true;
      }
    }, 220);
  }

  function openDesktopPanel(menuName) {
    var entry = desktopMenuMap[menuName];
    if (!entry) return;

    cancelHoverClose();
    setDesktopNavHidden(false);

    if (openDesktopMenu && openDesktopMenu !== menuName) {
      hideDesktopPanel(openDesktopMenu);
    }

    openDesktopMenu = menuName;
    nav.classList.add("has-open-menu");
    entry.item.classList.add("is-open");
    entry.trigger.setAttribute("aria-expanded", "true");
    entry.panel.hidden = false;

    window.clearTimeout(entry.panel._hideTimer);
    window.requestAnimationFrame(function () {
      entry.panel.classList.add("is-open");
    });
  }

  function closeDesktopMenus(options) {
    var shouldReturnFocus = options && options.returnFocus;
    var triggerToFocus = null;

    if (openDesktopMenu && desktopMenuMap[openDesktopMenu]) {
      triggerToFocus = desktopMenuMap[openDesktopMenu].trigger;
      hideDesktopPanel(openDesktopMenu);
    }

    openDesktopMenu = null;
    nav.classList.remove("has-open-menu");
    cancelHoverClose();

    if (shouldReturnFocus && triggerToFocus) {
      triggerToFocus.focus();
    }
  }

  function scheduleDesktopClose() {
    cancelHoverClose();
    hoverCloseTimer = window.setTimeout(function () {
      if (!nav.contains(document.activeElement)) {
        closeDesktopMenus();
      }
    }, 140);
  }

  function hideMobileGroup(menuName) {
    var entry = mobileGroupMap[menuName];
    if (!entry) return;

    entry.item.classList.remove("is-open");
    entry.trigger.setAttribute("aria-expanded", "false");

    window.clearTimeout(entry.panel._hideTimer);
    entry.panel._hideTimer = window.setTimeout(function () {
      if (!entry.item.classList.contains("is-open")) {
        entry.panel.hidden = true;
      }
    }, 220);
  }

  function openMobileGroupPanel(menuName) {
    var entry = mobileGroupMap[menuName];
    if (!entry) return;

    if (openMobileGroup && openMobileGroup !== menuName) {
      hideMobileGroup(openMobileGroup);
    }

    openMobileGroup = menuName;
    entry.panel.hidden = false;
    entry.trigger.setAttribute("aria-expanded", "true");

    window.requestAnimationFrame(function () {
      entry.item.classList.add("is-open");
    });
  }

  function closeMobileGroups() {
    mobileGroups.forEach(function (group) {
      var menuName = group.getAttribute("data-menu");
      hideMobileGroup(menuName);
    });
    openMobileGroup = null;
  }

  function openActiveMobileGroup() {
    var activeGroup = mobilePanel
      ? mobilePanel.querySelector(".site-nav__mobile-group.is-current")
      : null;

    if (!activeGroup) return;

    openMobileGroupPanel(activeGroup.getAttribute("data-menu"));
  }

  function openMobilePanel() {
    if (!mobilePanel || !mobileToggle) return;

    if (bsOffcanvas) {
      bsOffcanvas.show();
      return;
    }

    window.clearTimeout(mobileHideTimer);
    mobilePanel.hidden = false;
    nav.classList.add("is-mobile-open");
    document.body.classList.add("site-nav-lock");
    mobileToggle.setAttribute("aria-expanded", "true");
    mobileToggle.setAttribute("aria-label", "Close site navigation");
    closeMobileGroups();
    openActiveMobileGroup();

    window.requestAnimationFrame(function () {
      mobilePanel.classList.add("is-open");
    });
  }

  function closeMobilePanel(options) {
    var shouldReturnFocus = options && options.returnFocus;
    var immediate = options && options.immediate;

    if (!mobilePanel || !mobileToggle) return;

    if (bsOffcanvas) {
      shouldReturnMobileFocus = !!shouldReturnFocus;

      if (mobilePanel.classList.contains("show")) {
        bsOffcanvas.hide();
      } else {
        nav.classList.remove("is-mobile-open");
        document.body.classList.remove("site-nav-lock");
        mobileToggle.setAttribute("aria-expanded", "false");
        mobileToggle.setAttribute("aria-label", "Toggle navigation");
        closeMobileGroups();

        if (shouldReturnMobileFocus) {
          mobileToggle.focus();
        }

        shouldReturnMobileFocus = false;
      }

      return;
    }

    nav.classList.remove("is-mobile-open");
    document.body.classList.remove("site-nav-lock");
    mobileToggle.setAttribute("aria-expanded", "false");
    mobileToggle.setAttribute("aria-label", "Open site navigation");
    mobilePanel.classList.remove("is-open");
    closeMobileGroups();

    window.clearTimeout(mobileHideTimer);
    if (immediate) {
      mobilePanel.hidden = true;
    } else {
      mobileHideTimer = window.setTimeout(function () {
        if (!nav.classList.contains("is-mobile-open")) {
          mobilePanel.hidden = true;
        }
      }, 220);
    }

    if (shouldReturnFocus) {
      mobileToggle.focus();
    }
  }

  function toggleMobilePanel() {
    if (!mobilePanel || !mobileToggle) return;

    if (bsOffcanvas) {
      if (mobilePanel.classList.contains("show")) {
        closeMobilePanel({ returnFocus: true });
      } else {
        openMobilePanel();
      }
      return;
    }

    if (nav.classList.contains("is-mobile-open")) {
      closeMobilePanel({ returnFocus: true });
    } else {
      openMobilePanel();
    }
  }

  function syncViewportState() {
    setNavOffset();
    lastScrollY = Math.max(0, window.pageYOffset || window.scrollY || 0);

    if (!isDesktopViewport()) {
      setDesktopNavHidden(false);
      closeDesktopMenus();
      return;
    }

    closeMobilePanel({ immediate: true });
    updateDesktopNavVisibility();
  }

  setNavOffset();
  updateNavShadow();
  updateDesktopNavVisibility();
  setActiveNavLink();

  window.addEventListener("load", function () {
    setNavOffset();
    setTimeout(scrollToHashTarget, 0);
  });
  window.addEventListener("hashchange", function () {
    setActiveNavLink();
    setTimeout(scrollToHashTarget, 0);
  });
  window.addEventListener("resize", syncViewportState);
  document.addEventListener(
    "scroll",
    function () {
      updateNavShadow();
      updateDesktopNavVisibility();
    },
    { passive: true }
  );

  desktopItems.forEach(function (item) {
    var menuName = item.getAttribute("data-menu");
    var trigger = item.querySelector(".site-nav__menu-trigger");

    if (!trigger) return;

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (openDesktopMenu === menuName) {
        closeDesktopMenus({ returnFocus: true });
      } else {
        openDesktopPanel(menuName);
      }
    });

    item.addEventListener("mouseenter", function () {
      if (isDesktopViewport() && prefersHoverOpen()) {
        openDesktopPanel(menuName);
      }
    });
  });

  nav.addEventListener("mouseenter", cancelHoverClose);
  nav.addEventListener("mouseleave", function () {
    if (isDesktopViewport() && prefersHoverOpen() && openDesktopMenu) {
      scheduleDesktopClose();
    }
  });

  if (mobilePanel && bsOffcanvas) {
    mobilePanel.addEventListener("show.bs.offcanvas", function () {
      nav.classList.add("is-mobile-open");
      document.body.classList.add("site-nav-lock");
      if (mobileToggle) {
        mobileToggle.setAttribute("aria-expanded", "true");
        mobileToggle.setAttribute("aria-label", "Toggle navigation");
      }
      closeMobileGroups();
      openActiveMobileGroup();
    });

    mobilePanel.addEventListener("hidden.bs.offcanvas", function () {
      nav.classList.remove("is-mobile-open");
      document.body.classList.remove("site-nav-lock");
      if (mobileToggle) {
        mobileToggle.setAttribute("aria-expanded", "false");
        mobileToggle.setAttribute("aria-label", "Toggle navigation");
      }
      closeMobileGroups();

      if (shouldReturnMobileFocus && mobileToggle) {
        mobileToggle.focus();
      }
      shouldReturnMobileFocus = false;
    });
  }

  if (mobileToggle && !bsOffcanvas) {
    mobileToggle.addEventListener("click", function (event) {
      event.preventDefault();
      toggleMobilePanel();
    });
  }

  if (mobileClose) {
    mobileClose.addEventListener("click", function (event) {
      event.preventDefault();
      closeMobilePanel({ returnFocus: true });
    });
  }

  if (mobilePanel) {
    mobileGroups.forEach(function (group) {
      var menuName = group.getAttribute("data-menu");
      var trigger = group.querySelector(".site-nav__mobile-trigger");

      if (!trigger) return;

      trigger.addEventListener("click", function () {
        if (openMobileGroup === menuName) {
          hideMobileGroup(menuName);
          openMobileGroup = null;
        } else {
          openMobileGroupPanel(menuName);
        }
      });
    });

    mobilePanel.addEventListener("click", function (event) {
      var link = event.target.closest("a[href]");
      if (!link || !mobilePanel.contains(link)) return;

      closeMobilePanel();
    });
  }

  document.addEventListener("pointerdown", function (event) {
    if (!nav.contains(event.target) && !(mobilePanel && mobilePanel.contains(event.target))) {
      closeDesktopMenus();
      closeMobilePanel();
    }
  });

  document.addEventListener("focusin", function (event) {
    var insideNav = nav.contains(event.target);
    var insideMobilePanel = mobilePanel && mobilePanel.contains(event.target);

    if (!insideNav && !insideMobilePanel) {
      closeDesktopMenus();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    if (nav.classList.contains("is-mobile-open")) {
      closeMobilePanel({ returnFocus: true });
      return;
    }

    if (openDesktopMenu) {
      closeDesktopMenus({ returnFocus: true });
    }
  });
})();
