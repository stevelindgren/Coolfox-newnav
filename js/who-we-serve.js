(function () {
  var whoServeItems = document.querySelectorAll(".who-serve__item");
  var whoServeImage = document.querySelector(".who-serve__image img");
  var whoServeImageWrap = document.querySelector(".who-serve__image");
  var whoServeIndicator = document.querySelector(".who-serve__indicator");
  var indicatorReady = false;
  var imageSwapToken = 0;
  var prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!whoServeItems.length || !whoServeImage) return;

  function moveIndicator(target) {
    if (!whoServeIndicator || !target) return;

    var offsetTop = target.offsetTop;
    var offsetLeft = target.offsetLeft;
    var height = target.offsetHeight;
    var width = target.offsetWidth;

    whoServeIndicator.style.height = height + "px";
    whoServeIndicator.style.width = width + "px";
    whoServeIndicator.style.transform = "translate(" + offsetLeft + "px," + offsetTop + "px)";

    if (!indicatorReady) {
      requestAnimationFrame(function () {
        whoServeIndicator.classList.add("is-ready");
      });
      indicatorReady = true;
    }
  }

  function setActiveItem(item) {
    for (var i = 0; i < whoServeItems.length; i++) {
      whoServeItems[i].classList.remove("is-active");
      whoServeItems[i].setAttribute("aria-pressed", "false");
    }

    item.classList.add("is-active");
    item.setAttribute("aria-pressed", "true");

    var nextSrc = item.getAttribute("data-image");
    var nextAlt = item.getAttribute("data-alt");
    if (nextSrc && nextSrc !== whoServeImage.getAttribute("src")) {
      if (prefersReducedMotion) {
        whoServeImage.src = nextSrc;
        if (nextAlt) {
          whoServeImage.alt = nextAlt;
        }
      } else {
        imageSwapToken += 1;
        var token = imageSwapToken;
        var preloader = new Image();

        function runSwipeTransition() {
          if (token !== imageSwapToken) return;

          if (whoServeImageWrap) {
            var staleGhosts = whoServeImageWrap.querySelectorAll("img.is-ghost");
            for (var g = 0; g < staleGhosts.length; g++) {
              staleGhosts[g].remove();
            }
          }

          var ghostImage = null;
          if (whoServeImageWrap) {
            ghostImage = whoServeImage.cloneNode(true);
            ghostImage.classList.add("is-ghost", "is-swipe-out");
            whoServeImageWrap.appendChild(ghostImage);
          }

          whoServeImage.classList.remove("is-swipe-in", "is-swipe-out");
          if (nextAlt) {
            whoServeImage.alt = nextAlt;
          }
          whoServeImage.src = nextSrc;
          void whoServeImage.offsetWidth;
          whoServeImage.classList.add("is-swipe-in");

          window.setTimeout(function () {
            if (token !== imageSwapToken) return;
            whoServeImage.classList.remove("is-swipe-in", "is-swipe-out");
            if (ghostImage && ghostImage.parentNode) {
              ghostImage.remove();
            }
          }, 340);
        }

        preloader.onload = runSwipeTransition;
        preloader.onerror = runSwipeTransition;
        preloader.src = nextSrc;

        if (preloader.complete && preloader.naturalWidth > 0) {
          runSwipeTransition();
        }
      }
    } else if (nextAlt) {
      whoServeImage.alt = nextAlt;
    }

    moveIndicator(item);
  }

  for (var i = 0; i < whoServeItems.length; i++) {
    (function (item) {
      item.addEventListener("click", function () {
        setActiveItem(item);
      });

      item.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActiveItem(item);
        }
      });
    })(whoServeItems[i]);
  }

  var initialActive = document.querySelector(".who-serve__item.is-active");
  if (initialActive) {
    setActiveItem(initialActive);
  }

  window.addEventListener("load", function () {
    var active = document.querySelector(".who-serve__item.is-active");
    if (active) {
      moveIndicator(active);
    }
  });

  window.addEventListener("resize", function () {
    var active = document.querySelector(".who-serve__item.is-active");
    if (active) {
      moveIndicator(active);
    }
  });
})();
