(function () {
  var carousels = document.querySelectorAll("[data-gallery-carousel]");
  if (!carousels.length) return;

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setTrackPosition(track, x, animate, onComplete) {
    if (window.gsap) {
      var vars = {
        x: x,
        duration: prefersReducedMotion ? 0 : animate ? 0.75 : 0,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: onComplete || null,
      };

      if (prefersReducedMotion || !animate) {
        window.gsap.set(track, vars);
        if (onComplete) onComplete();
      } else {
        window.gsap.to(track, vars);
      }

      return;
    }

    track.style.transform = "translate3d(" + x + "px, 0, 0)";
    if (onComplete) onComplete();
  }

  function setSlideState(slide, state, animate) {
    if (window.gsap) {
      var vars = {
        scale: state.scale,
        opacity: state.opacity,
        zIndex: state.zIndex,
        duration: prefersReducedMotion ? 0 : animate ? 0.75 : 0,
        ease: "power3.inOut",
        overwrite: true,
      };

      if (prefersReducedMotion || !animate) {
        window.gsap.set(slide, vars);
      } else {
        window.gsap.to(slide, vars);
      }

      return;
    }

    slide.style.transform = "scale(" + state.scale + ")";
    slide.style.opacity = String(state.opacity);
    slide.style.zIndex = String(state.zIndex);
  }

  function getScale(distance, isMobile) {
    if (isMobile) {
      if (distance >= 1) return { scale: 0.96, opacity: 0 };
      return { scale: 1, opacity: 1 };
    }

    if (distance === 1) return { scale: 0.8, opacity: 0.58 };
    if (distance === 2) return { scale: 0.66, opacity: 0.3 };
    if (distance >= 3) return { scale: 0.54, opacity: 0.14 };
    return { scale: 1, opacity: 1 };
  }

  function initCarousel(root) {
    var viewport = root.querySelector(".ford-gallery-carousel__viewport");
    var track = root.querySelector(".ford-gallery-carousel__track");
    var prevButton = root.querySelector("[data-gallery-prev]");
    var nextButton = root.querySelector("[data-gallery-next]");
    var pointerId = null;
    var dragStartX = 0;
    var dragOffset = 0;
    var hasDragged = false;
    var isAnimating = false;
    var resizeFrame = null;
    var activeSlot = 0;

    if (!viewport || !track) return;

    function getSlides() {
      return Array.prototype.slice.call(track.querySelectorAll("[data-gallery-slide]"));
    }

    function getActiveSlot() {
      var count = getSlides().length;
      if (count <= 1) return 0;
      if (count <= 4) return Math.max(1, Math.floor(count / 2) - 1);
      return 2;
    }

    function getTrackX(slot, offset) {
      var slides = getSlides();
      var slide = slides[slot];

      if (!slide) return offset || 0;

      var slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      var viewportCenter = viewport.clientWidth / 2;

      return viewportCenter - slideCenter + (offset || 0);
    }

    function applySlides(animate, highlightedSlot) {
      var slides = getSlides();
      var slot = typeof highlightedSlot === "number" ? highlightedSlot : activeSlot;
      var isMobile = window.matchMedia("(max-width: 575.98px)").matches;

      slides.forEach(function (slide, index) {
        var visual = getScale(Math.abs(index - slot), isMobile);

        slide.classList.toggle("is-active", index === slot);
        slide.setAttribute("aria-hidden", index === slot ? "false" : "true");
        slide.setAttribute("aria-current", index === slot ? "true" : "false");
        slide.tabIndex = index === slot ? 0 : -1;

        setSlideState(
          slide,
          {
            scale: visual.scale,
            opacity: visual.opacity,
            zIndex: 100 - Math.abs(index - slot),
          },
          animate,
        );
      });
    }

    function render(animate, offset, slotOverride) {
      var slot = typeof slotOverride === "number" ? slotOverride : activeSlot;
      setTrackPosition(track, getTrackX(slot, offset), animate);
      applySlides(animate, slot);
    }

    function rotateTrack(direction) {
      if (direction > 0) {
        track.appendChild(track.firstElementChild);
      } else {
        track.insertBefore(track.lastElementChild, track.firstElementChild);
      }
    }

    function jumpToSlot(targetSlot) {
      var slides = getSlides();
      var maxIndex = slides.length - 1;
      var slot = Math.max(0, Math.min(maxIndex, targetSlot));

      while (slot > activeSlot) {
        rotateTrack(1);
        slot -= 1;
      }

      while (slot < activeSlot) {
        rotateTrack(-1);
        slot += 1;
      }

      render(false, 0);
    }

    function animateStep(direction) {
      var slides = getSlides();
      var targetSlot = activeSlot + direction;
      var targetX;

      if (isAnimating || !slides.length) return;
      if (targetSlot < 0 || targetSlot >= slides.length) return;

      isAnimating = true;
      targetX = getTrackX(targetSlot, 0);

      applySlides(true, targetSlot);

      setTrackPosition(track, targetX, true, function () {
        rotateTrack(direction);
        render(false, 0);
        isAnimating = false;
      });
    }

    function step(direction) {
      if (direction > 0) {
        animateStep(1);
      } else {
        animateStep(-1);
      }
    }

    function endDrag(clientX) {
      if (pointerId === null) return;

      var totalDelta = clientX - dragStartX;

      viewport.classList.remove("is-dragging");
      pointerId = null;
      dragOffset = 0;

      if (Math.abs(totalDelta) > 70) {
        step(totalDelta > 0 ? -1 : 1);
      } else {
        render(true, 0);
      }

      window.setTimeout(function () {
        hasDragged = false;
      }, 0);
    }

    activeSlot = getActiveSlot();

    for (var i = 0; i < activeSlot; i += 1) {
      rotateTrack(-1);
    }

    track.addEventListener("click", function (event) {
      var slide = event.target.closest("[data-gallery-slide]");
      var slides;
      var index;

      if (!slide || hasDragged || isAnimating) return;

      slides = getSlides();
      index = slides.indexOf(slide);

      if (index === activeSlot) return;
      if (index === activeSlot + 1) {
        step(1);
        return;
      }
      if (index === activeSlot - 1) {
        step(-1);
        return;
      }

      jumpToSlot(index);
    });

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        if (!isAnimating) step(-1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        if (!isAnimating) step(1);
      });
    }

    viewport.addEventListener("keydown", function (event) {
      if (isAnimating) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    });

    viewport.addEventListener("pointerdown", function (event) {
      if (isAnimating) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      pointerId = event.pointerId;
      dragStartX = event.clientX;
      dragOffset = 0;
      hasDragged = false;

      viewport.classList.add("is-dragging");

      if (viewport.setPointerCapture) {
        viewport.setPointerCapture(event.pointerId);
      }
    });

    viewport.addEventListener("pointermove", function (event) {
      if (pointerId !== event.pointerId || isAnimating) return;

      dragOffset = event.clientX - dragStartX;

      if (Math.abs(dragOffset) > 8) {
        hasDragged = true;
      }

      setTrackPosition(track, getTrackX(activeSlot, dragOffset), false);
    });

    viewport.addEventListener("pointerup", function (event) {
      if (pointerId !== event.pointerId) return;
      endDrag(event.clientX);
    });

    viewport.addEventListener("pointercancel", function (event) {
      if (pointerId !== event.pointerId) return;
      endDrag(dragStartX);
    });

    window.addEventListener("resize", function () {
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = window.requestAnimationFrame(function () {
        activeSlot = getActiveSlot();
        render(false, 0);
      });
    });

    render(false, 0);
  }

  Array.prototype.forEach.call(carousels, initCarousel);
})();
