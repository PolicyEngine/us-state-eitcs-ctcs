# External benchmarks: populace-us vs old per-state enhanced CPS (2025 impacts)

Internal validation of the dashboard's state EITC/CTC cost estimates against
official external figures. Not for the dashboard — reference only.

**Benchmark sources** (collected 2026-07-06): state tax expenditure reports,
legislative fiscal notes, revenue department claim statistics, and an
independent IRS SOI cross-check (federal EITC claimed by state × statutory
match rate). "Populace" = `policyengine/populace-us` national dataset
(policyengine-us 1.765.6); "old" = per-state `policyengine-us-data` files
(policyengine-us 1.633.2). Ratios are model ÷ official benchmark.

## Headline

| metric | populace | old per-state ECPS |
|---|---|---|
| EITCs within ±20% of official | **24 / 29** | 14 / 29 |
| CTCs within ±20% of official | **10 / 15** | 3 / 15 |
| EITC mean abs. log error | **0.14** | 0.31 |
| CTC mean abs. log error | **0.20** | 0.67 |
| MN combined CTC+WFC (official $755.5M TY24) | **$790M (1.05)** | $1,328M (1.76) |

The populace rebuild moves nearly every state materially closer to official
figures. The biggest fixes vs the old data: MN CTC (1.84 → 1.04),
CO CTC incl. Family Affordability Credit (1.80 → 1.10), CA CalEITC
(1.58 → 0.92), OR Kids Credit (2.75 → 0.72), MD CTC (3.26 → 0.97),
NE (9.72 → 1.65, see caveat), VT EITC (1.85 → 1.10), WA WFTC (1.43 → 0.89).

## State EITCs

| state | official $M (source) | populace $M | ratio | old $M | old ratio |
|---|---|---|---|---|---|
| NY | 1,070 (TY25 forecast, NYS TER) | 1,025 | 0.96 | 846 | 0.79 |
| CA | 950 (CalEITC FY25-26, DOF TER) | 873 | 0.92 | 1,501 | 1.58 |
| NJ | 628 (FY27 est, NJ TER) | 574 | 0.91 | 627 | 1.00 |
| MI | 592 (TY24 implied, Treasury) | 533 | 0.90 | 440 | 0.74 |
| IL | 451 (FY25, Comptroller) | 558 | 1.24 | 491 | 1.09 |
| MD | 500 (FY24, MD TER) | 465 | 0.93 | 469 | 0.94 |
| CO | ~360 (at 50% match, LCS fiscal notes) | 335 | 0.93 | 444 | 1.23 |
| MA | 341–460 (FY25/FY26, DOR TEB) | 284 | 0.71 | 412 | 1.03 |
| CT | 235 (FY26, OFA TER) | 219 | 0.93 | 259 | 1.10 |
| PA | ~193 (new 10% credit TY25) | 191 | 0.99 | 191 | 0.99 |
| WA | 206 (TY24 actual refunds, DOR) | 184 | 0.89 | 294 | 1.43 |
| DC | ~115 (implied at 100% match TY25) | 112 | 0.97 | 120 | 1.05 |
| IN | 112.5 (FY24 est, OFMA) | 114 | 1.02 | 101 | 0.89 |
| NM | 136 (FY25 actual, TRD) | 112 | 0.82 | 126 | 0.93 |
| WI | 89 (FY23-24 actual, LFB) | 103 | 1.16 | 139 | 1.57 |
| OH | 57 (FY24, nonrefundable) | 94 | **1.65** | 42 | 0.74 |
| HI | 77 (TY23 claims at 40%, DOTAX) | 74 | 0.96 | 91 | 1.18 |
| KS | 76 (PY2024, KS DOR) | 72 | 0.94 | 77 | 1.01 |
| LA | 79 (FY24-25 actual, LDR) | 70 | 0.89 | 34 | 0.43 |
| IA | 72 (FY25 claims, IA DOR) | 61 | 0.85 | 67 | 0.93 |
| MO | 46 (CY25 issued at 20%, nonref) | 49 | 1.07 | 20 | 0.44 |
| OR | ~52 (TY23 prelim, LRO) | 46 | 0.89 | 66 | 1.27 |
| ME | 41 (FY26, MRS TER) | 41 | 0.99 | 60 | 1.46 |
| VT | 26 (FY24, JFO) | 29 | 1.10 | 48 | 1.85 |
| OK | 40 (TY22 actual, OTC) | 28 | **0.71** | 24 | 0.59 |
| NE | 30 (TY24 est, NE DOR) | 26 | 0.88 | 35 | 1.16 |
| RI | 31 (TY24 proj at 16%, ORA) | 25 | 0.82 | 35 | 1.14 |
| MT | ~14 (TY24 implied at 10%, LFD) | 15 | 1.05 | 22 | 1.60 |
| SC | 23 (FY24-25, nonrefundable) | 13 | **0.56** | 4 | 0.19 |

