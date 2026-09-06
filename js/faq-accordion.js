(function () {
  // Smooth FAQ accordion open/close
  var items = document.querySelectorAll(".faq__item");
  if (!items.length) return;

  items.forEach(function (item) {
    var summary = item.querySelector(".faq__question");
    var answer = item.querySelector(".faq__answer");
    if (!summary || !answer) return;

    var setExpandedState = function (isOpen) {
      if (isOpen) {
        answer.classList.add("is-open");
        answer.style.height = answer.scrollHeight + "px";
      } else {
        answer.classList.remove("is-open");
        answer.style.height = "0px";
      }
    };

    // Initialize state
    setExpandedState(item.hasAttribute("open"));

    summary.addEventListener("click", function (evt) {
      evt.preventDefault();
      var isOpen = item.hasAttribute("open");

      if (isOpen) {
        var startHeight = answer.scrollHeight;
        answer.style.height = startHeight + "px";
        requestAnimationFrame(function () {
          answer.style.height = "0px";
          answer.classList.remove("is-open");
        });

        answer.addEventListener(
          "transitionend",
          function handler() {
            item.removeAttribute("open");
            answer.style.height = "";
            answer.removeEventListener("transitionend", handler);
          },
          { once: true },
        );
      } else {
        item.setAttribute("open", "");
        answer.style.height = "0px";
        requestAnimationFrame(function () {
          answer.classList.add("is-open");
          answer.style.height = answer.scrollHeight + "px";
        });

        answer.addEventListener(
          "transitionend",
          function handler() {
            answer.style.height = "";
            answer.removeEventListener("transitionend", handler);
          },
          { once: true },
        );
      }
    });
  });
})();
