# Mapping Who Gives, Who Gains: A Geospatial View of Global Aid Flows

## Motivations
- Reveal global funding patterns across donors and recipients.
- Enhance transparency of financial flows by purpose and geography.
- Detect gaps, overlaps, and outliers to inform policy.

## Goal and Research Questions (RQ)
Goal: Design three complementary visualizations that explain who donates to whom, where funds flow geographically, and how purposes distribute.
- RQ1 (Viz 1): Which countries donate vs. receive more, and by how much?
- RQ2 (Viz 2): Do mostly-donor vs. mostly-recipient countries cluster geographically? Any neighbor contrasts?
- RQ3 (Viz 3): How do the top 5 purposes distribute geographically among recipients?

## Dataset Overview
AidData Core Research Release v3.1 (CSV). Schema fields used:
- `aiddata_id`, `aiddata_2_id`, `year`, `donor`, `recipient`, `commitment_amount_usd_constant`, `coalesced_purpose_code`, `coalesced_purpose_name`.
Scale: up to ~1.2B rows across files; use the Thin/DonorRecipientYear versions for prototyping, Full for final aggregates. Currency: constant USD. Years ~1947–2013. Example row: `2007, Qatar → United States, 5,501,003, purpose 16010 Social/ welfare services`.

## Proposed Methods
- Viz 1: Donate vs. Receive Comparison
  - Main: Scatterplot (log-log) with x=total donated, y=total received per country; diagonal indicates balance; color by region; size by GDP/pop (if available) or total flow.
  - Secondary: Ranked diverging bar chart of net balance (donated − received) with interactive filter by year or decade.
- Viz 2: Geographic Patterns & Neighbors
  - Choropleth of net balance per country (blue=receives more, orange=donates more); legend centered at zero.
  - Neighbor lens: on hover, outline neighbors and show mini compare card (country vs. neighbors: donate/receive ratio). Optionally, cluster by world region to reveal patterns.
- Viz 3: Top 5 Purposes by Geography
  - Small-multiple maps (5 panels), each choropleth by total received for that purpose.
  - Alternatives: proportional symbols per recipient (one map with purpose selector) or bivariate map if comparing two purposes.

## Data Processing Plan
- Normalize country names to ISO3 with a concordance; handle territories and aggregates.
- Aggregations:
  - Donate totals: group by `donor[, year]` sum `commitment_amount_usd_constant`.
  - Receive totals: group by `recipient[, year]` sum.
  - Net balance per country[, year] = donate − receive.
  - Purposes: compute global top-5 by frequency; then per-purpose recipient sums.
- Performance: `pd.read_csv(..., usecols=[...], chunksize=100_000)`; write tidy outputs to `data/processed/` (CSV/Parquet).

## Implementation Plan
1) Schema audit and ISO3 mapping. 2) Aggregation scripts and cached outputs. 3) Prototype visuals with sampled data. 4) Final visuals with full aggregates and interaction polish. 5) Validation and narrative.

## Expected Outcomes
- Three interactive visuals answering RQ1–RQ3 with clear legends and annotations.
- Reproducible preprocessing scripts and processed datasets.
- Insights on donor/recipient outliers, regional clusters, and purpose-specific geographic distributions.
