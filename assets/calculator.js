/* =====================================================================
   Royalty calculator — shared maths and page code for every market.

   It reads the market's rules and settings from window.MARKET, which is
   set by a market file such as /markets/uk.js. Nothing in this file is
   specific to one country: numbers, organisations and currency all come
   from the market file.

   To add a deal: add its branch in calculate(), an entry in DEALS with its
   summary template, its id in DEAL_ORDER, a radio button in the page's
   "Deal type" choice, and any settings it needs. The comparison table and
   summary pick it up.
   ===================================================================== */
(function () {
  var M = window.MARKET;
  var RULES = M.rules;
  var r = function (key) { return RULES[key].value; };

  function findDistributor(id) {
    return M.distributors.filter(function (d) { return d.id === id; })[0] || M.distributors[0];
  }

  /* ---------- The maths (no page code, so it can be tested on its own) ----------
     inputs: {
       deal: 'self' | 'royalty' | 'profit' | 'major',
       streams, streamValue (e.g. pence), coShare (your share of the songwriting, 0–1),
       self:   releaseCosts, distributor
       indie:  releaseCosts, labelFee, royaltyRate, profitSplit, advance
       major:  majorRoyalty, producerShare, majorAdvance, majorCosts, writerShare
     } */
  function calculate(inputs) {
    var deal = inputs.deal;
    var perUnit = M.streamValue.perUnit;
    var gross = inputs.streams * inputs.streamValue / perUnit;
    var coShare = inputs.coShare === undefined ? 1 : inputs.coShare;
    var writerShare = deal === 'major' ? inputs.writerShare : 1;
    var hasPublisher = writerShare < 1;

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
    var songwritingAfterSocieties = songwriting - societyCosts;

    // Co-writers take their share; a publisher (major deal) keeps part of yours
    var yourSongwriting = songwritingAfterSocieties * coShare;
    var coWriters = songwritingAfterSocieties - yourSongwriting;
    var publisher = yourSongwriting * (1 - writerShare);
    var artistSongwriting = yourSongwriting - publisher;

    // If the songwriting society isn't joined (inputs.songwritingCollected === false), this money
    // is held by the society and not paid to you
    var songwritingCollected = inputs.songwritingCollected !== false;
    var songwritingNotCollected = songwritingCollected ? 0 : artistSongwriting;
    if (!songwritingCollected) artistSongwriting = 0;

    // Joining fees: with a publisher, the publisher deals with some societies (e.g. MCPS)
    var payingSocieties = M.societies.filter(function (s) { return !(hasPublisher && s.publisherJoins); });
    var joiningFees = songwritingCollected ? payingSocieties.reduce(function (sum, s) { return sum + r(s.joinKey); }, 0) : 0;

    var res = {
      deal: deal, gross: gross, service: service, recording: recording, songwriting: songwriting,
      societies: societies, societyCosts: societyCosts, coWriters: coWriters, publisher: publisher,
      artistSongwriting: artistSongwriting, joiningFees: joiningFees, payingSocieties: payingSocieties,
      coShare: coShare, writerShare: writerShare, producer: 0, labelDistributorCut: 0, distributorCut: 0
    };

    if (!songwritingCollected) res.songwritingNotCollected = songwritingNotCollected;

    // Songwriting money you keep per stream (used for break-even)
    var songwritingKeptPerStream = songwritingCollected ? inputs.streamValue / perUnit * r('songwritingShare') * keptShareOfSongwriting * coShare * writerShare : 0;

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
      res.debt = 0;
      res.year1 = res.artist - res.fixedYear1 - inputs.releaseCosts;
      res.unearnedAdvance = 0;
      res.earned = res.year1;
      res.later = res.artist - res.fixedLater;
      // Streams before everything kept (recording + songwriting) covers the release costs and year-1 fixed costs
      var keptPerStream = inputs.streamValue / perUnit * r('recordingShare') * (1 - cut) + songwritingKeptPerStream;
      var spent = inputs.releaseCosts + res.fixedYear1;
      res.breakEvenStreams = spent > 0 ? (keptPerStream > 0 ? spent / keptPerStream : Infinity) : 0;
      res.labelReceivedAtBreakEven = null;
      return res;
    }

    var debt, recouped;

    if (deal === 'major') {
      // The label distributes itself; the producer is paid from the artist's rate, from the first stream
      var artistRate = Math.max(0, inputs.majorRoyalty - inputs.producerShare);
      debt = inputs.majorAdvance + inputs.majorCosts;
      res.labelReceipts = recording;
      res.producer = recording * Math.min(inputs.producerShare, inputs.majorRoyalty);
      var royaltyEarned = recording * artistRate;
      recouped = Math.min(royaltyEarned, debt);
      res.royaltyEarned = royaltyEarned;
      res.artistRecording = royaltyEarned - recouped;
      res.artistRate = artistRate;
      var perStreamToDebt = inputs.streamValue / perUnit * r('recordingShare') * artistRate;
      res.breakEvenStreams = debt > 0 ? (perStreamToDebt > 0 ? debt / perStreamToDebt : Infinity) : 0;
      res.labelReceivedAtBreakEven = debt > 0 ? (artistRate > 0 ? debt / artistRate : Infinity) : 0;
      res.advance = inputs.majorAdvance;
      res.chargedBackCosts = inputs.majorCosts;
    } else {
      // Indie deals
      debt = inputs.releaseCosts + inputs.advance;
      res.labelDistributorCut = recording * inputs.labelFee;
      res.labelReceipts = recording - res.labelDistributorCut;
      var perStreamReceipts = inputs.streamValue / perUnit * r('recordingShare') * (1 - inputs.labelFee);
      if (deal === 'royalty') {
        var royaltyShare = res.labelReceipts * inputs.royaltyRate;
        recouped = Math.min(royaltyShare, debt);
        res.artistRecording = royaltyShare - recouped;
        var perStreamRoyalty = perStreamReceipts * inputs.royaltyRate;
        res.breakEvenStreams = debt > 0 ? (perStreamRoyalty > 0 ? debt / perStreamRoyalty : Infinity) : 0;
        res.labelReceivedAtBreakEven = debt > 0 ? (inputs.royaltyRate > 0 ? debt / inputs.royaltyRate : Infinity) : 0;
      } else {
        recouped = Math.min(res.labelReceipts, debt);
        res.artistRecording = (res.labelReceipts - recouped) * inputs.profitSplit;
        res.breakEvenStreams = debt > 0 ? (perStreamReceipts > 0 ? debt / perStreamReceipts : Infinity) : 0;
        res.labelReceivedAtBreakEven = debt;
      }
      res.advance = inputs.advance;
    }

    res.debt = debt;
    res.recouped = recouped;
    res.owed = debt - recouped;
    res.labelKeeps = res.labelReceipts - res.artistRecording - res.producer;
    res.artist = res.artistRecording + artistSongwriting;
    res.releaseCostsPaid = 0;
    res.fixedYear1 = joiningFees;
    res.fixedLater = 0;
    res.received = res.artist + res.advance;
    res.year1 = res.received - joiningFees;
    // The advance is an early payment of your own royalties. The part your streams haven't yet
    // earned back is kept apart from what they earned. Charged-back costs are assumed to be paid
    // back before the advance, so the advance is the last thing to count as earned.
    res.unearnedAdvance = Math.min(res.advance, res.owed);
    res.earned = res.year1 - res.unearnedAdvance;
    return res;
  }

  // Smallest number of streams a year at which what your streams earn covers your year-1 costs (any deal).
  // The advance is left out: it's paid upfront, not earned from streams.
  function streamsUntilAhead(inp, deal) {
    var year1 = function (n) { return calculate(Object.assign({}, inp, { deal: deal, streams: n })).earned; };
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

  function streamsShort(n) {
    if (!isFinite(n)) return 'Never';
    if (n <= 0) return 'From the first stream';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + ' million streams';
    return Math.ceil(n).toLocaleString(LOCALE) + ' streams';
  }

  function valueText(v) { return v.toFixed(2) + M.streamValue.unit; }

  function joinNames(names) {
    return names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  function societyNames(list) {
    return joinNames((list || M.societies).map(function (s) { return s.name; }));
  }

  /* ---------- Deals ---------- */
  var DEAL_ORDER = ['self', 'royalty', 'profit', 'major'];

  var DEALS = {
    self:    { name: 'Self-released',           verdictName: 'self-releasing',              isLabel: false, family: 'self',  summary: summarySelf },
    royalty: { name: 'Indie royalty deal',      verdictName: 'the indie royalty deal',      isLabel: true,  family: 'indie', summary: summaryRoyalty },
    profit:  { name: 'Indie profit-share deal', verdictName: 'the indie profit-share deal', isLabel: true,  family: 'indie', summary: summaryProfit },
    major:   { name: 'Major-label deal',        verdictName: 'the major-label deal',        isLabel: true,  family: 'major', summary: summaryMajor }
  };

  // Who pays for making and promoting the release, for the comparison table
  function whoPaysRelease(res) {
    if (res.deal === 'self') return 'You do';
    if (res.deal === 'major') return 'The label; it charges back the advance and recording costs';
    return 'The label; it charges them back';
  }

  /* ---------- Page ---------- */
  var el = function (id) { return document.getElementById(id); };
  var INPUT_IDS = ['streams', 'value', 'coshare', 'costs', 'labelfee', 'royalty', 'split', 'advance',
                   'major-royalty', 'producer', 'major-advance', 'major-costs', 'writer-share'];

  function wholeNumber(id) { return Math.max(0, Math.floor(Number(el(id).value) || 0)); }
  function percent(id) { return Number(el(id).value) / 100; }

  function readInputs() {
    return {
      deal: document.querySelector('input[name="deal"]:checked').value,
      streams: wholeNumber('streams'),
      streamValue: Number(el('value').value),
      coShare: percent('coshare'),
      releaseCosts: wholeNumber('costs'),
      distributor: document.querySelector('input[name="distributor"]:checked').value,
      labelFee: percent('labelfee'),
      royaltyRate: percent('royalty'),
      profitSplit: percent('split'),
      advance: wholeNumber('advance'),
      majorRoyalty: percent('major-royalty'),
      producerShare: percent('producer'),
      majorAdvance: wholeNumber('major-advance'),
      majorCosts: wholeNumber('major-costs'),
      writerShare: percent('writer-share')
    };
  }

  function setUp() {
    // Currency symbols, the value slider and the distributor choices come from the market
    document.querySelectorAll('.currency-symbol').forEach(function (span) { span.textContent = SYMBOL; });
    var value = el('value');
    value.min = M.streamValue.min;
    value.max = M.streamValue.max;
    value.step = M.streamValue.step;
    el('distributor-choices').innerHTML = M.distributors.map(function (d, i) {
      return '<label class="choice"><input type="radio" name="distributor" value="' + d.id + '"' + (i === 0 ? ' checked' : '') + '><span>' + d.name + '</span></label>';
    }).join('');

    // Starting values and tags come from the rules
    var start = {
      value: [M.streamValue.defaultKey, 1], coshare: ['yourSongwritingShare', 100], costs: ['releaseCosts', 1],
      labelfee: ['labelDistributorFee', 100], royalty: ['royaltyRate', 100], split: ['profitSplit', 100], advance: ['advance', 1],
      'major-royalty': ['majorRoyaltyRate', 100], producer: ['producerShare', 100], 'major-advance': ['majorAdvance', 1],
      'major-costs': ['majorRecordingCosts', 1], 'writer-share': ['writerShareAfterPublisher', 100]
    };
    Object.keys(start).forEach(function (id) {
      el(id).value = r(start[id][0]) * start[id][1];
      var tagSpot = el(id + '-tag');
      if (tagSpot) tagSpot.innerHTML = tag(start[id][0]);
    });
    el('not-covered').textContent = M.notCovered;

    // A link such as /uk/?deal=major opens with that deal selected
    var wanted = new URLSearchParams(location.search).get('deal');
    if (wanted && DEALS[wanted]) document.querySelector('input[name="deal"][value="' + wanted + '"]').checked = true;

    INPUT_IDS.forEach(function (id) { el(id).addEventListener('input', render); });
    document.querySelectorAll('input[name="deal"], input[name="distributor"]').forEach(function (input) {
      input.addEventListener('change', render);
    });
  }

  function render() {
    var inp = readInputs();
    var deal = inp.deal;
    var family = DEALS[deal].family;
    var res = calculate(inp);

    // Show only the inputs that apply
    el('self-inputs').hidden = family !== 'self';
    el('label-inputs').hidden = family !== 'indie';
    el('major-inputs').hidden = family !== 'major';
    el('costs-field').hidden = family === 'major';
    el('royalty-field').hidden = deal !== 'royalty';
    el('split-field').hidden = deal !== 'profit';
    el('value-out').textContent = valueText(inp.streamValue);
    el('coshare-out').textContent = pct(inp.coShare);
    el('labelfee-out').textContent = pct(inp.labelFee);
    el('royalty-out').textContent = pct(inp.royaltyRate);
    el('split-out').textContent = pct(inp.profitSplit);
    el('major-royalty-out').textContent = pct(inp.majorRoyalty);
    el('producer-out').textContent = pct(inp.producerShare);
    el('writer-share-out').textContent = pct(inp.writerShare);

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
    } else if (inp.deal === 'major') {
      var majorDetail = 'Receives the recording money (' + rulePct('recordingShare') + tag('recordingShare') + ' of all income), with no separate distributor fee' + tag('majorNoDistributorFee') +
        '. Your ' + pct(res.artistRate) + ' royalty pays back the advance and recording costs first' + tag('majorRecoup');
      if (res.recouped > 0) majorDetail += '<br>Includes ' + money(res.recouped) + ' paying back your advance and recording costs';
      segments.push({ name: 'Label', amount: res.labelKeeps, color: 'var(--c-label)', detail: majorDetail });
      segments.push({ name: 'Record producer', amount: res.producer, color: 'var(--c-distributor)',
        detail: pct(inp.producerShare) + tag('producerShare') + ' of the recording money, taken from your ' + pct(inp.majorRoyalty) + tag('majorRoyaltyRate') + ' royalty and paid from the first stream' });
    } else {
      segments.push({ name: 'Label\'s distributor', amount: res.labelDistributorCut, color: 'var(--c-distributor)',
        detail: 'Takes ' + pct(inp.labelFee) + tag('labelDistributorFee') + ' of the recording money (' + rulePct('recordingShare') + tag('recordingShare') + ' of all income)' });
      var labelDetail = inp.deal === 'royalty'
        ? 'Keeps ' + pct(1 - inp.royaltyRate) + ' of what it receives. Your ' + pct(inp.royaltyRate) + tag('royaltyRate') + ' royalty pays back costs first' + tag('royaltyRecoup')
        : 'Costs come out of everything it receives' + tag('profitRecoup') + ', then you get ' + pct(inp.profitSplit) + tag('profitSplit') + ' of the profit';
      if (res.recouped > 0) labelDetail += '<br>Includes ' + money(res.recouped) + ' paying back release costs' + (inp.advance > 0 ? ' and your advance' : '');
      segments.push({ name: 'Label', amount: res.labelKeeps, color: 'var(--c-label)', detail: labelDetail });
    }

    var societyColours = ['var(--c-prs)', 'var(--c-mcps)'];
    res.societies.forEach(function (item, i) {
      var s = item.society;
      segments.push({ name: s.costName, amount: item.cost, color: societyColours[i % societyColours.length],
        detail: rulePct(s.costKey) + tag(s.costKey) + ' of the ' + s.name + ' share (' + pct(item.share) + tag('prsHalf') + ') of the songwriting money' });
    });

    if (res.coWriters > 0.005) {
      segments.push({ name: 'Your co-writers', amount: res.coWriters, color: 'var(--c-cowriters)',
        detail: 'Their ' + pct(1 - inp.coShare) + ' of the songwriting money' + tag('yourSongwritingShare') });
    }
    if (res.publisher > 0.005) {
      segments.push({ name: 'Your publisher', amount: res.publisher, color: 'var(--c-publisher)',
        detail: 'Keeps ' + pct(1 - res.writerShare) + ' of your songwriting money' + tag('writerShareAfterPublisher') + '. PRS pays you half the performance money directly' + tag('prsDirectHalf') });
    }

    var recordingLine;
    if (inp.deal === 'self') {
      recordingLine = money(res.artistRecording) + ' from the recording (' + rulePct('recordingShare') + tag('recordingShare') + ', minus distributor)';
    } else {
      recordingLine = money(res.artistRecording) + ' from the recording' + (res.owed > 0 ? ' (nothing yet: costs aren\'t paid back)' : '');
    }
    var songLine = money(res.artistSongwriting) + ' from the songwriting (' + rulePct('songwritingShare') + tag('songwritingShare') + ', minus ' + societyNames() + ' costs' +
      (inp.coShare < 1 ? ', co-writers' : '') + (res.writerShare < 1 ? ', publisher' : '') + ')' + (DEALS[inp.deal].family === 'indie' ? tag('songwritingUnchanged') : '');
    segments.push({ name: 'You keep', amount: res.artist, color: 'var(--c-artist)', detail: recordingLine + '<br>' + songLine });

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
    var html;
    if (inp.deal === 'self') {
      html = '<p class="who"><strong>You pay the ' + money(inp.releaseCosts) + ' yourself</strong>, upfront' + tag('releaseCosts') + '.</p>' +
        '<p class="who">If the music doesn\'t earn it back, <strong>you carry the loss</strong>. Everything you keep from the recording and the songwriting covers it, plus ' +
        money(res.fixedYear1) + ' of year-1 fixed costs, after ' + streamsText(res.breakEvenStreams) + '.</p>';
    } else if (inp.deal === 'major') {
      html = '<p class="who"><strong>The label pays for the release.</strong> It charges back ' + money(inp.majorCosts) + ' of recording costs' + tag('majorRecordingCosts') +
        ' and pays for marketing itself, without charging it back' + tag('marketingNotCharged') + '. It also pays you a ' + money(inp.majorAdvance) + ' advance upfront' + tag('majorAdvance') +
        '. The advance and recording costs, ' + money(res.debt) + ' in total, are paid back <strong>only from your royalty</strong>' + tag('majorRecoup') + '.</p>' +
        '<p class="who">If the music never earns it back, <strong>the label carries the loss</strong> and you keep the advance' + tag('advanceKept') +
        '. The unpaid amount stays on your account and comes out of any future royalties. ' + M.majorWriteOffSentence(tag) + '</p>';
    } else {
      var how = inp.deal === 'royalty'
        ? 'It is paid back <strong>only from your ' + pct(inp.royaltyRate) + ' royalty</strong>' + tag('royaltyRecoup') + '.'
        : 'It is paid back <strong>from everything the label receives</strong>, before any profit is shared' + tag('profitRecoup') + '.';
      html = '<p class="who"><strong>The label pays the ' + money(inp.releaseCosts) + '</strong>' + tag('releaseCosts') +
        (inp.advance > 0 ? ', plus your ' + money(inp.advance) + ' cash advance' + tag('advance') + (inp.deal === 'profit' ? tag('advanceInProfitShare') : '') + ': ' + money(res.debt) + ' in total' : '') + '. ' + how + '</p>' +
        '<p class="who">If the music never earns it back, <strong>the label carries the loss</strong>. You don\'t repay it from your own pocket' + tag('notOutOfPocket') +
        '. But the unpaid amount stays on your account and comes out of any future earnings from the recording. ' + M.writeOffSentence(tag, pct) + '</p>';
    }
    el('who').innerHTML = html;
  }

  function renderFixed(inp, res) {
    var fixed = [];
    if (inp.deal === 'self') fixed.push(Object.assign({ amount: res.distributorYear1 }, res.distributor.feeRow(tag)));
    res.payingSocieties.forEach(function (s) {
      fixed.push({ name: s.name + ' joining fee', when: 'Year 1 only', amount: r(s.joinKey), detail: 'One-off' + tag(s.joinKey) });
    });
    var skipped = M.societies.filter(function (s) { return res.payingSocieties.indexOf(s) === -1; });
    var later = inp.deal === 'self' ? 'Each later year: ' + money(res.fixedLater) : 'The label pays for distribution, so there are no later fixed costs.';
    if (skipped.length) later += ' Your publisher deals with ' + societyNames(skipped) + tag('publisherHandlesMcps') + '.';
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
    var loss = el('loss-message'), carry = el('carry-message'), advanceNote = el('advance-message');
    var second = el('second');
    advanceNote.hidden = true;

    if (inp.deal === 'self') {
      el('result-hint').textContent = 'Your earnings, minus fixed costs and the release costs you paid.';
      setResult('year1', res.year1, money(res.artist) + ' earned − ' + money(res.fixedYear1) + ' fixed costs − ' + money(res.releaseCostsPaid) + ' release costs');
      el('second-label').textContent = 'Each later year';
      setResult('second', res.later, money(res.artist) + ' earned − ' + money(res.fixedLater) + ' fixed costs');
      carry.hidden = true;
    } else {
      el('result-hint').textContent = 'Your earnings and any advance, minus fixed costs. The label paid for the release.';
      var parts = [money(res.artistRecording) + ' recording', money(res.artistSongwriting) + ' songwriting'];
      if (res.advance > 0) parts.unshift(money(res.advance) + ' advance');
      setResult('year1', res.year1, parts.join(' + ') + ' − ' + money(res.fixedYear1) + ' fixed costs');

      // Second box: streams before you're paid for the recording
      el('second-label').textContent = inp.deal === 'major' ? 'Before your royalties start' : 'Before you\'re paid for the recording';
      second.classList.remove('is-loss', 'is-gain');
      el('second-amount').textContent = streamsShort(res.breakEvenStreams);
      var perPound = inp.deal === 'major' ? pct(res.artistRate) : pct(inp.royaltyRate);
      el('second-sub').textContent = !isFinite(res.breakEvenStreams)
        ? 'With these settings the costs can never be paid back.'
        : res.breakEvenStreams <= 0
          ? 'There are no costs to pay back.'
          : 'By then the label will have received ' + money(res.labelReceivedAtBreakEven) + ' of recording money' + (inp.deal === 'major' ? '' : ' after its distributor\'s fee') +
            (inp.deal === 'profit' ? ', enough to cover the ' + money(res.debt) + ' of costs.' : ', because only ' + perPound + ' of each ' + SYMBOL + '1 goes towards the ' + money(res.debt) + ' to pay back.');

      if (res.advance > 0 && res.received > 0) {
        advanceNote.hidden = false;
        advanceNote.innerHTML = '<strong>' + share(res.advance, res.received) + ' of what you receive in year 1 is the advance</strong>: ' +
          money(res.advance) + ' of ' + money(res.received) + '. The advance is paid upfront and counts towards what the label takes back.';
      }

      carry.hidden = !(res.owed > 0.005);
      if (!carry.hidden) {
        carry.innerHTML = '<strong>' + money(res.owed) + ' isn\'t earned back yet.</strong> It carries into later years and comes out of your future recording money before you\'re paid for the recording. Your songwriting money isn\'t affected.';
      }
    }

    loss.hidden = res.year1 >= 0;
    if (!loss.hidden) {
      var why = inp.deal === 'self'
        ? 'your costs (' + money(res.fixedYear1 + res.releaseCostsPaid) + ', including the ' + money(res.releaseCostsPaid) + ' release) are more than the ' + money(res.artist) + ' you earned.'
        : 'the ' + money(res.fixedYear1) + ' ' + societyNames(res.payingSocieties) + ' joining fees are more than the ' + money(res.received) + ' you received.';
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
    var earnedClass = function (res) { return res.earned < 0 ? 'neg' : 'pos'; };
    var dash = '—';

    var rows = [
      ['Who pays for the release', function (res) { return whoPaysRelease(res); }],
      ['Release costs: paid by you, or charged back to you', function (res) {
        if (res.deal === 'self') return money(res.releaseCostsPaid) + ' (you pay)';
        return money(res.debt - res.advance) + ' charged back';
      }],
      ['Recording money paid to you', function (res) { return money(res.artistRecording); }],
      ['Songwriting money', function (res) { return money(res.artistSongwriting); }],
      ['Fixed costs', function (res) { return '−' + money(res.fixedYear1); }],
      ['Release costs you paid', function (res) { return res.releaseCostsPaid > 0 ? '−' + money(res.releaseCostsPaid) : money(0); }],
      ['Paid upfront (advance)', function (res, d) { return DEALS[d].isLabel ? money(res.advance) : dash; }],
      ['Earned from your streams in year 1', function (res) { return money(res.earned); }, earnedClass, 'key'],
      ['Advance your streams haven\'t earned back yet', function (res, d) { return DEALS[d].isLabel ? money(res.unearnedAdvance) : dash; }],
      ['Year 1 total (the two rows above)', function (res) { return money(res.year1); }, signClass],
      ['Still owed to the label (carries over)', function (res, d) { return DEALS[d].isLabel ? money(res.owed) : dash; }],
      ['Streams before your streams cover your year-1 costs', function (res, d) { return streamsText(streamsUntilAhead(inp, d)).replace('about ', '~'); }],
      ['Streams before the label\'s costs are paid back and you\'re paid for the recording', function (res) { return res.labelReceivedAtBreakEven === null ? dash : streamsText(res.breakEvenStreams).replace('about ', '~'); }],
      ['Label has received by then', function (res) { return res.labelReceivedAtBreakEven === null || !isFinite(res.labelReceivedAtBreakEven) ? dash : money(res.labelReceivedAtBreakEven); }],
      ['Who carries the loss if it isn\'t earned back', function (res) { return res.deal === 'self' ? 'You do' : 'The label'; }]
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
    // Rank by what your streams earn in year 1 (not counting any advance), highest first,
    // grouping deals whose results round to the same amount
    var sorted = DEAL_ORDER.slice().sort(function (a, b) { return results[b].earned - results[a].earned; });
    var groups = [];
    sorted.forEach(function (d) {
      var last = groups[groups.length - 1];
      if (last && Math.round(results[last[0]].earned) === Math.round(results[d].earned)) last.push(d);
      else groups.push([d]);
    });
    var indieDeals = DEAL_ORDER.filter(function (d) { return DEALS[d].family === 'indie'; });
    var labelDeals = DEAL_ORDER.filter(function (d) { return DEALS[d].isLabel; });
    var sameSet = function (g, set) { return g.length === set.length && g.every(function (d) { return set.indexOf(d) !== -1; }); };
    var groupName = function (g) {
      if (g.length === DEAL_ORDER.length) return 'every route';
      if (sameSet(g, indieDeals)) return indieDeals.length === 2 ? 'both indie deals' : 'all the indie deals';
      if (sameSet(g, labelDeals)) return 'all the label deals';
      return joinNames(g.map(function (d) { return DEALS[d].verdictName; }));
    };
    var ranking = groups.map(function (g, i) {
      var plural = g.length > 1;
      var res = results[g[0]];
      if (i === 0) return 'At ' + streamsPhrase(inp.streams) + ' streams, ' + groupName(g) + ' ' + outcome(res.earned, plural) + ' from your streams in year 1.';
      return capitalise(groupName(g)) + ' ' + outcome(res.earned, plural) + '.';
    });
    // Advances are mentioned separately: they're early payments of your own royalties
    var advances = DEAL_ORDER.filter(function (d) { return results[d].advance > 0; }).map(function (d) {
      var res = results[d];
      if (res.unearnedAdvance >= res.advance - 0.5) {
        return capitalise(DEALS[d].verdictName) + ' also pays ' + wholeMoney(res.advance) + ' upfront, which is an early payment of your own royalties.';
      }
      if (res.unearnedAdvance > 0.5) {
        return capitalise(DEALS[d].verdictName) + ' also pays ' + wholeMoney(res.advance) + ' upfront, an early payment of your own royalties; your streams have earned back all but ' + wholeMoney(res.unearnedAdvance) + ' of it.';
      }
      return capitalise(DEALS[d].verdictName) + '\'s ' + wholeMoney(res.advance) + ' advance is already earned back by these streams, so it\'s counted above.';
    });
    return ranking.concat(advances).join(' ');
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

  // What the indie label pays, and that it takes the loss
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

  function summaryMajor(res, inp) {
    var first = inp.majorAdvance > 0
      ? 'the label pays you ' + wholeMoney(inp.majorAdvance) + ' upfront, pays for the release and takes the loss if the song flops.'
      : 'the label pays for the release and takes the loss if the song flops.';
    if (res.debt <= 0) return 'If you sign a major-label deal: ' + first + ' With nothing to repay, your ' + pct(res.artistRate) + ' royalty is paid from the first stream.';
    var repays = inp.majorAdvance > 0 && inp.majorCosts > 0 ? 'the advance and ' + wholeMoney(inp.majorCosts) + ' of recording costs'
      : inp.majorAdvance > 0 ? 'the advance' : wholeMoney(inp.majorCosts) + ' of recording costs';
    var when = isFinite(res.breakEvenStreams)
      ? 'you aren\'t paid royalties until ' + streamsText(res.breakEvenStreams)
      : 'you\'d never be paid royalties with these settings';
    return 'If you sign a major-label deal: ' + first + ' It repays ' + repays + ' from your ' + pct(res.artistRate) + ' share first, so ' + when + '.';
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

  // Sliders show how far along they are (the filled part of the track)
  function paintSliders() {
    Array.prototype.forEach.call(document.querySelectorAll('input[type="range"]'), function (s) {
      var span = Number(s.max) - Number(s.min);
      s.style.setProperty('--fill', (span > 0 ? (Number(s.value) - Number(s.min)) / span * 100 : 0) + '%');
    });
  }
  document.addEventListener('input', paintSliders);

  // Available for testing in the browser
  window.RoyaltyCalculator = { calculate: calculate, streamsUntilAhead: streamsUntilAhead, readInputs: readInputs, render: render,
                               tag: tag, esc: esc, paintSliders: paintSliders };

  if (el('streams')) {
    setUp();
    render();
    paintSliders();
  }
})();
