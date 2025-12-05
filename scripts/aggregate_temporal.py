"""Aggregate AidData Core by year and purpose for temporal visualization.

Outputs under data/processed/:
- temporal_purposes.json: { years: [...], purposes: [...], data: [[year, purpose, amount], ...] }

Usage:
  python scripts/aggregate_temporal.py \
    --full-csv AidDataCore_ResearchRelease_Level1_v3/AidDataCoreFull_ResearchRelease_Level1_v3.1.csv
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import pandas as pd


def aggregate_temporal(full_csv: Path, out_dir: Path, chunksize: int = 250_000) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # Running totals: (year, purpose) -> amount
    year_purpose_totals: dict[tuple[int, str], float] = defaultdict(float)
    # Global purpose totals (to find top purposes)
    purpose_totals: dict[str, float] = defaultdict(float)

    usecols = [
        "year",
        "commitment_amount_usd_constant",
        "coalesced_purpose_name",
    ]

    # Count total lines and skip the last (potentially corrupted) line
    with open(full_csv, 'r') as f:
        total_lines = sum(1 for _ in f)
    nrows = total_lines - 2  # -1 for header, -1 for last line

    print(f"Processing {nrows:,} rows from {full_csv}...")

    # Read in memory-efficient chunks
    for i, chunk in enumerate(pd.read_csv(
        full_csv,
        usecols=usecols,
        chunksize=chunksize,
        nrows=nrows,
        dtype={
            "year": "Int64",
            "commitment_amount_usd_constant": "float64",
            "coalesced_purpose_name": "string",
        },
        on_bad_lines="skip",
    )):
        if i % 5 == 0:
            print(f"  Processing chunk {i + 1}...")

        # Drop rows with missing critical fields
        c = chunk.dropna(subset=["year", "commitment_amount_usd_constant"]).copy()

        # Filter to valid years (1947-2013 range)
        c = c[(c["year"] >= 1947) & (c["year"] <= 2020)]

        # Fill NA purpose with placeholder
        c["coalesced_purpose_name"] = c["coalesced_purpose_name"].fillna("Unspecified")

        # Aggregate by (year, purpose)
        grp = (
            c.groupby(["year", "coalesced_purpose_name"])
            ["commitment_amount_usd_constant"]
            .sum()
        )
        for (year, purpose), val in grp.items():
            year_purpose_totals[(int(year), str(purpose))] += float(val)
            purpose_totals[str(purpose)] += float(val)

    print("Aggregation complete. Building output...")

    # Get top 10 purposes by total amount
    top_purposes = sorted(purpose_totals.items(), key=lambda kv: kv[1], reverse=True)[:10]
    top_purpose_names = [p for p, _ in top_purposes]

    # Get all years present in data
    all_years = sorted(set(year for year, _ in year_purpose_totals.keys()))

    # Filter to years with meaningful data (1995+ has much more coverage)
    # But include earlier years for context
    min_year = min(all_years)
    max_year = max(all_years)

    print(f"Year range: {min_year} - {max_year}")
    print(f"Top 10 purposes: {top_purpose_names}")

    # Build data structure for D3
    # Format: array of {year, purpose, amount} for stacked area chart
    data = []
    for year in all_years:
        for purpose in top_purpose_names:
            amount = year_purpose_totals.get((year, purpose), 0.0)
            data.append({
                "year": year,
                "purpose": purpose,
                "amount": round(amount, 2)
            })

    # Also compute "Other" category (all purposes not in top 10)
    for year in all_years:
        other_amount = 0.0
        for (y, purpose), val in year_purpose_totals.items():
            if y == year and purpose not in top_purpose_names:
                other_amount += val
        data.append({
            "year": year,
            "purpose": "Other",
            "amount": round(other_amount, 2)
        })

    # Add "Other" to purpose list
    all_purposes = top_purpose_names + ["Other"]

    output = {
        "years": all_years,
        "purposes": all_purposes,
        "data": data,
        "purpose_totals": {p: round(v, 2) for p, v in top_purposes},
    }

    out_file = out_dir / "temporal_purposes.json"
    out_file.write_text(json.dumps(output, separators=(",", ":")))
    print(f"Written to {out_file}")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--full-csv",
        type=Path,
        default=Path(
            "AidDataCore_ResearchRelease_Level1_v3/AidDataCoreFull_ResearchRelease_Level1_v3.1.csv"
        ),
        help="Path to AidData Core Full CSV (v3.1)",
    )
    p.add_argument(
        "--out-dir",
        type=Path,
        default=Path("data/processed"),
        help="Output directory for processed JSONs",
    )
    p.add_argument("--chunksize", type=int, default=250_000)
    args = p.parse_args()

    aggregate_temporal(args.full_csv, args.out_dir, chunksize=args.chunksize)


if __name__ == "__main__":
    main()
