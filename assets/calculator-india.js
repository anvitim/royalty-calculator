/* =====================================================================
   India calculator — page code for /india/.

   The maths is calculate() in /assets/calculator.js, and every number
   comes from the India rules block in /markets/india.js. This file only
   reads the page's settings, calls calculate() and draws the results
   (rupees in lakh-and-crore style, one route: self-released).
   ===================================================================== */
(function () {
  var M = window.MARKET;
  var RULES = M.rules;
  var r = function (key) { return RULES[key].value; };
  var C = window.RoyaltyCalculator;
  var calculate = C.calculate, tag = C.tag, esc = C.esc;
  var el = function (id) { return document.getElementById(id); };
  if (!el('in-streams')) return;

  var SYMBOL = M.currency.symbol, LOCALE = M.currency.locale;

  /* ---------- Formatting (Indian style) ---------- */
  function money(x) {
    var abs = Math.abs(x);
    var digits = abs < 100000 ? 2 : 0;
    var text = SYMBOL + abs.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return (x < -0.005 ? '−' : '') + text;
  }

  function trim(n, dp) { return +n.toFixed(dp); }

  // In sentences: "about ₹9,988", "about ₹1.2 lakh", "about ₹2.5 crore"
  function wholeMoney(x) {
    var abs = Math.abs(x);
    if (abs >= 1e7) return SYMBOL + trim(abs / 1e7, 2) + ' crore';
    if (abs >= 1e5) return SYMBOL + trim(abs / 1e5, 2) + ' lakh';
    return SYMBOL + Math.round(abs).toLocaleString(LOCALE);
  }

  function pct(x) { return +(x * 100).toFixed(1) + '%'; }
  function rulePct(key) { return pct(r(key)); }
  function share(part, whole) { return whole > 0 ? (part / whole * 100).toFixed(1) + '%' : '0%'; }
  function valueText(v) { return SYMBOL + v.toFixed(3); }

  // "10 lakh (1 million) streams", "1.59 lakh (159,000) streams", "10,000 streams"
  function streamsBoth(n) {
    if (!isFinite(n)) return 'never';
    if (n <= 0) return 'from the first stream';
    if (n < 1e5) return Math.ceil(n).toLocaleString(LOCALE) + ' streams';
    var indian = n >= 1e7 ? trim(n / 1e7, 2) + ' crore' : trim(n / 1e5, 2) + ' lakh';
    var western = n >= 1e6 ? trim(n / 1e6, 2) + ' million' : (Math.round(n / 1000) * 1000).toLocaleString('en-US');
    return indian + ' (' + western + ') streams';
  }

  /* ---------- Settings ---------- */
  function readInputs() {
    return {
      deal: 'self',
      streams: Math.max(0, Math.floor(Number(el('in-streams').value) || 0)),
      streamValue: Number(el('in-value').value),
      releaseCosts: Math.max(0, Math.floor(Number(el('in-costs').value) || 0)),
      distributor: document.querySelector('input[name="in-distributor"]:checked').value,
      songwritingCollected: document.querySelector('input[name="in-iprs"]:checked').value === 'yes'
    };
  }

  // Vani's settings: the rules' worked example (10 lakh streams, TuneCore single, IPRS joined)
  var VANI = { streams: 1000000, value: r('streamValueDefault'), distributor: 'tunecore-single', iprs: 'yes' };

  function setUp() {
    el('in-distributor-choices').innerHTML = M.distributors.map(function (d, i) {
      return '<label class="choice"><input type="radio" name="in-distributor" value="' + d.id + '"' + (i === 0 ? ' checked' : '') + '><span>' + d.name + '</span></label>';
    }).join('');
    el('in-value').value = r('streamValueDefault');
    el('in-costs').value = r('releaseCosts');
    el('in-costs-tag').innerHTML = tag('releaseCosts');
    el('in-value-tag').innerHTML = tag('streamValueDefault');
    el('in-iprs-help').innerHTML = 'IPRS pays the songwriting money, and only to <span class="nobreak">members.' + tag('iprsPays') + '</span> You also have to register each <span class="nobreak">song.' + tag('iprsRegisterSongs') + '</span>';
    el('in-value-range').innerHTML = 'Typical ' + valueText(r('streamValueDefault')) + ', range ' + valueText(r('streamValueLow')) + '–' + valueText(r('streamValueHigh'));
    el('in-not-covered').textContent = M.notCovered;

    el('in-streams').addEventListener('input', render);
    el('in-costs').addEventListener('input', render);
    el('in-value').addEventListener('input', render);
    document.querySelectorAll('input[name="in-distributor"], input[name="in-iprs"]').forEach(function (input) {
      input.addEventListener('change', render);
    });
    el('in-load-vani').addEventListener('click', function () {
      el('in-streams').value = VANI.streams;
      el('in-value').value = VANI.value;
      el('in-costs').value = 0;
      document.querySelector('input[name="in-distributor"][value="' + VANI.distributor + '"]').checked = true;
      document.querySelector('input[name="in-iprs"][value="' + VANI.iprs + '"]').checked = true;
      render();
      C.paintSliders();
      el('inputs-title').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }

  function render() {
    var inp = readInputs();
    var res = calculate(inp);
    var distributor = res.distributor;

    el('in-streams-words').textContent = '= ' + streamsBoth(inp.streams);
    el('in-value-out').textContent = valueText(inp.streamValue);

    // Under the Spotify threshold
    var note = el('in-threshold-note');
    note.hidden = inp.streams >= r('spotifyMinStreams');
    if (!note.hidden) {
      note.innerHTML = 'Under ' + r('spotifyMinStreams').toLocaleString(LOCALE) + ' streams in 12 months, Spotify pays nothing for a track\'s recording' + tag('spotifyMinStreams') +
        '. The figures below don\'t remove this, because they also cover other services and the songwriting money, which this rule doesn\'t affect.';
    }

    renderBreakdown(inp, res);
    renderFixed(inp, res, distributor);
    renderResults(inp, res, distributor);
    renderCompare(inp);
    renderSummary(inp, res);
    renderPersona();
  }

  function renderBreakdown(inp, res) {
    el('in-gross-line').textContent = streamsBoth(inp.streams) + ' × ' + valueText(inp.streamValue) + ' = ' + money(res.gross) + ' of streaming income in total.';

    var iprs = res.societies[0];
    var segments = [
      { name: 'Streaming service', amount: res.service, color: 'var(--c-service)',
        detail: 'Keeps about one-third (' + rulePct('serviceShare') + ')' + tag('serviceShare') + ' of all income' },
      { name: 'Distributor (' + res.distributor.name + ')', amount: res.distributorCut, color: 'var(--c-distributor)',
        detail: 'Takes ' + rulePct(res.distributor.cutKey) + tag(res.distributor.cutKey) + ' of the recording money' },
      { name: iprs.society.costName, amount: iprs.cost, color: 'var(--c-prs)',
        detail: rulePct(iprs.society.costKey) + tag(iprs.society.costKey) + ' of the songwriting money (' + rulePct('songwritingShare') + tag('songwritingShare') + ' of all income)' }
    ];
    if (res.songwritingNotCollected > 0.005) {
      segments.push({ name: 'Songwriting money held by IPRS', amount: res.songwritingNotCollected, color: 'var(--c-cowriters)',
        detail: 'Not paid to you, because you haven\'t joined IPRS and registered your songs. IPRS holds it for up to ' + r('iprsHoldYears') + ' years' + tag('iprsHoldYears') });
    }
    var recordingLine = money(res.artistRecording) + ' from the recording (' + rulePct('recordingShare') + tag('recordingShare') + ', minus distributor)';
    var songLine = inp.songwritingCollected
      ? money(res.artistSongwriting) + ' from the songwriting (' + rulePct('songwritingShare') + tag('songwritingShare') + ', minus IPRS costs)'
      : money(0) + ' from the songwriting (not joined)';
    segments.push({ name: 'You keep', amount: res.artist, color: 'var(--c-artist)', detail: recordingLine + '<br>' + songLine });

    var bar = el('in-bar');
    bar.innerHTML = segments.map(function (s) {
      return '<div style="width:' + (res.gross > 0 ? s.amount / res.gross * 100 : 0) + '%;background:' + s.color + '" title="' + esc(s.name + ': ' + money(s.amount)) + '"></div>';
    }).join('');
    bar.setAttribute('aria-label', segments.map(function (s) { return s.name + ' ' + share(s.amount, res.gross); }).join(', '));

    el('in-rows').innerHTML = segments.map(function (s) {
      return '<li><span class="swatch" style="background:' + s.color + '"></span>' +
        '<span class="row-label">' + s.name + '<span class="row-detail">' + s.detail + '</span></span>' +
        '<span class="amount">' + money(s.amount) + '<span class="share">' + share(s.amount, res.gross) + '</span></span></li>';
    }).join('') +
      '<li class="total"><span></span><span class="row-label">Total streaming income</span><span class="amount">' + money(res.gross) + '</span></li>';
  }

  function laterText(res, distributor) {
    if (distributor.feeLaterIfRenews) {
      return 'Each later year: ' + money(res.fixedLater) + ' if the single is a one-off price, or ' + money(distributor.feeLaterIfRenews()) + ' if it renews each year' + tag('singleOneOff') + '.';
    }
    return 'Each later year: ' + money(res.fixedLater) + '.';
  }

  function renderFixed(inp, res, distributor) {
    var fixed = [Object.assign({ amount: res.distributorYear1 }, distributor.feeRow(tag, money))];
    var rows = fixed.map(function (f) {
      return '<li><span></span><span class="row-label">' + f.name + '<span class="row-detail">' + f.detail + '</span></span>' +
        '<span class="amount">' + money(f.amount) + '<span class="share">' + f.when + '</span></span></li>';
    }).join('');
    if (inp.songwritingCollected) {
      rows += '<li><span></span><span class="row-label">IPRS joining fee<span class="row-detail">Not included for now' + tag('iprsJoiningFee') + '</span></span>' +
        '<span class="amount">Not included<span class="share">Year 1 only</span></span></li>';
    }
    el('in-fixed-rows').innerHTML = rows +
      '<li class="total"><span></span><span class="row-label">Year 1 total<span class="row-detail">' + laterText(res, distributor) + '</span></span><span class="amount">' + money(res.fixedYear1) + '</span></li>';
  }

  function setResult(id, amount, sub) {
    var box = el(id);
    box.classList.toggle('is-loss', amount < 0);
    box.classList.toggle('is-gain', amount >= 0);
    el(id + '-amount').textContent = amount < 0 ? 'Loss of ' + money(-amount) : money(amount);
    el(id + '-sub').textContent = sub;
  }

  function renderResults(inp, res, distributor) {
    el('in-result-hint').textContent = 'Your earnings, minus fixed costs and the release costs you paid.';
    setResult('in-year1', res.year1, money(res.artist) + ' earned − ' + money(res.fixedYear1) + ' fixed costs − ' + money(res.releaseCostsPaid) + ' release costs');
    var later = money(res.artist) + ' earned − ' + money(res.fixedLater) + ' fixed costs';
    if (distributor.feeLaterIfRenews) {
      later += '. If the single renews each year: ' + money(res.artist - distributor.feeLaterIfRenews());
    }
    setResult('in-later', res.later, later);

    var held = el('in-held-message');
    held.hidden = !(res.songwritingNotCollected > 0.005);
    if (!held.hidden) {
      held.innerHTML = '<strong>' + money(res.songwritingNotCollected) + ' of songwriting money isn\'t paid to you.</strong> IPRS pays only its members and holds a non-member\'s share for up to ' +
        r('iprsHoldYears') + ' years' + tag('iprsHoldYears') + '. If you join and register your songs in time, it is paid; otherwise it goes back into the pool.';
    }

    var loss = el('in-loss-message');
    loss.hidden = res.year1 >= 0;
    if (!loss.hidden) {
      loss.innerHTML = 'In year 1 you <strong>lose ' + money(-res.year1) + '</strong>: your costs (' + money(res.fixedYear1 + res.releaseCostsPaid) + (res.releaseCostsPaid > 0 ? ', including the ' + money(res.releaseCostsPaid) + ' release' : '') + ') are more than the ' + money(res.artist) + ' you earned.';
    }
  }

  function renderCompare(inp) {
    var withIprs = calculate(Object.assign({}, inp, { songwritingCollected: true }));
    var without = calculate(Object.assign({}, inp, { songwritingCollected: false }));
    var signClass = function (res) { return res.year1 < 0 ? 'neg' : 'pos'; };
    var laterClass = function (res) { return res.later < 0 ? 'neg' : 'pos'; };
    var rows = [
      ['Recording money paid to you', function (x) { return money(x.artistRecording); }],
      ['Songwriting money paid to you', function (x) { return money(x.artistSongwriting); }],
      ['Songwriting money IPRS holds for up to ' + r('iprsHoldYears') + ' years', function (x) { return money(x.songwritingNotCollected || 0); }],
      ['Fixed costs', function (x) { return '−' + money(x.fixedYear1); }],
      ['Release costs you paid', function (x) { return x.releaseCostsPaid > 0 ? '−' + money(x.releaseCostsPaid) : money(0); }],
      ['Year 1 total', function (x) { return money(x.year1); }, signClass, 'key'],
      ['Each later year', function (x) { return money(x.later); }, laterClass]
    ];
    var cell = function (fn, cls, x, isCurrent) {
      return '<td class="' + (isCurrent ? 'is-current ' : '') + (cls ? cls(x) : '') + '">' + fn(x) + '</td>';
    };
    el('in-compare').innerHTML =
      '<thead><tr><th scope="col"></th>' +
        '<th scope="col" class="' + (inp.songwritingCollected ? 'is-current' : '') + '">Joined and registered</th>' +
        '<th scope="col" class="' + (inp.songwritingCollected ? '' : 'is-current') + '">Not joined</th></tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr class="' + (row[3] || '') + '"><th scope="row">' + row[0] + '</th>' +
          cell(row[1], row[2], withIprs, inp.songwritingCollected) + cell(row[1], row[2], without, !inp.songwritingCollected) + '</tr>';
      }).join('') + '</tbody>';
  }

  /* ---------- Summary: fixed sentence templates filled with the calculator's own numbers.
     They describe the results; they never recommend anything. ---------- */
  function outcome(year1) {
    if (year1 <= -0.5) return 'about ' + wholeMoney(year1) + ' out of pocket';
    if (year1 >= 0.5) return 'about ' + wholeMoney(year1) + ' ahead';
    return 'roughly even';
  }

  function breakEven(n) {
    if (!isFinite(n)) return 'You wouldn\'t break even with these settings.';
    if (n <= 0) return 'You\'d be ahead from the first stream.';
    return 'You\'d break even at about ' + streamsBoth(n) + ' a year.';
  }

  function releaseText(inp) { return inp.releaseCosts > 0 ? ' and ' + wholeMoney(inp.releaseCosts) + ' of release costs' : ''; }

  function summaryLines(inp, res) {
    var lines = [];
    var other = calculate(Object.assign({}, inp, { songwritingCollected: !inp.songwritingCollected }));
    var low = calculate(Object.assign({}, inp, { streamValue: r('streamValueLow') }));
    var high = calculate(Object.assign({}, inp, { streamValue: r('streamValueHigh') }));
    var distributor = res.distributor;

    if (inp.songwritingCollected) {
      lines.push('At ' + streamsBoth(inp.streams) + ' a year, with IPRS joined and your songs registered, you\'d receive about ' + wholeMoney(res.artist) +
        ' from your streams and finish year 1 ' + outcome(res.year1) + ' after ' + wholeMoney(res.fixedYear1) + ' of fixed costs' + releaseText(inp) + '.');
    } else {
      lines.push('At ' + streamsBoth(inp.streams) + ' a year, without joining IPRS, you\'d receive about ' + wholeMoney(res.artist) +
        ' from your streams and finish year 1 ' + outcome(res.year1) + ' after ' + wholeMoney(res.fixedYear1) + ' of fixed costs' + releaseText(inp) + '.');
    }
    lines.push(breakEven(res.breakEvenStreams));
    if (inp.songwritingCollected) {
      lines.push('Without joining IPRS and registering your songs, you\'d receive about ' + wholeMoney(other.artist) + ', and the ' + wholeMoney(other.songwritingNotCollected) +
        ' of songwriting money would stay with IPRS, which holds it for up to ' + r('iprsHoldYears') + ' years.');
    } else {
      lines.push('If you joined IPRS and registered your songs, you\'d receive about ' + wholeMoney(other.artist) + ', ' + wholeMoney(other.artist - res.artist) + ' more.');
    }
    lines.push('The value of one stream is the least certain number. At the low end of its range (' + valueText(r('streamValueLow')) + ') year 1 would be ' + outcome(low.year1) +
      ', and at the high end (' + valueText(r('streamValueHigh')) + ') ' + outcome(high.year1) + '.');
    if (distributor.feeLaterIfRenews) {
      lines.push('In later years you\'d receive about ' + wholeMoney(res.artist) + ' with no further fee if the single is a one-off price, or end up ' +
        outcome(res.artist - distributor.feeLaterIfRenews()) + ' if it renews each year.');
    } else {
      lines.push('In each later year you\'d finish ' + outcome(res.later) + '.');
    }
    return lines;
  }

  function renderSummary(inp, res) {
    var lines = summaryLines(inp, res);
    el('in-summary-text').innerHTML =
      '<p class="summary-verdict">' + esc(lines[0]) + '</p>' + lines.slice(1).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
  }

  /* ---------- The illustration: Vani, from the rules' worked example ---------- */
  function renderPersona() {
    var base = { deal: 'self', streams: VANI.streams, streamValue: VANI.value, releaseCosts: 0, distributor: VANI.distributor, songwritingCollected: true };
    var res = calculate(base);
    var without = calculate(Object.assign({}, base, { songwritingCollected: false }));
    var d = res.distributor;
    el('in-persona').innerHTML =
      '<p>Vani is fictional, and isn\'t based on any real artist. She writes and releases her own non-film songs herself through ' + d.name.replace(', one single', ' as a single') +
      '. She has joined IPRS and registered her songs. In one year her songs are streamed ' + streamsBoth(VANI.streams) + ', at ' + valueText(VANI.value) + ' a stream' + tag('streamValueDefault') + '.</p>' +
      '<p>She receives about ' + wholeMoney(res.artist) + ' from those streams. After the ' + money(res.fixedYear1) + ' fee, she finishes the year ' + outcome(res.year1) + '. ' +
      'Had she not joined IPRS and registered her songs, she\'d receive about ' + wholeMoney(without.artist) + ', and IPRS would hold ' + wholeMoney(without.songwritingNotCollected) + ' of songwriting money for up to ' + r('iprsHoldYears') + ' years.</p>';
  }

  setUp();
  render();
  C.paintSliders();
})();
