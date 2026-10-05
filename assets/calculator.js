/* =====================================================================
   Royalty calculator — shared maths and page code for every market.

   It reads the market's rules and settings from window.MARKET, which is
   set by a market file such as /markets/uk.js. Nothing in this file is
   specific to one country: numbers, organisations and currency all come
   from the market file.

   To add a deal (for example a major-label deal): add its branch in
   calculate(), an entry in DEALS with its summary template, its id in
   DEAL_ORDER, a radio button in the page's "Deal type" choice, and any
   settings it needs. The comparison table and summary pick it up.
   ===================================================================== */
(function () {
  var M = window.MARKET;
  var RULES = M.rules;
  var r = function (key) { return RULES[key].value; };

  function findDistributor(id) {
    return M.distributors.filter(function (d) { return d.id === id; })[0] || M.distributors[0];
  }

  /* ---------- The maths (no page code, so it can be tested on its own) ----------
     inputs: { deal: 'self' | 'royalty' | 'profit', streams, streamValue (e.g. pence),
               releaseCosts, distributor, labelFee, royaltyRate, profitSplit, advance } */
  function calculate(inputs) {
    var deal = inputs.deal;
    var gross = inputs.streams * inputs.streamValue / M.streamValue.perUnit;

    var service = gross * r('serviceShare');
    var recording = gross * r('recordingShare');
    var songwriting = gross * r('songwritingShare');

    // Songwriting money is shared between the market's collecting societies, each taking its costs
    var assigned = 0;
    var societies = M.societies.map(function (s) {
      var shareOfSongwriting = s.shareKey ? r(s.shareKey) : null;
      if (shareOfSongwriting !== null) assigned += shareOfSongwriting;
      return { society: s, share: shareOfSongwriting };
    });
    var keptShareOfSongwriting = 0;
    societies.forEach(function (item) {
      if (item.share === null) item.share = 1 - assigned;
      item.money = songwriting * item.share;
      item.cost = item.money * r(item.society.costKey);
      keptShareOfSongwriting += item.share * (1 - r(item.society.costKey));
    });
    var societyCosts = societies.reduce(function (sum, item) { return sum + item.cost; }, 0);
    var artistSongwriting = songwriting - societyCosts;
    var joiningFees = M.societies.reduce(function (sum, s) { return sum + r(s.joinKey); }, 0);

    var res = {
      deal: deal, gross: gross, service: service, recording: recording, songwriting: songwriting,
      societies: societies, societyCosts: societyCosts, artistSongwriting: artistSongwriting, joiningFees: joiningFees
    };

    if (deal === 'self') {
      var distributor = findDistributor(inputs.distributor);
      var cut = r(distributor.cutKey);
      res.distributor = distributor;
      res.distributorCut = recording * cut;
      res.artistRecording = recording - res.distributorCut;
      res.artist = res.artistRecording + artistSongwriting;
      res.distributorYear1 = distributor.feeYear1();
      res.distributorLater = distributor.feeLater();
      res.fixedYear1 = res.distributorYear1 + joiningFees;
      res.fixedLater = res.distributorLater;
      res.releaseCostsPaid = inputs.releaseCosts;
      res.advance = 0;
      res.owed = 0;
      res.year1 = res.artist - res.fixedYear1 - inputs.releaseCosts;
      res.later = res.artist - res.fixedLater;
      // Streams before everything kept (recording + songwriting) covers the release costs and year-1 fixed costs
      var keptPerStream = inputs.streamValue / M.streamValue.perUnit * (
        r('recordingShare') * (1 - cut) + r('songwritingShare') * keptShareOfSongwriting);
      var spent = inputs.releaseCosts + res.fixedYear1;
      res.breakEvenStreams = spent > 0 ? (keptPerStream > 0 ? spent / keptPerStream : Infinity) : 0;
      res.labelReceivedAtBreakEven = null;
      return res;
    }

    // Label deals
    var debt = inputs.releaseCosts + inputs.advance;
    res.labelDistributorCut = recording * inputs.labelFee;
    res.labelReceipts = recording - res.labelDistributorCut;
    var perStreamReceipts = inputs.streamValue / M.streamValue.perUnit * r('recordingShare') * (1 - inputs.labelFee);

    var recouped;
    if (deal === 'royalty') {
      var royaltyShare = res.labelReceipts * inputs.royaltyRate;
      recouped = Math.min(royaltyShare, debt);
      res.artistRecording = royaltyShare - recouped;
      var perStreamToDebt = perStreamReceipts * inputs.royaltyRate;
      res.breakEvenStreams = debt > 0 ? (perStreamToDebt > 0 ? debt / perStreamToDebt : Infinity) : 0;
      res.labelReceivedAtBreakEven = debt > 0 ? (inputs.royaltyRate > 0 ? debt / inputs.royaltyRate : Infinity) : 0;
    } else {
      recouped = Math.min(res.labelReceipts, debt);
      res.artistRecording = (res.labelReceipts - recouped) * inputs.profitSplit;
      res.breakEvenStreams = debt > 0 ? (perStreamReceipts > 0 ? debt / perStreamReceipts : Infinity) : 0;
      res.labelReceivedAtBreakEven = debt;
    }

    res.debt = debt;
    res.recouped = recouped;
    res.owed = debt - recouped;
    res.labelKeeps = res.labelReceipts - res.artistRecording;
    res.artist = res.artistRecording + artistSongwriting;
    res.advance = inputs.advance;
    res.releaseCostsPaid = 0;
    res.fixedYear1 = joiningFees;
    res.fixedLater = 0;
    res.year1 = res.artist + inputs.advance - joiningFees;
    return res;
  }

  // Smallest number of streams a year at which year 1 stops being a loss (works for any deal)
  function streamsUntilAhead(inp, deal) {
    var year1 = function (n) { return calculate(Object.assign({}, inp, { deal: deal, streams: n })).year1; };
    if (year1(0) >= 0) return 0;
    var hi = 1e6;
    while (year1(hi) < 0) { hi *= 4; if (hi > 1e12) return Infinity; }
    var lo = 0;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (year1(mid) >= 0) hi = mid; else lo = mid;
    }
    return hi;
  }

  /* ---------- Formatting ---------- */
  var SYMBOL = M.currency.symbol, LOCALE = M.currency.locale;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function tag(key) {
    var rule = RULES[key];
    var cls = rule.label === 'FACT' ? 'fact' : 'assumption';
    var title = esc(rule.label + ': ' + rule.note);
    if (rule.source) {
      return '<a class="tag ' + cls + '" href="' + rule.source + '" target="_blank" rel="noopener" title="' + title + '">' + rule.label + '</a>';
    }
    return '<span class="tag ' + cls + '" tabindex="0" title="' + title + '">' + rule.label + '</span>';
  }

  function pct(x) { return +(x * 100).toFixed(1) + '%'; }
  function rulePct(key) { return pct(r(key)); }

  function money(x) {
    var abs = Math.abs(x);
    var digits = abs < 1000 ? 2 : 0;
    var text = SYMBOL + abs.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return (x < -0.005 ? '−' : '') + text;
  }

  function wholeMoney(x) { return SYMBOL + Math.round(Math.abs(x)).toLocaleString(LOCALE); }

  function share(part, whole) {
    return whole > 0 ? (part / whole * 100).toFixed(1) + '%' : '0%';
  }

  function streamsText(n) {
    if (!isFinite(n)) return 'never';
    if (n <= 0) return 'from the first stream';
    if (n >= 1e6) return 'about ' + (n / 1e6).toFixed(1) + ' million streams';
    if (n >= 10000) return 'about ' + (Math.round(n / 1000) * 1000).toLocaleString(LOCALE) + ' streams';
    return 'about ' + Math.ceil(n).toLocaleString(LOCALE) + ' streams';
  }

  function valueText(v) { return v.toFixed(2) + M.streamValue.unit; }

  function societyNames() {
    var names = M.societies.map(function (s) { return s.name; });
    return names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  /* ---------- Deals ---------- */
  var DEAL_ORDER = ['self', 'royalty', 'profit'];

  var DEALS = {
    self:    { name: 'Self-released',           verdictName: 'self-releasing',              isLabel: false, summary: summarySelf },
    royalty: { name: 'Indie royalty deal',      verdictName: 'the indie royalty deal',      isLabel: true,  summary: summaryRoyalty },
    profit:  { name: 'Indie profit-share deal', verdictName: 'the indie profit-share deal', isLabel: true,  summary: summaryProfit }
  };

  /* ---------- Page ---------- */
  var el = function (id) { return document.getElementById(id); };
  var streamsInput, valueInput, costsInput, feeInput, royaltyInput, splitInput, advanceInput;

  function wholeNumber(input) { return Math.max(0, Math.floor(Number(input.value) || 0)); }

  function readInputs() {
    return {
      deal: document.querySelector('input[name="deal"]:checked').value,
      streams: wholeNumber(streamsInput),
      streamValue: Number(valueInput.value),
      releaseCosts: wholeNumber(costsInput),
      distributor: document.querySelector('input[name="distributor"]:checked').value,
      labelFee: Number(feeInput.value) / 100,
      royaltyRate: Number(royaltyInput.value) / 100,
      profitSplit: Number(splitInput.value) / 100,
      advance: wholeNumber(advanceInput)
    };
  }

  function setUp() {
    streamsInput = el('streams'); valueInput = el('value'); costsInput = el('costs');
    feeInput = el('labelfee'); royaltyInput = el('royalty'); splitInput = el('split'); advanceInput = el('advance');

    // Currency symbols, the value slider and the distributor choices come from the market
    document.querySelectorAll('.currency-symbol').forEach(function (span) { span.textContent = SYMBOL; });
    valueInput.min = M.streamValue.min;
    valueInput.max = M.streamValue.max;
    valueInput.step = M.streamValue.step;
    el('distributor-choices').innerHTML = M.distributors.map(function (d, i) {
      return '<label class="choice"><input type="radio" name="distributor" value="' + d.id + '"' + (i === 0 ? ' checked' : '') + '><span>' + d.name + '</span></label>';
    }).join('');

    // Starting values and tags come from the rules
    valueInput.value = r(M.streamValue.defaultKey);
    costsInput.value = r('releaseCosts');
    feeInput.value = r('labelDistributorFee') * 100;
    royaltyInput.value = r('royaltyRate') * 100;
    splitInput.value = r('profitSplit') * 100;
    advanceInput.value = r('advance');
    el('value-tag').innerHTML = tag(M.streamValue.defaultKey);
    el('costs-tag').innerHTML = tag('releaseCosts');
    el('labelfee-tag').innerHTML = tag('labelDistributorFee');
    el('royalty-tag').innerHTML = tag('royaltyRate');
    el('split-tag').innerHTML = tag('profitSplit');
    el('advance-tag').innerHTML = tag('advance');
    el('not-covered').textContent = M.notCovered;

    [streamsInput, valueInput, costsInput, feeInput, royaltyInput, splitInput, advanceInput].forEach(function (input) {
      input.addEventListener('input', render);
    });
    document.querySelectorAll('input[name="deal"], input[name="distributor"]').forEach(function (input) {
      input.addEventListener('change', render);
    });
  }

  function render() {
    var inp = readInputs();
    var deal = inp.deal;
    var isLabel = DEALS[deal].isLabel;
    var res = calculate(inp);

    // Show only the inputs that apply
    el('self-inputs').hidden = isLabel;
    el('label-inputs').hidden = !isLabel;
    el('royalty-field').hidden = deal !== 'royalty';
    el('split-field').hidden = deal !== 'profit';
    el('value-out').textContent = valueText(inp.streamValue);
    el('labelfee-out').textContent = pct(inp.labelFee);
    el('royalty-out').textContent = pct(inp.royaltyRate);
    el('split-out').textContent = pct(inp.profitSplit);

    // Under the Spotify threshold
    var note = el('threshold-note');
    note.hidden = inp.streams >= r('spotifyMinStreams');
    if (!note.hidden) {
      note.innerHTML = 'Under ' + r('spotifyMinStreams').toLocaleString(LOCALE) + ' streams in 12 months, Spotify pays nothing for a track\'s recording' + tag('spotifyMinStreams') +
        '. The figures below don\'t remove this, because they also cover other services and the songwriting money, which this rule doesn\'t affect.';
    }

    renderBreakdown(inp, res);
    renderWho(inp, res);
    renderFixed(inp, res);
    renderResults(inp, res);
    renderCompare(inp);
    renderSummary(inp);
  }

  function renderBreakdown(inp, res) {
    el('gross-line').textContent =
      inp.streams.toLocaleString(LOCALE) + ' streams × ' + valueText(inp.streamValue) + ' = ' + money(res.gross) + ' of streaming income in total.';

    var segments = [
      { name: 'Streaming service', amount: res.service, color: 'var(--c-service)',
        detail: 'Keeps ' + rulePct('serviceShare') + tag('serviceShare') + ' of all income' }
    ];

    if (inp.deal === 'self') {
      segments.push({ name: 'Distributor (' + res.distributor.name + ')', amount: res.distributorCut, color: 'var(--c-distributor)',
        detail: 'Takes ' + rulePct(res.distributor.cutKey) + tag(res.distributor.cutKey) + ' of the recording money' });
    } else {
      segments.push({ name: 'Label\'s distributor', amount: res.labelDistributorCut, color: 'var(--c-distributor)',
        detail: 'Takes ' + pct(inp.labelFee) + tag('labelDistributorFee') + ' of the recording money (' + rulePct('recordingShare') + tag('recordingShare') + ' of all income)' });
      var labelDetail = inp.deal === 'royalty'
        ? 'Keeps ' + pct(1 - inp.royaltyRate) + ' of what it receives. Your ' + pct(inp.royaltyRate) + tag('royaltyRate') + ' royalty pays back costs first' + tag('royaltyRecoup')
        : 'Costs come out of everything it receives' + tag('profitRecoup') + ', then you get ' + pct(inp.profitSplit) + tag('profitSplit') + ' of the profit';
      if (res.recouped > 0) labelDetail += '<br>Includes ' + money(res.recouped) + ' paying back release costs' + (inp.advance > 0 ? ' and your advance' : '');
      segments.push({ name: 'Label', amount: res.labelKeeps, color: 'var(--c-label)', detail: labelDetail });
    }

    var societyColours = ['var(--c-prs)', 'var(--c-mcps)', 'var(--c-distributor)'];
    res.societies.forEach(function (item, i) {
      var s = item.society;
      segments.push({ name: s.costName, amount: item.cost, color: societyColours[i % societyColours.length],
        detail: rulePct(s.costKey) + tag(s.costKey) + ' of the ' + s.name + ' share (' + pct(item.share) + (s.shareKey ? tag(s.shareKey) : '') + ') of the songwriting money' });
    });

    var recordingLine = inp.deal === 'self'
      ? money(res.artistRecording) + ' from the recording (' + rulePct('recordingShare') + tag('recordingShare') + ', minus distributor)'
      : money(res.artistRecording) + ' from the recording' + (res.owed > 0 ? ' (nothing yet: costs aren\'t paid back)' : '');
    segments.push({ name: 'You keep', amount: res.artist, color: 'var(--c-artist)',
      detail: recordingLine + '<br>' + money(res.artistSongwriting) + ' from the songwriting (' + rulePct('songwritingShare') + tag('songwritingShare') +
        ', minus ' + societyNames() + ' costs)' + (inp.deal === 'self' ? '' : tag('songwritingUnchanged')) });

    var bar = el('bar');
    bar.innerHTML = segments.map(function (s) {
      return '<div style="width:' + (res.gross > 0 ? s.amount / res.gross * 100 : 0) + '%;background:' + s.color + '" title="' + esc(s.name + ': ' + money(s.amount)) + '"></div>';
    }).join('');
    bar.setAttribute('aria-label', segments.map(function (s) { return s.name + ' ' + share(s.amount, res.gross); }).join(', '));

    el('rows').innerHTML = segments.map(function (s) {
      return '<li><span class="swatch" style="background:' + s.color + '"></span>' +
        '<span class="row-label">' + s.name + '<span class="row-detail">' + s.detail + '</span></span>' +
        '<span class="amount">' + money(s.amount) + '<span class="share">' + share(s.amount, res.gross) + '</span></span></li>';
    }).join('') +
      '<li class="total"><span></span><span class="row-label">Total streaming income</span><span class="amount">' + money(res.gross) + '</span></li>';
  }

  function renderWho(inp, res) {
    var costs = money(inp.releaseCosts);
    var html;
    if (inp.deal === 'self') {
      html = '<p class="who"><strong>You pay the ' + costs + ' yourself</strong>, upfront' + tag('releaseCosts') + '.</p>' +
        '<p class="who">If the music doesn\'t earn it back, <strong>you carry the loss</strong>. Everything you keep from the recording and the songwriting covers it, plus ' +
        money(res.fixedYear1) + ' of year-1 fixed costs, after ' + streamsText(res.breakEvenStreams) + '.</p>';
    } else {
      var total = money(res.debt);
      var how = inp.deal === 'royalty'
        ? 'It is paid back <strong>only from your ' + pct(inp.royaltyRate) + ' royalty</strong>' + tag('royaltyRecoup') + '.'
        : 'It is paid back <strong>from everything the label receives</strong>, before any profit is shared' + tag('profitRecoup') + '.';
      html = '<p class="who"><strong>The label pays the ' + costs + '</strong>' + tag('releaseCosts') +
        (inp.advance > 0 ? ', plus your ' + money(inp.advance) + ' cash advance' + tag('advance') + (inp.deal === 'profit' ? tag('advanceInProfitShare') : '') + ': ' + total + ' in total' : '') + '. ' + how + '</p>' +
        '<p class="who">If the music never earns it back, <strong>the label carries the loss</strong>. You don\'t repay it from your own pocket' + tag('notOutOfPocket') +
        '. But the unpaid amount stays on your account and comes out of any future earnings from the recording. ' + M.writeOffSentence(tag, pct) + '</p>';
    }
    el('who').innerHTML = html;
  }

  function renderFixed(inp, res) {
    var fixed = [];
    if (inp.deal === 'self') fixed.push(Object.assign({ amount: res.distributorYear1 }, res.distributor.feeRow(tag)));
    M.societies.forEach(function (s) {
      fixed.push({ name: s.name + ' joining fee', when: 'Year 1 only', amount: r(s.joinKey), detail: 'One-off' + tag(s.joinKey) });
    });
    var later = inp.deal === 'self' ? 'Each later year: ' + money(res.fixedLater) : 'The label pays for distribution, so there are no later fixed costs.';
    el('fixed-rows').innerHTML = fixed.map(function (f) {
      return '<li><span></span><span class="row-label">' + f.name + '<span class="row-detail">' + f.detail + '</span></span>' +
        '<span class="amount">' + money(f.amount) + '<span class="share">' + f.when + '</span></span></li>';
    }).join('') +
      '<li class="total"><span></span><span class="row-label">Year 1 total<span class="row-detail">' + later + '</span></span><span class="amount">' + money(res.fixedYear1) + '</span></li>';
  }

  function setResult(id, amount, sub) {
    var box = el(id);
    box.classList.toggle('is-loss', amount < 0);
    box.classList.toggle('is-gain', amount >= 0);
    el(id + '-amount').textContent = amount < 0 ? 'Loss of ' + money(-amount) : money(amount);
    el(id + '-sub').textContent = sub;
  }

  function renderResults(inp, res) {
    var loss = el('loss-message'), carry = el('carry-message');
    var second = el('second');

    if (inp.deal === 'self') {
      el('result-hint').textContent = 'Your earnings, minus fixed costs and the release costs you paid.';
      setResult('year1', res.year1, money(res.artist) + ' earned − ' + money(res.fixedYear1) + ' fixed costs − ' + money(res.releaseCostsPaid) + ' release costs');
      el('second-label').textContent = 'Each later year';
      setResult('second', res.later, money(res.artist) + ' earned − ' + money(res.fixedLater) + ' fixed costs');
      carry.hidden = true;
    } else {
      el('result-hint').textContent = 'Your earnings and any advance, minus fixed costs. The label paid the release costs.';
      var parts = [money(res.artistRecording) + ' recording', money(res.artistSongwriting) + ' songwriting'];
      if (res.advance > 0) parts.push(money(res.advance) + ' advance');
      setResult('year1', res.year1, parts.join(' + ') + ' − ' + money(res.fixedYear1) + ' fixed costs');

      // Second box: streams before you're paid for the recording
      el('second-label').textContent = 'Before you\'re paid for the recording';
      second.classList.remove('is-loss', 'is-gain');
      el('second-amount').textContent = isFinite(res.breakEvenStreams)
        ? (res.breakEvenStreams <= 0 ? 'From the first stream' : (res.breakEvenStreams >= 1e6 ? (res.breakEvenStreams / 1e6).toFixed(1) + ' million streams' : Math.ceil(res.breakEvenStreams).toLocaleString(LOCALE) + ' streams'))
        : 'Never';
      el('second-sub').textContent = !isFinite(res.breakEvenStreams)
        ? 'With these settings the costs can never be paid back.'
        : res.breakEvenStreams <= 0
          ? 'There are no costs to pay back.'
          : 'By then the label will have received ' + money(res.labelReceivedAtBreakEven) + ' after its distributor\'s fee' +
            (inp.deal === 'royalty' ? ', because only ' + pct(inp.royaltyRate) + ' of each ' + SYMBOL + '1 goes towards the ' + money(res.debt) + ' of costs.' : ', enough to cover the ' + money(res.debt) + ' of costs.');

      carry.hidden = !(res.owed > 0.005);
      if (!carry.hidden) {
        carry.innerHTML = '<strong>' + money(res.owed) + ' of costs isn\'t earned back yet.</strong> It carries into later years and comes out of your future recording money before you\'re paid for the recording. Your songwriting money isn\'t affected.';
      }
    }

    loss.hidden = res.year1 >= 0;
    if (!loss.hidden) {
      var why = inp.deal === 'self'
        ? 'your costs (' + money(res.fixedYear1 + res.releaseCostsPaid) + ', including the ' + money(res.releaseCostsPaid) + ' release) are more than the ' + money(res.artist) + ' you earned.'
        : 'the ' + money(res.fixedYear1) + ' ' + societyNames() + ' joining fees are more than the ' + money(res.artist + res.advance) + ' you received.';
      loss.innerHTML = 'In year 1 you <strong>lose ' + money(-res.year1) + '</strong>: ' + why;
    }
  }

  function renderCompare(inp) {
    var deals = DEAL_ORDER;
    var all = deals.map(function (d) { return calculate(Object.assign({}, inp, { deal: d })); });
    var cell = function (fn, cls) {
      return deals.map(function (d, i) {
        var v = fn(all[i], d);
        var c = (d === inp.deal ? 'is-current ' : '') + (cls ? cls(all[i], d) : '');
        return '<td class="' + c + '">' + v + '</td>';
      }).join('');
    };
    var signClass = function (res) { return res.year1 < 0 ? 'neg' : 'pos'; };
    var dash = '—';

    var rows = [
      ['Who pays the ' + money(inp.releaseCosts) + ' release costs', function (res) { return res.releaseCostsPaid > 0 ? 'You do' : 'The label'; }],
      ['Recording money paid to you', function (res) { return money(res.artistRecording); }],
      ['Songwriting money', function (res) { return money(res.artistSongwriting); }],
      ['Cash advance', function (res, d) { return DEALS[d].isLabel ? money(res.advance) : dash; }],
      ['Fixed costs', function (res) { return '−' + money(res.fixedYear1); }],
      ['Release costs you paid', function (res) { return res.releaseCostsPaid > 0 ? '−' + money(res.releaseCostsPaid) : money(0); }],
      ['Year 1 for you', function (res) { return money(res.year1); }, signClass, 'key'],
      ['Still owed to the label (carries over)', function (res, d) { return DEALS[d].isLabel ? money(res.owed) : dash; }],
      ['Streams before year 1 stops being a loss', function (res, d) { return streamsText(streamsUntilAhead(inp, d)).replace('about ', '~'); }],
      ['Streams before the label\'s costs are paid back and you\'re paid for the recording', function (res) { return res.labelReceivedAtBreakEven === null ? dash : streamsText(res.breakEvenStreams).replace('about ', '~'); }],
      ['Label has received by then', function (res) { return res.labelReceivedAtBreakEven === null || !isFinite(res.labelReceivedAtBreakEven) ? dash : money(res.labelReceivedAtBreakEven); }],
      ['Who carries the loss if it isn\'t earned back', function (res) { return res.releaseCostsPaid > 0 ? 'You do' : 'The label'; }]
    ];

    var headCells = deals.map(function (d) {
      return '<th scope="col" class="' + (d === inp.deal ? 'is-current' : '') + '">' + DEALS[d].name + '</th>';
    }).join('');

    el('compare-narrow').innerHTML = '<thead><tr>' + headCells + '</tr></thead><tbody>' + rows.map(function (row) {
      return '<tr class="label-row ' + (row[3] || '') + '"><th scope="colgroup" colspan="' + deals.length + '">' + row[0] + '</th></tr>' +
        '<tr class="value-row ' + (row[3] || '') + '">' + cell(row[1], row[2]) + '</tr>';
    }).join('') + '</tbody>';

    el('compare').innerHTML = '<thead><tr><th scope="col"></th>' + headCells + '</tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr class="' + (row[3] || '') + '"><th scope="row">' + row[0] + '</th>' + cell(row[1], row[2]) + '</tr>';
      }).join('') + '</tbody>';
  }

  /* ---------- Summary ----------
     Fixed sentence templates filled in with the calculator's own numbers.
     Verdict first, then at most two short sentences per deal, then one shared
     note for label deals. They describe the results; they never recommend a deal. */
  function streamsPhrase(n) {
    if (n >= 1e6) return +(n / 1e6).toFixed(2) + ' million';
    return n.toLocaleString(LOCALE);
  }

  function capitalise(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

  // "leaves you about £188 out of pocket" / "leaves you about £788 ahead"
  function outcome(year1, plural) {
    var verb = plural ? 'leave' : 'leaves';
    if (year1 <= -0.5) return verb + ' you about ' + wholeMoney(year1) + ' out of pocket';
    if (year1 >= 0.5) return verb + ' you about ' + wholeMoney(year1) + ' ahead';
    return verb + ' you roughly even';
  }

  function verdict(inp, results) {
    // Group deals whose year-1 results round to the same amount, highest first
    var sorted = DEAL_ORDER.slice().sort(function (a, b) { return results[b].year1 - results[a].year1; });
    var groups = [];
    sorted.forEach(function (d) {
      var last = groups[groups.length - 1];
      if (last && Math.round(results[last[0]].year1) === Math.round(results[d].year1)) last.push(d);
      else groups.push([d]);
    });
    var labelDeals = DEAL_ORDER.filter(function (d) { return DEALS[d].isLabel; });
    var groupName = function (g) {
      if (g.length === DEAL_ORDER.length) return 'every route';
      if (g.length === labelDeals.length && g.every(function (d) { return DEALS[d].isLabel; })) {
        return labelDeals.length === 2 ? 'both indie deals' : 'all the label deals';
      }
      var names = g.map(function (d) { return DEALS[d].verdictName; });
      return names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    };
    return groups.map(function (g, i) {
      var plural = g.length > 1;
      var res = results[g[0]];
      if (i === 0) return 'At ' + streamsPhrase(inp.streams) + ' streams, ' + groupName(g) + ' ' + outcome(res.year1, plural) + ' in year 1.';
      return capitalise(groupName(g)) + ' ' + outcome(res.year1, plural) + '.';
    }).join(' ');
  }

  function breakEvenSentence(n) {
    if (!isFinite(n)) return 'You wouldn\'t break even with these settings.';
    if (n <= 0) return 'You\'d be ahead from the first stream.';
    return 'You\'d break even at ' + streamsText(n) + '.';
  }

  function summarySelf(res, inp) {
    var first = inp.releaseCosts > 0
      ? 'you pay the ' + wholeMoney(inp.releaseCosts) + ' release cost yourself, so the risk is yours.'
      : 'there\'s no release cost, so the most you could lose is your ' + wholeMoney(res.fixedYear1) + ' of fixed costs.';
    return 'If you self-release: ' + first + ' ' + breakEvenSentence(res.breakEvenStreams);
  }

  // What the label pays, and that it takes the loss
  function labelPays(inp) {
    if (inp.releaseCosts > 0 && inp.advance > 0) return 'the label pays the ' + wholeMoney(inp.releaseCosts) + ', pays you ' + wholeMoney(inp.advance) + ' upfront, and takes the loss if the song flops.';
    if (inp.releaseCosts > 0) return 'the label pays the ' + wholeMoney(inp.releaseCosts) + ' and takes the loss if the song flops.';
    return 'the label pays you ' + wholeMoney(inp.advance) + ' upfront and takes the loss if the song flops.';
  }

  function summaryRoyalty(res, inp) {
    var rate = pct(inp.royaltyRate);
    if (res.debt <= 0) return 'If you sign an indie royalty deal: there\'s nothing for the label to repay, so you\'re paid your ' + rate + ' share from the first stream.';
    var when = isFinite(res.breakEvenStreams)
      ? 'you aren\'t paid for the recording until ' + streamsText(res.breakEvenStreams)
      : 'you\'d never be paid for the recording with these settings';
    return 'If you sign an indie royalty deal: ' + labelPays(inp) + ' It repays itself from your ' + rate + ' share first, so ' + when + '.';
  }

  function summaryProfit(res, inp) {
    var split = Math.round(inp.profitSplit * 100);
    if (res.debt <= 0) {
      return 'If you sign an indie profit-share deal: there\'s nothing for the label to repay, so it ' +
        (split === 50 ? 'splits the recording money 50/50' : 'gives you ' + split + '% of the recording money') + ' from the first stream.';
    }
    var when = isFinite(res.breakEvenStreams)
      ? 'you\'re paid for the recording from ' + streamsText(res.breakEvenStreams)
      : 'you\'d never be paid for the recording with these settings';
    return 'If you sign an indie profit-share deal: ' + labelPays(inp) + ' It repays itself from all the recording money, then ' +
      (split === 50 ? 'splits the rest 50/50' : 'gives you ' + split + '% of the rest') + ', so ' + when + '.';
  }

  function labelNote() {
    var count = DEAL_ORDER.filter(function (d) { return DEALS[d].isLabel; }).length;
    return 'With ' + (count === 2 ? 'either indie deal' : 'any label deal') + ', costs not yet repaid carry forward against your future recording money. You never repay them from your own pocket.';
  }

  function renderSummary(inp) {
    var results = {};
    DEAL_ORDER.forEach(function (d) { results[d] = calculate(Object.assign({}, inp, { deal: d })); });
    var hasLabelDeal = DEAL_ORDER.some(function (d) { return DEALS[d].isLabel; });
    el('summary-text').innerHTML =
      '<p class="summary-verdict">' + esc(verdict(inp, results)) + '</p>' +
      DEAL_ORDER.map(function (d) { return '<p>' + esc(DEALS[d].summary(results[d], inp)) + '</p>'; }).join('') +
      (hasLabelDeal ? '<p class="summary-label-note">' + esc(labelNote()) + '</p>' : '');
  }

  // Available for testing in the browser
  window.RoyaltyCalculator = { calculate: calculate, streamsUntilAhead: streamsUntilAhead, readInputs: readInputs, render: render };

  if (el('streams')) {
    setUp();
    render();
  }
})();
