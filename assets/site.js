// Shared behaviour for every page: the animated waves behind the page,
// and a headline that always stays on one line, centred, shrinking to fit.
(function () {
  // Each wave holds two identical stretches of sea, so sliding by half loops seamlessly
  var WAVE_PATHS = [
    'M0 20 Q 360 0 720 20 T 1440 20 T 2160 20 T 2880 20 V 200 H 0 Z',
    'M0 25 Q 360 50 720 25 T 1440 25 T 2160 25 T 2880 25 V 200 H 0 Z',
    'M0 30 Q 360 0 720 30 T 1440 30 T 2160 30 T 2880 30 V 200 H 0 Z',
    'M0 35 Q 360 70 720 35 T 1440 35 T 2160 35 T 2880 35 V 200 H 0 Z',
    'M0 45 Q 360 5 720 45 T 1440 45 T 2160 45 T 2880 45 V 200 H 0 Z',
    'M0 55 Q 360 105 720 55 T 1440 55 T 2160 55 T 2880 55 V 200 H 0 Z',
    'M0 70 Q 360 10 720 70 T 1440 70 T 2160 70 T 2880 70 V 200 H 0 Z'
  ];

  function addWaves() {
    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.setAttribute('aria-hidden', 'true');

    var waves = document.createElement('div');
    waves.className = 'waves';
    waves.setAttribute('aria-hidden', 'true');
    waves.innerHTML = WAVE_PATHS.map(function (d, i) {
      return '<div class="wave wave-' + (i + 1) + '"><svg viewBox="0 0 2880 200" preserveAspectRatio="none"><path fill="currentColor" d="' + d + '"/></svg></div>';
    }).join('');

    document.body.appendChild(scrim);
    document.body.appendChild(waves);
  }

  // The headline is only as wide as its text and centred, so any overflow spreads evenly;
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

  addWaves();

  var h1 = document.querySelector('.hero h1');
  if (h1) {
    var fit = function () { fitHeadline(h1); };
    fit();
    window.addEventListener('resize', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(h1.parentElement);
    if (document.fonts) document.fonts.ready.then(fit);
  }
})();
