(function () {
  try {
    var fadeTargets = document.querySelectorAll(".js-fade-in");
    if (!fadeTargets.length) return;

    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var observerSupported = "IntersectionObserver" in window;

    if (reducedMotion || !observerSupported) {
      for (var i = 0; i < fadeTargets.length; i++) {
        fadeTargets[i].classList.add("is-visible");
      }
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            window.setTimeout(function () {
              entry.target.classList.add("is-visible");
              obs.unobserve(entry.target);
            }, 120);
          }
        });
      },
      { threshold: 0.28, rootMargin: "0px 0px -6% 0px" },
    );

    for (var i = 0; i < fadeTargets.length; i++) {
      observer.observe(fadeTargets[i]);
    }
  } catch (err) {
    // If the fade setup fails, reveal the content instead of leaving it hidden.
    document.documentElement.classList.remove("js-fade-ready");
  }
})();
