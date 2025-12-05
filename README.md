# Global Aid Data: Donors, Recipients, Purposes, and Geographic and Temporal Trends

An interactive data visualization dashboard exploring global development assistance patterns using AidData Core Research Release v3.1.

## Overview

This project provides five complementary visualizations in a dashboard layout to understand international aid flows:

1. **Which countries donate vs. receive more?** - Log-log scatterplot with country dropdown selector and purpose breakdown bar charts
2. **Are there geographic trends for donors vs. recipients?** - Choropleth map showing net balance (received − donated) with diverging color scale
3. **Who gives to whom?** - Chord diagram showing bilateral aid flows between top 10 donors and top 10 recipients
4. **How do aid purposes distribute geographically?** - Interactive choropleth with purpose selector showing geographic distribution of aid by category
5. **Have aid purposes changed over time?** - Stacked area chart showing evolution of aid distribution across purposes (1973–2013)

## Dataset

**AidData Core Research Release Level 1 v3.1**
- Source: [AidData](https://www.aiddata.org/)
- Coverage: ~1947–2013
- Currency: Constant USD
- Key fields: donor, recipient, year, commitment_amount_usd_constant, coalesced_purpose_code/name

The raw data files are stored in `AidDataCore_ResearchRelease_Level1_v3/` and should be obtained separately due to their large size.

## Project Structure

```
data_vis_proj/
├── AidDataCore_ResearchRelease_Level1_v3/  # Raw AidData CSV files (not in git)
├── data/
│   └── processed/                          # Aggregated JSON datasets
├── scripts/
│   ├── aggregate_aiddata.py                # Main data processing script
│   └── aggregate_temporal.py               # Temporal data aggregation
├── viz/
│   ├── index.html                          # Main dashboard page
│   ├── app.js                              # D3.js visualization logic
│   ├── styles.css                          # Dashboard styling
│   └── world/                              # Local fallback map data
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

3. **Process the data** (requires Python 3.x with pandas)
   ```bash
   python scripts/aggregate_aiddata.py
   python scripts/aggregate_temporal.py
   ```

   This generates aggregated JSON files in `data/processed/`

4. **Run the visualization**
   ```bash
   # Start a local web server from the project root directory
   python -m http.server 8001
   ```

   Open `http://localhost:8001/viz/` in your browser

## Data Processing

The processing scripts generate the following JSON files in `data/processed/`:

| File | Description |
|------|-------------|
| `country_totals.json` | Donor/recipient totals and net balance per country |
| `country_purposes_donated.json` | Purpose breakdown by donor country |
| `country_purposes_received.json` | Purpose breakdown by recipient country |
| `purposes_top5.json` | Top 5 global purposes with per-country amounts |
| `top_donors_by_recipient_purpose.json` | Top 3 donors for each recipient-purpose pair |
| `chord_flows.json` | Bilateral flow matrix for chord diagram |
| `temporal_purposes.json` | Yearly aid totals by purpose for temporal chart |

## Visualizations

Built with D3.js v7 and TopoJSON for interactive geographic visualizations.

### Features
- **Scatter Plot**: Log-log scale, y=x reference line, country dropdown selector, click/select to see purpose breakdown
- **Net Balance Map**: Symmetric log color scale, hatching for no-data countries, hover for details
- **Chord Diagram**: Interactive bilateral flows, hover for exact amounts and direction, filter toggle for small flows
- **Purpose Maps**: Dropdown selector for top 5 purposes, log color scale, regional distribution analysis
- **Temporal Chart**: Stacked area chart, toggle between absolute and percentage view, hover for yearly details

## Dependencies

- Python 3.x with pandas (for data processing)
- Modern web browser with JavaScript enabled
- Local web server (for loading JSON data files)

## License

Data: AidData Core Research Release Level 1 v3.1 (see `AidDataCore_ResearchRelease_Level1_v3/README.pdf` for terms)
