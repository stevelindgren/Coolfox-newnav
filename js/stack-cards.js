// Minimal Stack Cards effect (from CodyHouse) adapted
(function() {
  function hasClass(el, className) {
    return el.classList ? el.classList.contains(className) : new RegExp('(\\s|^)' + className + '(\\s|$)').test(el.className);
  }
  function StackCards(element) {
    this.element = element;
    this.items = this.element.getElementsByClassName('js-stack-cards__item');
    this.scrollingFn = false;
    this.scrolling = false;
    this.marginY = 0;
    this.stopOffset = 0;
    this.lastItemOffset = 0;
    this.elementHeight = 0;
    this.cardTop = 0;
    this.cardHeight = 0;
    this.windowHeight = window.innerHeight;
    initStackCardsEffect(this);
    initStackCardsResize(this);
  }
  function initStackCardsEffect(element) {
    setStackCards(element);
    var observer = new IntersectionObserver(stackCardsCallback.bind(element), { threshold: [0, 1] });
    observer.observe(element.element);
  }
  function initStackCardsResize(element) {
    element.element.addEventListener('resize-stack-cards', function() {
      setStackCards(element);
      animateStackCards.bind(element);
    });
  }
  function stackCardsCallback(entries) {
    if (entries[0].isIntersecting) {
      if (this.scrollingFn) return;
      stackCardsInitEvent(this);
    } else {
      if (!this.scrollingFn) return;
      window.removeEventListener('scroll', this.scrollingFn);
      this.scrollingFn = false;
    }
  }
  function stackCardsInitEvent(element) {
    element.scrollingFn = stackCardsScrolling.bind(element);
    window.addEventListener('scroll', element.scrollingFn, { passive: true });
  }
  function stackCardsScrolling() {
    if (this.scrolling) return;
    this.scrolling = true;
    window.requestAnimationFrame(animateStackCards.bind(this));
  }
  function setStackCards(element) {
    element.marginY = getComputedStyle(element.element).getPropertyValue('--stack-cards-gap');
    element.marginY = getFloatFromCSS(element, element.marginY);
    element.stopOffset = getComputedStyle(element.element).getPropertyValue('--stack-cards-stop-offset');
    element.stopOffset = getFloatFromCSS(element, element.stopOffset);
    element.lastItemOffset = getComputedStyle(element.element).getPropertyValue('--stack-cards-last-offset');
    element.lastItemOffset = getFloatFromCSS(element, element.lastItemOffset);
    if (isNaN(element.stopOffset)) {
      element.stopOffset = 0;
    }
    if (isNaN(element.lastItemOffset)) {
      element.lastItemOffset = 0;
    }
    element.elementHeight = element.element.offsetHeight;
    var cardStyle = getComputedStyle(element.items[0]);
    element.cardTop = parseFloat(cardStyle.getPropertyValue('top'));
    // Preserve sub-pixel measurements so offsets don't accumulate visible drift
    // by the time the last card reaches the top of the stack.
    element.cardHeight = 0;
    for (var j = 0; j < element.items.length; j++) {
      element.cardHeight = Math.max(element.cardHeight, element.items[j].getBoundingClientRect().height);
    }
    if (!element.cardHeight) {
      element.cardHeight = parseFloat(cardStyle.getPropertyValue('height'));
    }
    element.windowHeight = window.innerHeight;
    if (isNaN(element.marginY)) {
      element.element.style.paddingBottom = '0px';
    } else {
      element.element.style.paddingBottom = (element.marginY * (element.items.length - 1)) + 'px';
    }
    for (var i = 0; i < element.items.length; i++) {
      var itemOffset = i == element.items.length - 1 ? element.lastItemOffset : 0;
      if (isNaN(element.marginY)) {
        element.items[i].style.transform = 'none';
      } else {
        element.items[i].style.transform = 'translateY(' + (element.marginY * i + itemOffset) + 'px)';
      }
    }
  }
  function getFloatFromCSS(element, value) {
    var node = document.createElement('div');
    node.setAttribute('style', 'opacity:0; visibility:hidden; position:absolute; height:' + value);
    element.element.appendChild(node);
    var floatVal = parseFloat(getComputedStyle(node).getPropertyValue('height'));
    element.element.removeChild(node);
    return floatVal;
  }
  function animateStackCards() {
    if (isNaN(this.marginY)) {
      this.scrolling = false;
      return;
    }
    var top = this.element.getBoundingClientRect().top;
    if (this.cardTop - top + this.windowHeight - this.elementHeight - this.cardHeight + this.marginY + this.marginY * this.items.length + this.stopOffset > 0) {
      this.scrolling = false;
      return;
    }
    for (var i = 0; i < this.items.length; i++) {
      var itemOffset = i == this.items.length - 1 ? this.lastItemOffset : 0;
      var translateY = this.marginY * i + itemOffset;
      var scrolling = this.cardTop - top - i * (this.cardHeight + this.marginY);
      if (scrolling > 0) {
        var scaling = i == this.items.length - 1 ? 1 : (this.cardHeight - scrolling * 0.05) / this.cardHeight;
        this.items[i].style.transform = 'translateY(' + translateY + 'px) scale(' + scaling + ')';
      } else {
        this.items[i].style.transform = 'translateY(' + translateY + 'px)';
      }
    }
    this.scrolling = false;
  }
  var stackCards = document.getElementsByClassName('js-stack-cards');
  var supported = ('IntersectionObserver' in window && 'IntersectionObserverEntry' in window && 'intersectionRatio' in window.IntersectionObserverEntry.prototype);
  if (stackCards.length > 0 && supported) {
    var stackCardsArray = [];
    for (var i = 0; i < stackCards.length; i++) {
      stackCardsArray.push(new StackCards(stackCards[i]));
    }
    var resizingId = false;
    var customEvent = new CustomEvent('resize-stack-cards');
    window.addEventListener('resize', function() {
      clearTimeout(resizingId);
      resizingId = setTimeout(function() {
        for (var i = 0; i < stackCardsArray.length; i++) {
          stackCardsArray[i].element.dispatchEvent(customEvent);
        }
      }, 500);
    });
  }
})();
