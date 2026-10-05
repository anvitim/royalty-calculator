# Royalty Calculator

A "who gets paid" calculator for UK music royalties: it shows where the money goes when a song is streamed. **Due 23 October 2026.**

It will cover:
- three deal types: self-released, indie label and major label;
- an Olivia Dean song as an estimated major-label case study;
- a cover-song scenario.

## About the owner

- No coding background. Explain everything in plain words, without jargon.
- Say clearly whenever you make a choice they didn't specify.
- Say which clicks or logins they need to do themselves, and when.

## How we work

1. **Agree rules first.** The rules for each scenario are written and agreed in `RULES.md` before anything is built.
2. **Tag every number.** Each number is labelled **FACT** or **ASSUMPTION**.
   - FACT means the linked source states that figure. Use UK sources and pounds where possible.
   - ASSUMPTION means an estimate, a typical figure, or a source figure applied to a situation it doesn't directly cover. Say why it's an assumption.
3. **Test before showing.** New work is checked against the worked examples in `RULES.md`, and the results are reported.
4. **Preview, then save.** The owner previews in their browser and approves before anything is saved to GitHub. Never commit or push without that approval.

## Decisions so far

- UK market only.
- The maths is the same for everyone, but the case studies and copy speak to women artists.
- Hosting is Vercel only, at https://royalty-calculator-nu.vercel.app. It republishes automatically whenever GitHub changes. Never set up other hosting (including GitHub Pages).

## Technical setup

- **The whole site is `index.html`:** one file, plain HTML/CSS/JavaScript, no outside libraries.
- **Design:** deep-sea, slate and muted-teal colours; light sans-serif type using fonts already on the device; slow animated water waves behind everything.
- **Headline:** stays on one line and shrinks to fit small screens.
- **Every number from `RULES.md`** lives in the `RULES` block in the `<script>` of `index.html`, each with its label, note and source.
- **The maths** is in `calculate(inputs)`, which takes a deal type (`self`, `royalty` or `profit`) and the settings, and works with or without the page. Test new work by calling it directly in the browser.
- **Wording:** `RULES.md` uses "they"; the case studies and site copy use "she".
- **Repository:** https://github.com/anvitim/royalty-calculator (public).
  - Commits use GitHub's private noreply email, not the owner's Gmail.
  - The GitHub CLI (`gh`) is installed at `~/.local/bin/gh`.

## Done

- Landing page.
- `RULES.md` for a self-released UK artist: per-stream value, percentage cuts, fixed costs, worked examples for 10,000 and 1 million streams.
- Self-released calculator, matching those worked examples.
- `RULES.md` section 5, independent label (approved and saved to GitHub):
  - royalty and profit-share deals;
  - £5,000 release costs in every deal, for a like-for-like comparison;
  - who pays and who carries the loss;
  - why the royalty deal takes about four times as many streams;
  - an optional cash advance;
  - sources: the IPO's *Music creators' earnings in the digital era* and the DCMS Committee's *Economics of music streaming*, both 2021.
- Indie-label calculator, approved and saved to GitHub, matching every worked example in sections 4 and 5. It has:
  - a choice of deal type;
  - adjustable settings: label distributor fee, royalty rate, profit split, release costs and cash advance;
  - streams needed before she's paid for the recording;
  - a side-by-side comparison of all three deals.

## Next

1. Major-label rules, with the Olivia Dean case study.
2. Cover-song scenario.
3. The owner's own domain.
4. A database.

## Parked ideas (don't start without being asked)

- Co-writer split scenario using public song credits, showing how much goes to women.
- An Indian market version.
