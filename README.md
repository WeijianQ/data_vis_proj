# Mapping Who Gives, Who Gains: A Geospatial View of Global Aid Flows

An interactive data visualization dashboard exploring global development assistance patterns using AidData Core Research Release v3.1.

## Overview

This project provides four complementary visualizations in a 2x2 dashboard layout to understand international aid flows:
1. **Donate vs. Receive Comparison** - Log-log scatterplot showing which countries donate vs. receive more, with click-to-view purpose breakdowns
2. **Net Balance Map** - Choropleth map revealing geographic patterns of net donors (red) vs. net recipients (blue) using a symmetric log scale
3. **Top 5 Purposes by Geography** - Interactive map with dropdown selector showing how aid purposes distribute geographically, with top recipients and regional distribution panels
4. **Aid Flow Network** - Chord diagram showing bilateral aid flows between the top 15 donors and top 25 recipients

## Research Questions

- **RQ1**: Which countries donate vs. receive more, and by how much?
- **RQ2**: Do mostly-donor vs. mostly-recipient countries cluster geographically? Any neighbor contrasts?
- **RQ3**: How do the top 5 purposes distribute geographically among recipients?
- **RQ4**: What are the dominant aid pathways between donor and recipient countries?

## Dataset

**AidData Core Research Release Level 1 v3.1**
- Source: [AidData](https://www.aiddata.org/)
- Coverage: ~1947–2013
- Currency: Constant USD
- Key fields: donor, recipient, year, commitment_amount_usd_constant, coalesced_purpose_code/name

The raw data files are stored in `AidDataCore_ResearchRelease_Level1_v3/` and should be obtained separately due to their large size (see Installation).

## Project Structure

```
data_vis_proj/
├── AidDataCore_ResearchRelease_Level1_v3/  # Raw AidData CSV files (not in git)
├── data/
│   └── processed/                          # Aggregated JSON datasets
├── scripts/
│   └── aggregate_aiddata.py                # Data processing script (pandas)
├── viz/
│   ├── index.html                          # Main dashboard page
│   ├── app.js                              # D3.js visualization logic
│   └── styles.css                          # Dashboard styling
├── PROPOSAL.md                             # Project proposal
└── README.md                               # This file
```

## Installation

1. **Clone this repository**
   ```bash
   git clone <repository-url>
   cd data_vis_proj
   ```

2. **Obtain the AidData dataset**
   - Download AidData Core Research Release Level 1 v3.1 from [AidData](https://www.aiddata.org/)
   - Extract to `AidDataCore_ResearchRelease_Level1_v3/` directory

3. **Process the data**
   ```bash
   python scripts/aggregate_aiddata.py
   ```

   This generates aggregated JSON files in `data/processed/`

4. **Run the visualization**
   ```bash
   # Start a local web server from the project root directory
   python -m http.server 8001
   ```

   Open `http://localhost:8001/viz/` in your browser

## Data Processing

The processing script (`scripts/aggregate_aiddata.py`):
- Reads the large AidData CSV in memory-efficient chunks
- Normalizes country names to ISO2 codes
- Aggregates donations by donor country
- Aggregates receipts by recipient country
- Calculates net balances (received - donated)
- Identifies top 5 aid purposes globally
- Generates purpose-specific geographic distributions
- Builds bilateral flow matrix for chord diagram

Outputs are saved as JSON in `data/processed/`:
- `country_totals.json` - Donor/recipient totals and net balance per country
- `country_purposes_donated.json` - Purpose breakdown by donor
- `country_purposes_received.json` - Purpose breakdown by recipient
- `purposes_top5.json` - Top 5 global purposes with per-country amounts
- `iso2_names.json` - Country name mappings
- `top_donors_by_recipient_purpose.json` - Top 3 donors for each recipient-purpose pair
- `chord_flows.json` - Bilateral flow matrix for chord diagram (top 15 donors, top 25 recipients)

## Visualizations

Built with D3.js v7 and TopoJSON for interactive geographic visualizations.

### Features
- **Scatter Plot**: Log-log scale, y=x reference line, click on any country to see purpose breakdown (both donated and received)
- **Net Balance Map**: Symmetric log color scale, diagonal hatching for no-data countries, hover to see neighbor relationships
- **Purpose Maps**: Dropdown selector for 5 purposes, log color scale, top 5 recipients list, regional distribution bar chart
- **Chord Diagram**: Interactive bilateral flows, hover on arcs to highlight connections, filter toggle to hide small flows

## Dependencies

- Python 3.x with pandas
- Modern web browser with JavaScript enabled
- Local web server (for loading JSON data files)

## License

Data: AidData Core Research Release Level 1 v3.1 (see `AidDataCore_ResearchRelease_Level1_v3/README.pdf` for terms)

## Authors

See `AGENTS.md` for contributor information.
