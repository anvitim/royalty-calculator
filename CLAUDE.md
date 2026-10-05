# The economics of a song

**Site name: "The economics of a song"**, with the line "Who earns when a song is played?" underneath. Use the name as the homepage headline and in every page's browser-tab title.

A "who gets paid" calculator for music royalties: it shows where the money goes when a song is streamed, told through women artists, with maths that is the same for everyone. **UK version due 23 October 2026.**

It will cover:
- three markets: the United Kingdom (live), India and the United States (coming soon);
- in the UK: self-released, indie-label and major-label deals;
- an Olivia Dean case study, estimating a typical major-label deal;
- a cover-song scenario.

## About the owner

- No coding background. Explain everything in plain words, without jargon.
- Say clearly whenever you make a choice they didn't specify.
- Say which clicks or logins they need to do themselves, and when.
- Work in the phases they set, and stop where they say.

## How we work

1. **Agree rules first.** Each market's rules are written and agreed in its own rules file (`RULES-UK.md`; India will get `RULES-INDIA.md`) before anything is built.
2. **Tag every number.** Each number is labelled **FACT** or **ASSUMPTION**.
   - FACT means the linked source states that figure. Use the market's own sources and currency where possible.
   - ASSUMPTION means an estimate, a typical figure, or a source figure applied to a situation it doesn't directly cover. Say why it's an assumption, and how uncertain it is. An honest gap is better than a confident guess.
3. **Test before showing.** New work is checked against the worked examples in the rules file, and the results are reported.
4. **Preview, then save.** The owner previews in their browser and approves before anything is saved to GitHub. Never commit or push without that approval.

## Decisions so far

- Each market has its own rules, organisations and currency. India and the US will differ from the UK.
- The maths is the same for everyone, but the case studies and copy speak to women artists.
- Hosting is Vercel only, at https://royalty-calculator-nu.vercel.app. It republishes automatically whenever GitHub changes. Never set up other hosting (including GitHub Pages).
- No file names (like `RULES-UK.md`) appear on the site; visitors see friendly wording and a link to the rules on GitHub.
- Olivia Dean's real contract is private. Her case study must say it estimates what a typical major-label deal would pay on a song with these streams and credits, and is not a statement of what anyone earned. It uses "Man I Need" and leads with shares of every £1. Pounds appear only as a range, and never next to a co-writer's name.
- **Olivia Dean is the only real-world case.** Every other case study uses an illustrative persona:
  - one fictional woman artist per deal type in each market;
  - clearly labelled as an illustration;
  - round, typical numbers;
  - never based on an identifiable real artist.

## How the site is organised

Plain HTML, CSS and JavaScript, with no outside libraries. Pages use addresses starting with `/`, so preview them with the local server: start `site` from `.claude/launch.json` (port 8137), not by opening the file directly.

| Address | File | What it is |
|---|---|---|
| `/` | `index.html` | Homepage: headline, intro, "Try the UK calculator" button, market cards, "How the numbers work" |
| `/uk/` | `uk/index.html` | UK calculator and summary, with a card linking to the case study |
| `/uk/olivia-dean/` | `uk/olivia-dean/index.html` | Case study (placeholder for now) |
| `/india/` | `india/index.html` | India (placeholder for now) |

Shared files:
- **`assets/site.css`:** all the styling.
  - Colours: a brighter ocean gradient, a warm apricot accent for buttons and highlights, and dark cards for the calculator.
  - Text: light sans-serif type using fonts already on the device.
- **`assets/site.js`:** used by every page. It adds the animated waves and keeps the headline on one line, centred, shrinking to fit.
- **`assets/calculator.js`:** the shared maths and page code for every market. It has no country-specific numbers.
  - `calculate(inputs)` does the maths and works without the page. Test it in the browser with `RoyaltyCalculator.calculate(...)`.
  - The deal types are listed in `DEALS` and `DEAL_ORDER`.
  - The summary uses fixed sentence templates with no AI service. It describes results and never advises which deal to choose.
- **`markets/uk.js`:** the UK rules block. Every UK number, with its FACT/ASSUMPTION label, note and source, is in `RULES`. The file also holds:
  - the currency (£, and pence for the value of a stream);
  - the collecting societies (PRS, MCPS);
  - the distributors (DistroKid, CD Baby) and their fees;
  - UK-specific wording.
- **A new market:** add `markets/<market>.js` in the same shape and a page that loads it before `calculator.js`.
- **Adding a deal (e.g. major label):**
  1. Add a branch in `calculate()`.
  2. Add an entry in `DEALS` with its summary template, and its id to `DEAL_ORDER`.
  3. Add a radio button on the page, and its settings.

  The comparison table and summary pick it up automatically.

**Wording:**
- Rules files use "they".
- The calculator and its summary speak to the reader as "you".
- Case studies (such as Olivia Dean) use "she".

**Repository:** https://github.com/anvitim/royalty-calculator (public).
- Commits use GitHub's private noreply email, not the owner's Gmail.
- The GitHub CLI (`gh`) is installed at `~/.local/bin/gh`.

## Done

- **UK rules (`RULES-UK.md`):**
  - self-released, with worked examples for 10,000 and 1 million streams;
  - section 5, independent label: royalty and profit-share deals, and the same £5,000 release costs in every deal for a like-for-like comparison;
  - who pays and who carries the loss;
  - why the royalty deal takes about four times as many streams;
  - an optional cash advance;
  - break-even figures;
  - sources: the CMA, the IPO and the DCMS Committee.
- **UK calculator:**
  - three deal types, with adjustable settings and a side-by-side comparison;
  - an "In summary" section, with the verdict first;
  - matches every worked example.
- **Phase 1 site structure** (approved and saved to GitHub):
  - homepage, UK page, and the two placeholder pages;
  - shared calculator logic, with a separate rules block for each market;
  - rules file renamed to `RULES-UK.md`.

## Roadmap

1. **Phase 1, homepage and structure:** done.
2. **Phase 2, UK major-label rules:** write, don't build.
   - Royalty rate, advance, which costs are charged back, a publisher's share of the songwriting money, and co-writers splitting the songwriting share.
   - Prepare the Olivia Dean case study: three most-streamed songs, each with its Spotify count and the date checked, its credited writers and label, all sourced. Ask the owner to read counts from Spotify if they can't be read reliably.
   - State the assumption needed to apply UK rules to a worldwide, Spotify-only count.
   - Stop and show the owner.
3. **Phase 3, India rules:** write, don't build.
   - `RULES-INDIA.md` for an independent, non-film, self-released artist, in rupees, naming the Indian organisations.
   - Label anything unsourced as ASSUMPTION and say how uncertain it is.
   - Stop; the owner chooses the case-study artist.
4. **Later:** build the major-label calculator and the case study, a cover-song scenario, the owner's own domain, a database, and the United States.

## Parked ideas (don't start without being asked)

- Co-writer split scenario using public song credits, showing how much goes to women.
