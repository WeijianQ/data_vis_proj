# Mapping Who Gives, Who Gains: A Geospatial View of Global Aid Flows

An interactive data visualization project exploring global development assistance patterns using AidData Core Research Release v3.1.

## Overview

This project provides three complementary visualizations to understand international aid flows:
1. **Donate vs. Receive Comparison** - Scatterplot showing which countries donate vs. receive more
2. **Geographic Patterns** - Choropleth map revealing regional donor/recipient clusters
3. **Top 5 Purposes by Geography** - Small-multiple maps showing how aid purposes distribute geographically

## Research Questions

- **RQ1**: Which countries donate vs. receive more, and by how much?
- **RQ2**: Do mostly-donor vs. mostly-recipient countries cluster geographically?
- **RQ3**: How do the top 5 purposes distribute geographically among recipients?

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
│   ├── aggregate_aiddata.py                # Data processing (pandas)
│   └── aggregate_aiddata_nopandas.py       # Alternative processing
├── viz/
│   ├── index.html                          # Main visualization page
│   ├── app.js                              # D3.js visualization logic
│   ├── styles.css                          # Styling
│   └── world/                              # TopoJSON geographic data
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
   # Using pandas (recommended)
   python scripts/aggregate_aiddata.py

   # Or without pandas
   python scripts/aggregate_aiddata_nopandas.py
   ```

   This generates aggregated JSON files in `data/processed/`

4. **Run the visualization**
   ```bash
   # Start a local web server
   cd viz
   python -m http.server 8000
   # Or use any other local server
   ```

   Open `http://localhost:8000` in your browser

## Data Processing

The processing scripts:
- Normalize country names to ISO2/ISO3 codes
- Aggregate donations by donor country
- Aggregate receipts by recipient country
- Calculate net balances (donated - received)
- Identify top 5 aid purposes globally
- Generate purpose-specific geographic distributions

Outputs are saved as JSON in `data/processed/`:
- `country_totals.json` - Donor/recipient totals and net balance
- `country_purposes_donated.json` - Purpose breakdown by donor
- `country_purposes_received.json` - Purpose breakdown by recipient
- `purposes_top5.json` - Top 5 global purposes
- `iso2_names.json` - Country name mappings

## Visualizations

Built with D3.js and TopoJSON for interactive geographic visualizations.

See `viz/README.md` for detailed visualization documentation.

## Dependencies

- Python 3.x
- pandas (optional, for data processing)
- Modern web browser with JavaScript enabled
- Local web server (for CORS compliance)

## License

Data: AidData Core Research Release Level 1 v3.1 (see `AidDataCore_ResearchRelease_Level1_v3/README.pdf` for terms)

## Authors

See `AGENTS.md` for contributor information.
