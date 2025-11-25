# Aid Flows D3 App

This single-page D3 project renders three visuals from AidData Core Level 1 v3.1:

- Donate vs. Receive scatterplot (log–log)
- Net Balance choropleth map (received − donated), diverging legend centered at zero
- Small multiples: Top 5 purposes by total received (five choropleths)

## Prerequisites

- Processed JSON files generated from the large `Full` CSV
- A simple static server to avoid browser file-access restrictions
- Internet access (page fetches world geometry from `world-atlas` CDN)

## Generate processed data

From repo root:

```
python -m venv .venv && source .venv/bin/activate
pip install pandas
python scripts/aggregate_aiddata.py \
  --full-csv AidDataCore_ResearchRelease_Level1_v3/AidDataCoreFull_ResearchRelease_Level1_v3.1.csv \
  --out-dir data/processed
```

This produces:
- `data/processed/country_totals.json`
- `data/processed/purposes_top5.json`

## Run locally

From repo root, start a static server and open the page:

```
python -m http.server 8000
# then navigate to http://localhost:8000/viz/index.html
```

Notes
- The page requests `countries-110m.json` and `countries-110m.tsv` from `cdn.jsdelivr.net` (`world-atlas@2`).
- Aggregations use ISO2 codes from the Full CSV to join with map metadata.
- All raw CSVs remain read-only; processed JSONs are written to `data/processed/`.

## Files

- `viz/index.html` — layout and containers
- `viz/styles.css` — theming and responsive grid
- `viz/app.js` — D3 logic for all three visualizations
- `scripts/aggregate_aiddata.py` — chunked pandas aggregation

## Troubleshooting

- If some countries appear gray, they likely have no matching ISO2 in the `world-atlas` TSV or no data in the processed JSONs.
- If maps don’t load, ensure your browser can reach the CDN (internet required) and you’re serving files via HTTP (not `file://`).

