// Shared behaviour for every page: a headline that always stays on one line,
// centred, shrinking to fit the space it has.
(function () {
  // The headline is only as wide as its text, so any overflow spreads evenly;
  // if the text is wider than the space available, shrink it to fit.
  function fitHeadline(h1) {
    var box = h1.parentElement;
    var style = getComputedStyle(box);
    var available = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    h1.style.fontSize = '';
    var width = h1.getBoundingClientRect().width;
    if (width > available) {
      var size = parseFloat(getComputedStyle(h1).fontSize);
      h1.style.fontSize = (size * available / width * 0.98) + 'px';
    }
  }

  var h1 = document.querySelector('.hero h1');
  if (h1) {
    var fit = function () { fitHeadline(h1); };
    fit();
    window.addEventListener('resize', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(h1.parentElement);
    if (document.fonts) document.fonts.ready.then(fit);
  }
})();