## State CTCs

| state | official $M (source) | populace $M | ratio | old $M | old ratio |
|---|---|---|---|---|---|
| NY | ~1,162 (ESCC 691 + expansion 471, TY25) | 1,293 | 1.11 | 1,496 | 1.29 |
| CO | ~1,033 (FATC ~880 full take-up + CO CTC ~153) | 1,139 | 1.10 | 1,860 | 1.80 |
| MN | 577 (TY24 actual claims, DOR) | 602 | 1.04 | 1,060 | 1.84 |
| CA | 413 (YCTC TY23 actual, FTB) | 587 | **1.42** | 750 | 1.82 |
| MA | 464 (FY26 full $440 credit, TEB) | 426 | 0.92 | 483 | 1.04 |
| NJ | 223 (FY25, NJ TER) | 248 | 1.11 | 331 | 1.48 |
| NM | 139 (FY25 actual, TRD) | 160 | 1.15 | 160 | 1.15 |
| IL | ~100 (TY25 at 40% of EITC, unofficial) | 127 | 1.27 | 108 | 1.08 |
| AZ | 144 (dependent credit used TY23, DOR) | 125 | 0.87 | 90 | 0.63 |
| ID | 66.5 (CY24, DFM) | 68 | 1.02 | 35 | 0.52 |
| OR | ~40 (Kids Credit, 2025-27 TER /2) | 29 | 0.72 | 110 | 2.75 |
| NE | ≤15 (statutory cap — see note) | 25 | **1.65** | 146 | 9.72 |
| VT | 25–32 (TY22 actual / FY proj, JFO) | 23 | 0.81 | 52 | 1.87 |
| MD | 17.9 (FY24, DLS fiscal note) | 17 | 0.97 | 58 | 3.26 |
| UT | ~11.9 (FY26 fiscal notes) | 7 | **0.55** | 4 | 0.34 |

## Caveats and flags

- **Take-up**: PolicyEngine assumes full take-up; official actuals embed real
  take-up (~75-90% for EITCs). Model ratios modestly above 1.0 can still be
  "right"; ratios near 0.9 vs actuals may indicate slight under-capture of
  eligible populations.
- **Non-refundable credits are the weak spot both ways**: OH (1.65 high),
  SC (0.56 low), UT (0.55 low). Cost depends on the distribution of state tax
  liability among EITC-income filers, which is hard to hit. Still better than
  the old data in every one of these cases except OH (old was 0.74).
- **CA YCTC (1.42)**: worth a look — the YCTC is limited to children under 6
  with CalEITC eligibility; possible over-capture of eligible families. Old
  data was worse (1.82).
- **NE (1.65)**: PolicyEngine models the LB 754 refundable child care credit
  without the $15M/yr statutory program cap; the old data missed the cap by
  ~10×, populace by ~1.65×. Model limitation, not a data issue.
- **IL (EITC 1.24, CTC 1.27)**: consistent overshoot; IL CTC is defined as a
  % of the state EITC so the errors are mechanically linked. IL expanded its
  EITC to ITIN filers/18-24/65+ (PA 102-0700) — benchmark includes this.
- **ME dependent exemption credit**: excluded from the CTC table — Maine only
  publishes the refundable increment ($18M) as a tax expenditure, not the
  full credit cost, so no comparable benchmark exists (we estimate $93M
  gross).
- **DC**: official $100M forecast assumes the 70% match; DC accelerated to
  100% for TY2025 (Nov 2025 act). Our $112M is consistent with the new law.
- **District-level numbers remain thin**: populace is calibrated to national
  targets ("national-only" release), ~500-2,600 households per state and
  ~50-120 per district. Costs are robust; district poverty cuts are noisy.

## Reproduce

- Model figures: `state_impacts_2025.csv` (this branch) vs
  `git show main:frontend/public/data/state_impacts_2025.csv`, reform types
  `EITCs` / `CTCs`, column `cost`.
- Full benchmark row data with per-figure source URLs: see the agent research
  logs from 2026-07-06 (session scratchpad `benchmark_comparison_2025.csv`).
