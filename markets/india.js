/* =====================================================================
   INDIA — rules and market settings for the calculator.

   Every number from the India rules (RULES-INDIA.md) lives in RULES below.
   Change a value, label or source here and the India calculator updates.
   label: 'FACT' (stated in the source) or 'ASSUMPTION' (an estimate, or
   a source figure applied to a situation it doesn't directly cover).
   Entries without a value tag a rule rather than a number.

   The shared maths are in /assets/calculator.js (calculate()), and the
   India page code is in /assets/calculator-india.js.
   ===================================================================== */
(function () {
  var SPOTIFY_ROYALTIES = 'https://artists.spotify.com/royalties-guide';
  var IPRS_RULES = 'https://iprs.org/wp-content/uploads/2025/02/Distribution-Rules-Methods.pdf';
  var IPRS_TRANSPARENCY = 'https://iprs.org/wp-content/uploads/2025/08/Annual-Transparency-Report-FY2024-25.pdf';
  var IPRS_JOIN = 'https://iprs.org/join-as-author-composer/';
  var TUNECORE_PRICING = 'https://www.tunecore.com/en-in/pricing';
  var DISTROKID = 'https://distrokid.com/pricing/';
  var MBW_REPORT = 'https://www.musicbusinessworldwide.com/india-added-nearly-4m-paid-music-streaming-subscriptions-in-2025-taking-its-total-to-14-4m-according-to-new-report/';

  var RULES = {
    // Value of a stream (rupees per stream)
    streamValueDefault:      { value: 0.018, label: 'ASSUMPTION', note: 'Very uncertain; the least certain number here. India publishes no average rate per stream. Worked from paid streams (about ₹0.063 each, from ₹1,030 crore of subscription income over about 16,400 crore paid streams) and a guess that a free stream earns a fifth as much, with 10% of an artist\'s streams from paying listeners. The range ₹0.009–₹0.034 is a low case (5% paying listeners, a free stream worth a tenth of a paid one) and a high case (30% paying, a free stream worth a third); if an artist\'s listeners were as free-heavy as India overall it could be nearer ₹0.008. The slider runs from ₹0.005 to ₹0.065, the most a stream could be worth if every one came from a paying listener.', source: MBW_REPORT },
    streamValueLow:          { value: 0.009, label: 'ASSUMPTION', note: 'Low case: 5% of streams from paying listeners, and a free stream worth a tenth of a paid one. If an artist\'s listeners were as free-heavy as India overall, it could be nearer ₹0.008.' },
    streamValueHigh:         { value: 0.034, label: 'ASSUMPTION', note: 'High case: 30% of streams from paying listeners, and a free stream worth a third of a paid one.' },
    streamValueCeiling:      { value: 0.065, label: 'ASSUMPTION', note: 'The most a stream could be worth: every stream from a paying listener (about ₹0.063).' },
    streamValueFloor:        { value: 0.005, label: 'ASSUMPTION', note: 'The slider\'s lowest setting, below the low case, in case an artist\'s listeners are mostly free.' },

    // Percentage cuts
    serviceShare:            { value: 1 / 3,   label: 'ASSUMPTION', note: 'Spotify says about two-thirds of its music revenue goes to rights-holders, worldwide. Assumed to hold for every service in India; the others publish nothing I found.', source: SPOTIFY_ROYALTIES },
    recordingShare:          { value: 8 / 15,  label: 'ASSUMPTION', note: 'Four-fifths of the two-thirds that goes to rights-holders (Spotify, worldwide), applied to India.', source: SPOTIFY_ROYALTIES },
    songwritingShare:        { value: 2 / 15,  label: 'ASSUMPTION', note: 'One-fifth of the two-thirds that goes to rights-holders (Spotify, worldwide), applied to India. Whether IPRS receives money in this proportion is not known. It also assumes a writer who owns and publishes her own song receives all of it; one IPRS rule could mean only half arrives unless she also joins as a publisher (₹2,200), which would halve this figure.', source: SPOTIFY_ROYALTIES },
    distroKidCut:            { value: 0,       label: 'FACT',       note: 'DistroKid: "100% of earnings".', source: DISTROKID },
    tuneCoreCut:             { value: 0,       label: 'FACT',       note: 'TuneCore India: "you keep 100% of your royalties". It takes a separate 20% on money from TikTok, Facebook, Instagram and YouTube, which this page leaves out.', source: TUNECORE_PRICING },
    iprsCost:                { value: 0.052,   label: 'ASSUMPTION', note: 'IPRS spent ₹38.7 crore of its ₹741.6 crore income on running costs in 2024-25, across all its income, not streaming alone.', source: IPRS_TRANSPARENCY },
    spotifyMinStreams:       { value: 1000,    label: 'FACT',       note: 'On Spotify, a track needs 1,000 streams in 12 months to earn recording royalties. Stated worldwide; not confirmed for India.', source: SPOTIFY_ROYALTIES },

    // Fixed costs
    tuneCoreSingle:          { value: 1599,    label: 'FACT',       note: 'TuneCore India, one single, before GST.', source: TUNECORE_PRICING },
    tuneCorePlan:            { value: 1599,    label: 'FACT',       note: 'TuneCore India "Rising Artist" plan, unlimited releases, a year, before GST.', source: TUNECORE_PRICING },
    distroKidYearlyUSD:      { value: 24.99,   label: 'FACT',       note: 'DistroKid Musician plan, billed yearly, in US dollars. It shows no rupee price.', source: DISTROKID },
    inrPerUSD:               { value: 87,      label: 'ASSUMPTION', note: 'Exchange rate used to turn dollar prices into rupees, the rate implied by a news report (₹1,030 crore = US$118.2 million). Today\'s rate will differ.', source: MBW_REPORT },
    gstRate:                 { value: 0.18,    label: 'ASSUMPTION', note: 'GST on the distributor\'s fee. TuneCore says only that "applicable GST charges will be added". The GST Council\'s service rate schedule gives 18% for the general headings; which heading music distribution is filed under is unconfirmed.', source: 'https://gstcouncil.gov.in/sites/default/files/2024-02/gstservicerates.pdf' },
    gstNotForDistroKid:      { label: 'ASSUMPTION', note: 'GST on DistroKid\'s fee isn\'t worked out here, so its figure is before any GST.' },
    iprsJoiningFee:          { value: 1200,    label: 'FACT',       note: 'IPRS\'s one-time application processing fee for authors and composers, paid online (₹2,200 for publishers). Paid only if you join, and only in year 1. The owner read it on IPRS\'s own page on 6 October 2026. The page doesn\'t mention GST on it, so none is added.', source: IPRS_JOIN },
    releaseCosts:            { value: 0,       label: 'ASSUMPTION', note: 'Starts at ₹0, with no suggested figure: I found no source for a typical cost of making and promoting a release (recording, artwork, marketing). Enter your own.' },
    singleOneOff:            { label: 'ASSUMPTION', note: 'TuneCore\'s page shows "/year" on its plans but not on the single, which suggests a one-off price. Whether the single renews each year is unconfirmed.', source: TUNECORE_PRICING },

    // IPRS
    iprsHoldYears:           { value: 3,       label: 'FACT',       note: 'IPRS holds a non-member\'s share for up to three years, and pays it if they join in time; otherwise it goes back into the pool.', source: IPRS_RULES },
    iprsRegisterSongs:       { label: 'FACT',       note: 'Joining isn\'t enough. IPRS matches what each service reports against the songs in its database and holds back what it can\'t match (its rules). Its joining page says that after you join, IPRS sends a format for registering your works. I haven\'t seen the portal steps themselves.', source: IPRS_JOIN },
    songwritingAllToWriter:  { label: 'ASSUMPTION', note: 'A writer member who owns and publishes her own song is assumed to receive all of the songwriting money. IPRS\'s "Original Self Published Works" split (composer 50%, lyricist 50%, no publisher share) supports this. But its "Authors Statutory Royalty" clause, for works whose owner-publisher isn\'t a member, could mean only the writer\'s half arrives unless she also joins as a publisher (₹2,200). In that case the songwriting figure would be halved. A question to ask IPRS.', source: IPRS_RULES },
    songwritingUnclaimed:    { label: 'FACT',       note: 'IPRS pays only its members. Its rules hold the share of a non-member for up to three years.', source: IPRS_RULES },
    iprsPays:                { label: 'FACT',       note: 'Streaming services pay IPRS under licences, and IPRS pays its members four times a year.', source: IPRS_RULES }
  };

  var r = function (key) { return RULES[key].value; };

  window.MARKET = {
    id: 'india',
    name: 'India',
    rules: RULES,

    // Money: symbol and number style (lakh and crore grouping), and the value of one stream, in rupees
    currency: { symbol: '₹', locale: 'en-IN' },
    streamValue: { min: r('streamValueFloor'), max: r('streamValueCeiling'), step: 0.001, perUnit: 1, unit: '', defaultKey: 'streamValueDefault' },

    // The one organisation that collects the songwriting money. It takes the whole songwriting share.
    societies: [
      { name: 'IPRS', shareKey: null, costKey: 'iprsCost', costName: 'IPRS running costs', joinKey: 'iprsJoiningFee' }
    ],

    // Distributors, with fees in rupees (GST added where the rules work it out)
    distributors: [
      {
        id: 'tunecore-single', name: 'TuneCore India, one single', cutKey: 'tuneCoreCut',
        feeYear1: function () { return r('tuneCoreSingle') * (1 + r('gstRate')); },
        feeLater: function () { return 0; },
        // If the single turns out to renew each year, later years cost the same as year 1
        feeLaterIfRenews: function () { return r('tuneCoreSingle') * (1 + r('gstRate')); },
        feeKeys: ['tuneCoreSingle', 'gstRate'],
        feeRow: function (tag, money) {
          return { name: 'TuneCore India single', when: 'Year 1',
            detail: money(r('tuneCoreSingle')) + tag('tuneCoreSingle') + ' + ' + Math.round(r('gstRate') * 100) + '% GST' + tag('gstRate') + ' (' + money(r('tuneCoreSingle') * r('gstRate')) + '). A one-off price' + tag('singleOneOff') };
        }
      },
      {
        id: 'tunecore-plan', name: 'TuneCore India, unlimited plan', cutKey: 'tuneCoreCut',
        feeYear1: function () { return r('tuneCorePlan') * (1 + r('gstRate')); },
        feeLater: function () { return r('tuneCorePlan') * (1 + r('gstRate')); },
        feeRow: function (tag, money) {
          return { name: 'TuneCore India unlimited plan', when: 'Every year',
            detail: money(r('tuneCorePlan')) + tag('tuneCorePlan') + ' a year + ' + Math.round(r('gstRate') * 100) + '% GST' + tag('gstRate') + ' (' + money(r('tuneCorePlan') * r('gstRate')) + ')' };
        }
      },
      {
        id: 'distrokid', name: 'DistroKid', cutKey: 'distroKidCut',
        feeYear1: function () { return r('distroKidYearlyUSD') * r('inrPerUSD'); },
        feeLater: function () { return r('distroKidYearlyUSD') * r('inrPerUSD'); },
        feeRow: function (tag) {
          return { name: 'DistroKid yearly fee', when: 'Every year',
            detail: '$' + r('distroKidYearlyUSD').toFixed(2) + tag('distroKidYearlyUSD') + ' a year, converted from dollars at $1 = ₹' + r('inrPerUSD') + tag('inrPerUSD') + ' and shown before any GST' + tag('gstNotForDistroKid') + ', so it isn\'t like-for-like with the TuneCore figures, which include GST' };
        }
      }
    ],

    notCovered: 'YouTube and short-video apps, film music, radio, TV and live shows, ringback tones and sync, income tax and tax taken off IPRS payments, and streams outside India'
  };
})();
