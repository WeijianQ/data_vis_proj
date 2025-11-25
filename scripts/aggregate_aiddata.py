"""Aggregate AidData Core (Level 1 v3.1) into compact JSONs for D3.

Outputs under data/processed/:
- country_totals.json: per ISO2 country: donated, received, net
- purposes_top5.json: { purposes: [..], per_purpose: { purpose -> { iso2: received_sum } }, max_value }

Notes
- Reads only required columns from the large Full CSV via chunking.
- Uses ISO2 codes for robust joins with map metadata (via world-atlas TSV).
- Treats commitments as positive flows from donor -> recipient.

Usage
  python scripts/aggregate_aiddata.py \
    --full-csv AidDataCore_ResearchRelease_Level1_v3/AidDataCoreFull_ResearchRelease_Level1_v3.1.csv

Tip: Create a venv first for speed and isolation.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import pandas as pd


def aggregate(full_csv: Path, out_dir: Path, chunksize: int = 250_000) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # Running totals
    donated_by_iso2: dict[str, float] = defaultdict(float)
    received_by_iso2: dict[str, float] = defaultdict(float)
    # Purposes: sum of received by (iso2, purpose)
    rec_by_iso2_purpose: dict[tuple[str, str], float] = defaultdict(float)
    # Global purpose totals
    purpose_totals: dict[str, float] = defaultdict(float)
    # ISO2 -> human name
    iso2_names: dict[str, str] = {}

    usecols = [
        "donor_iso",
        "donor",
        "recipient_iso",
        "recipient",
        "commitment_amount_usd_constant",
        "coalesced_purpose_name",
    ]

    # Read in memory-efficient chunks
    for chunk in pd.read_csv(
        full_csv,
        usecols=usecols,
        chunksize=chunksize,
        dtype={
            "donor_iso": "string",
            "donor": "string",
            "recipient_iso": "string",
            "recipient": "string",
            "commitment_amount_usd_constant": "float64",
            "coalesced_purpose_name": "string",
        },
    ):
        # Drop rows with missing values in critical fields
        c = chunk.dropna(subset=["donor_iso", "recipient_iso", "commitment_amount_usd_constant"]).copy()

        # Normalize ISO2 to uppercase 2-character codes
        c["donor_iso"] = c["donor_iso"].str.upper().str.strip()
        c["recipient_iso"] = c["recipient_iso"].str.upper().str.strip()

        # Some rows may contain aggregates (e.g., regions) with blank/NA ISO codes; they were dropped above

        # Donated per donor ISO2
        donated = (
            c.groupby("donor_iso")["commitment_amount_usd_constant"].sum().to_dict()
        )
        for iso2, val in donated.items():
            donated_by_iso2[iso2] += float(val)

        # Received per recipient ISO2
        received = (
            c.groupby("recipient_iso")["commitment_amount_usd_constant"].sum().to_dict()
        )
        for iso2, val in received.items():
            received_by_iso2[iso2] += float(val)

        # Capture names where available
        if "recipient" in c.columns:
            rc = c.dropna(subset=["recipient_iso", "recipient"])[["recipient_iso", "recipient"]]
            for iso2, name in rc.itertuples(index=False):
                if iso2 not in iso2_names and not _looks_regional_or_agg(str(name)):
                    iso2_names[iso2] = str(name)
        if "donor" in c.columns:
            dc = c.dropna(subset=["donor_iso", "donor"])[["donor_iso", "donor"]]
            for iso2, name in dc.itertuples(index=False):
                if iso2 not in iso2_names and not _looks_regional_or_agg(str(name)):
                    iso2_names[iso2] = str(name)

        # Purposes: received by (recipient_iso, purpose)
        if "coalesced_purpose_name" in c.columns:
            # Fill NA purpose with a placeholder bucket
            c["coalesced_purpose_name"] = c["coalesced_purpose_name"].fillna("Unspecified purpose")

            grp = (
                c.groupby(["recipient_iso", "coalesced_purpose_name"])  # type: ignore[list-item]
                ["commitment_amount_usd_constant"]
                .sum()
            )
            for (iso2, purpose), val in grp.items():
                rec_by_iso2_purpose[(iso2, str(purpose))] += float(val)

            # Global totals by purpose (sum over all recipients)
            pt = (
                c.groupby("coalesced_purpose_name")["commitment_amount_usd_constant"].sum().to_dict()
            )
            for p, val in pt.items():
                purpose_totals[str(p)] += float(val)

    # Prepare country totals structure
    all_iso2 = set(donated_by_iso2) | set(received_by_iso2)
    totals = []
    for iso2 in sorted(all_iso2):
        donated = donated_by_iso2.get(iso2, 0.0)
        received = received_by_iso2.get(iso2, 0.0)
        totals.append(
            {
                "iso2": iso2,
                "donated": round(float(donated), 2),
                "received": round(float(received), 2),
                "net": round(float(received - donated), 2),
            }
        )

    (out_dir / "country_totals.json").write_text(
        json.dumps({"countries": totals}, separators=(",", ":"))
    )

    (out_dir / "iso2_names.json").write_text(
        json.dumps(iso2_names, separators=(",", ":"))
    )

    # Top 5 purposes by global total
    top5 = sorted(purpose_totals.items(), key=lambda kv: kv[1], reverse=True)[:5]
    purposes_order = [p for p, _ in top5]

    per_purpose: dict[str, dict[str, float]] = {}
    global_max = 0.0
    for p in purposes_order:
        m: dict[str, float] = {}
        for (iso2, purpose), val in rec_by_iso2_purpose.items():
            if purpose == p:
                m[iso2] = m.get(iso2, 0.0) + float(val)
                if m[iso2] > global_max:
                    global_max = m[iso2]
        per_purpose[p] = {k: round(v, 2) for k, v in m.items()}

    (out_dir / "purposes_top5.json").write_text(
        json.dumps(
            {
                "purposes": purposes_order,
                "per_purpose": per_purpose,
                "max_value": round(global_max, 2),
            },
            separators=(",", ":"),
        )
    )


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

    aggregate(args.full_csv, args.out_dir, chunksize=args.chunksize)


if __name__ == "__main__":
    main()


def _looks_regional_or_agg(name: str) -> bool:
    n = name.lower()
    if 'regional' in n or 'unspecified' in n:
        return True
    if ',' in name:
        return True
    return False
