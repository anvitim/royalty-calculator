/* =====================================================================
   UNITED KINGDOM — rules and market settings for the calculator.

   Every number from the UK rules (RULES-UK.md) lives in RULES below.
   Change a value, label or source here and the UK calculator updates.
   label: 'FACT' (stated in the source) or 'ASSUMPTION' (an estimate, or
   a source figure applied to a situation it doesn't directly cover).
   Entries without a value tag a rule rather than a number.

   The shared maths and page code are in /assets/calculator.js.
   A new market (India, United States) gets its own file like this one.
   ===================================================================== */
(function () {
  var CMA_REPORT = 'https://www.gov.uk/government/publications/music-and-streaming-market-study-final-report/executive-summary';
  var CMA_FULL = 'https://assets.publishing.service.gov.uk/media/6384f43ee90e077898ccb48e/Music_and_streaming_final_report.pdf';
  var IPO_REPORT = 'https://assets.publishing.service.gov.uk/media/614c760fd3bf7f719095b5ad/music-creators-earnings-report.pdf';
  var DCMS_REPORT = 'https://publications.parliament.uk/pa/cm5802/cmselect/cmcumeds/50/5006.htm';

  var RULES = {
    // Value of a stream
    streamValueDefault:      { value: 0.9,   label: 'ASSUMPTION', note: 'Middle of the 0.8p–1.0p range worked out from 2024 UK streaming income and stream counts (BPI, ERA).' },

    // Percentage cuts
    serviceShare:            { value: 0.32,  label: 'FACT',       note: 'Streaming services kept 32% of UK streaming revenue in 2021 (CMA).', source: CMA_REPORT },
    recordingShare:          { value: 0.53,  label: 'FACT',       note: '53% of UK streaming revenue went to recording rights in 2021 (CMA).', source: CMA_REPORT },
    songwritingShare:        { value: 0.15,  label: 'FACT',       note: '15% of UK streaming revenue went to publishing rights in 2021 (CMA).', source: CMA_REPORT },
    distroKidCut:            { value: 0,     label: 'FACT',       note: 'DistroKid: "Keep 100% of earnings".', source: 'https://distrokid.com/pricing/' },
    cdBabyCut:               { value: 0.09,  label: 'FACT',       note: 'CD Baby keeps 9% of digital distribution revenue.', source: 'https://cdbaby.com/cd-baby-cost/' },
    prsHalf:                 { value: 0.5,   label: 'ASSUMPTION', note: 'Songwriting money split about half PRS, half MCPS for streaming. Not confirmed from a source.' },
    prsCost:                 { value: 0.093, label: 'ASSUMPTION', note: "PRS's cost-to-income ratio across all its income in 2022, applied to streaming.", source: 'https://www.cisac.org/Newsroom/society-news/prs-music-reports-record-breaking-revenues-and-distributions-collecting-ps964' },
    mcpsCost:                { value: 0.074, label: 'ASSUMPTION', note: "MCPS's average commission across all its income in 2021, applied to streaming.", source: 'https://www.prsformusic.com/press/2022/mcps-announces-2021-distributions-of-181-million-to-its-members' },
    spotifyMinStreams:       { value: 1000,  label: 'FACT',       note: 'On Spotify, a track needs 1,000 streams in 12 months to earn recording royalties.', source: 'https://artists.spotify.com/royalties-guide' },

    // Fixed costs
    distroKidYearlyUSD:      { value: 24.99, label: 'FACT',       note: 'DistroKid Musician plan, billed yearly.', source: 'https://distrokid.com/pricing/' },
    cdBabySingleUSD:         { value: 9.99,  label: 'FACT',       note: 'CD Baby one-off fee to release a single.', source: 'https://cdbaby.com/cd-baby-cost/' },
    cdBabyReleases:          { value: 1,     label: 'ASSUMPTION', note: 'Assumes one single is released in year 1.' },
    gbpPerUSD:               { value: 0.76,  label: 'ASSUMPTION', note: 'Exchange rate used to turn dollar prices into pounds; it changes over time.' },
    prsJoiningFee:           { value: 100,   label: 'FACT',       note: 'PRS one-off joining fee (seen in search results; check the link).', source: 'https://help.prsformusic.com/s/article/how-much-does-it-cost-to-join' },
    mcpsJoiningFee:          { value: 100,   label: 'FACT',       note: 'MCPS one-off joining fee (seen in search results; check the link).', source: 'https://help.prsformusic.com/s/article/how-much-does-it-cost-to-join' },

    // Independent label (starting values for the adjustable settings)
    releaseCosts:            { value: 5000,  label: 'ASSUMPTION', note: 'Cost of making and promoting a small release (recording, artwork, video, marketing). Real costs vary widely.' },
    labelDistributorFee:     { value: 0.20,  label: 'ASSUMPTION', note: "IPO: independent distributors keep 20% on average (p. 66). Assumed the same for a label's own distributor.", source: IPO_REPORT },
    royaltyRate:             { value: 0.25,  label: 'ASSUMPTION', note: 'IPO: "a 25% royalty has come to be regarded as average" for streaming (p. 66). No source gives an indie-only rate.', source: IPO_REPORT },
    profitSplit:             { value: 0.5,   label: 'FACT',       note: 'DCMS Committee: indie profit-share deals are "usually 50:50" (para 44).', source: DCMS_REPORT },
    advance:                 { value: 0,     label: 'ASSUMPTION', note: 'Default: no cash advance. An advance is added to the costs and paid back the same way.' },

    // Independent label: rules without a number
    royaltyRecoup:           { label: 'FACT',       note: 'Royalty deal: the advance and costs are earned out from the performer\'s royalties only (DCMS, para 45).', source: DCMS_REPORT },
    profitRecoup:            { label: 'FACT',       note: 'Profit-share deal: costs are earned out from total revenues before the profit is shared (DCMS, para 45).', source: DCMS_REPORT },
    advanceInProfitShare:    { label: 'ASSUMPTION', note: 'The sources don\'t single out the advance in a profit share; it is treated as one of the costs.' },
    notOutOfPocket:          { label: 'ASSUMPTION', note: 'The usual position: costs are "refunded from those royalties" (CMA para 2.26), not from the artist\'s pocket. Check the individual contract.', source: CMA_FULL },
    writeOffShare:           { value: 0.19,  label: 'FACT', note: '19% of AIM member labels write off unrecouped debt, after ten years on average (DCMS, para 46).', source: DCMS_REPORT },
    writeOffYears:           { value: 10,    label: 'FACT', note: '19% of AIM member labels write off unrecouped debt, after ten years on average (DCMS, para 46).', source: DCMS_REPORT },
    songwritingUnchanged:    { label: 'ASSUMPTION', note: 'Assumes you haven\'t also signed a publishing deal, so the songwriting money is the same as self-released.' },

    // Co-writers (every deal)
    yourSongwritingShare:    { value: 1,     label: 'ASSUMPTION', note: 'Default: you wrote the song alone. Co-writers split the songwriting money in shares they agree; the shares usually aren\'t public.' },

    // Major label (starting values for the adjustable settings)
    majorRoyaltyRate:        { value: 0.25,  label: 'ASSUMPTION', note: 'The IPO calls 25% the "average" for streaming (p. 66), and the CMA uses it in its own worked example. CMA averages for 2021: 23.3% new artists, 26.3% all UK artists, 27.0% the largest artists.', source: CMA_FULL },
    producerShare:           { value: 0.04,  label: 'ASSUMPTION', note: 'Producers usually get 3–5% (CMA para 2.73), paid from the first sale and out of the artist\'s rate. 4% is the IPO\'s figure (p. 147).', source: IPO_REPORT },
    majorAdvance:            { value: 50000, label: 'ASSUMPTION', note: 'The CMA\'s own worked example (Figure 2.7), which it calls indicative, not typical. The average new major-label advance in 2021 was £153,200 (Table 2.8).', source: CMA_FULL },
    majorRecordingCosts:     { value: 15667, label: 'ASSUMPTION', note: 'Recording costs charged back in the CMA\'s worked example (Figure 2.7). Advances, recording, tour support and video costs are typically charged back (footnote 101).', source: CMA_FULL },
    writerShareAfterPublisher: { value: 0.75, label: 'ASSUMPTION', note: 'IPO: writers\' royalties from publishers are "now commonly in the region of 75%-80%"; the IPO uses 75% (p. 132). Set to 100% for no publisher.', source: IPO_REPORT },

    // Major label: rules without a number
    majorNoDistributorFee:   { label: 'ASSUMPTION', note: 'The majors run their own distribution (CMA para 2.25), so no separate distributor fee is taken.', source: CMA_FULL },
    majorRecoup:             { label: 'FACT',       note: 'In the "advance and royalty" deal, the predominant major-label deal, the advance and costs are earned out from the performer\'s royalties only (DCMS, paras 44–45).', source: DCMS_REPORT },
    marketingNotCharged:     { label: 'FACT',       note: 'Marketing and advertising costs are "typically non-recoupable" (CMA footnote 102).', source: CMA_FULL },
    advanceKept:             { label: 'FACT',       note: 'The advance "will not need to be paid back" if it is never earned back (CMA para 2.77).', source: CMA_FULL },
    sonyPayThrough:          { label: 'FACT',       note: 'Sony pays through old unpaid balances on deals from before 2000 (DCMS, para 46).', source: DCMS_REPORT },
    prsDirectHalf:           { label: 'FACT',       note: 'PRS pays the writer 50% of the performance money directly; the publisher gets the other 50% (IPO, p. 64).', source: IPO_REPORT },
    publisherHandlesMcps:    { label: 'ASSUMPTION', note: 'With a publisher, the publisher deals with MCPS, so the writer pays only the PRS joining fee.' },

    // Case study: worldwide average value of one stream (low end of the range)
    worldStreamValue:        { value: 0.6,   label: 'ASSUMPTION', note: 'IFPI: record companies\' streaming income passed US$22bn in 2025; Luminate: 5.1 trillion audio streams. $22bn ÷ 5.1tn ÷ 0.53 × £0.76 ≈ 0.62p.', source: 'https://www.ifpi.org/global-music-report-2026-global-recorded-music-revenues-grow-6-4-as-record-companies-drive-innovation/' }
  };

  var r = function (key) { return RULES[key].value; };

  window.MARKET = {
    id: 'uk',
    name: 'United Kingdom',
    rules: RULES,

    // Money: symbol and number style, plus the unit used for the value of one stream
    currency: { symbol: '£', locale: 'en-GB' },
    streamValue: { min: 0.3, max: 1.5, step: 0.05, perUnit: 100, unit: 'p', defaultKey: 'streamValueDefault' },

    // Organisations that collect the songwriting money. A society without a shareKey takes the rest.
    societies: [
      { name: 'PRS',  shareKey: 'prsHalf', costKey: 'prsCost',  costName: 'PRS running costs', joinKey: 'prsJoiningFee' },
      { name: 'MCPS', shareKey: null,      costKey: 'mcpsCost', costName: 'MCPS commission',   joinKey: 'mcpsJoiningFee', publisherJoins: true }
    ],

    // Distributors a self-released artist can choose from, with their fees in pounds
    distributors: [
      {
        id: 'distrokid', name: 'DistroKid', cutKey: 'distroKidCut',
        feeYear1: function () { return r('distroKidYearlyUSD') * r('gbpPerUSD'); },
        feeLater: function () { return r('distroKidYearlyUSD') * r('gbpPerUSD'); },
        feeRow: function (tag) {
          return { name: 'DistroKid yearly fee', when: 'Every year',
            detail: '$' + r('distroKidYearlyUSD').toFixed(2) + tag('distroKidYearlyUSD') + ' a year, converted at $1 = £' + r('gbpPerUSD').toFixed(2) + tag('gbpPerUSD') };
        }
      },
      {
        id: 'cdbaby', name: 'CD Baby', cutKey: 'cdBabyCut',
        feeYear1: function () { return r('cdBabySingleUSD') * r('cdBabyReleases') * r('gbpPerUSD'); },
        feeLater: function () { return 0; },
        feeRow: function (tag) {
          return { name: 'CD Baby release fee', when: 'Year 1 only',
            detail: '$' + r('cdBabySingleUSD').toFixed(2) + tag('cdBabySingleUSD') + ' per single × ' + r('cdBabyReleases') + tag('cdBabyReleases') + ', converted at $1 = £' + r('gbpPerUSD').toFixed(2) + tag('gbpPerUSD') };
        }
      }
    ],

    // UK-specific sentence about labels cancelling old unpaid balances
    writeOffSentence: function (tag, pct) {
      return 'Only ' + pct(r('writeOffShare')) + tag('writeOffShare') + ' of independent labels in the trade body AIM write it off, after about ' + r('writeOffYears') + ' years on average.';
    },

    // UK-specific sentence about major labels and old unpaid balances
    majorWriteOffSentence: function (tag) {
      return 'Sony now pays through old unpaid balances on deals from before 2000' + tag('sonyPayThrough') + '.';
    },

    notCovered: 'PPL, YouTube, and streams outside the UK. Producer royalties are included only in the major-label deal'
  };
})();
