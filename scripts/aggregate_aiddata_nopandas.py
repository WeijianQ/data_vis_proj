"""Pure-Python streaming aggregation for AidData Core Full v3.1.

Produces the same outputs as aggregate_aiddata.py without pandas:
- data/processed/country_totals.json
- data/processed/purposes_top5.json

Usage:
  python scripts/aggregate_aiddata_nopandas.py \
    --full-csv AidDataCore_ResearchRelease_Level1_v3/AidDataCoreFull_ResearchRelease_Level1_v3.1.csv \
    --out-dir data/processed
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path


def aggregate(full_csv: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"Reading from: {full_csv}")
    print(f"Output to: {out_dir}")

    donated_by_iso2: dict[str, float] = defaultdict(float)
    received_by_iso2: dict[str, float] = defaultdict(float)
    rec_by_iso2_purpose: dict[tuple[str, str], float] = defaultdict(float)
    don_by_iso2_purpose: dict[tuple[str, str], float] = defaultdict(float)
    purpose_totals: dict[str, float] = defaultdict(float)
    iso2_names: dict[str, str] = {}

    # Columns of interest
    COL_DONOR = "donor"
    COL_DONOR_ISO = "donor_iso"
    COL_RECIP_ISO = "recipient_iso"
    COL_RECIP = "recipient"
    COL_AMOUNT = "commitment_amount_usd_constant"
    COL_PURPOSE = "coalesced_purpose_name"

    with full_csv.open('r', newline='', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)

        for row in reader:
            try:
                donor_iso = (row.get(COL_DONOR_ISO) or "").strip().upper()
                recip_iso = (row.get(COL_RECIP_ISO) or "").strip().upper()
                amt_raw = row.get(COL_AMOUNT)
                if not donor_iso or not recip_iso or not amt_raw:
                    continue
                # Some numeric strings can be empty or malformed; skip safely
                try:
                    amt = float(amt_raw)
                except Exception:
                    continue

                donated_by_iso2[donor_iso] += amt
                received_by_iso2[recip_iso] += amt

                # Capture a readable name for iso2 if available
                recip_name = (row.get(COL_RECIP) or '').strip()
                donor_name = (row.get(COL_DONOR) or '').strip()
                if recip_iso and recip_name and recip_iso not in iso2_names:
                    if not _looks_regional_or_agg(recip_name):
                        iso2_names[recip_iso] = recip_name
                if donor_iso and donor_name and donor_iso not in iso2_names:
                    if not _looks_regional_or_agg(donor_name):
                        iso2_names[donor_iso] = donor_name

                purpose = (row.get(COL_PURPOSE) or "Unspecified purpose").strip()
                rec_by_iso2_purpose[(recip_iso, purpose)] += amt
                don_by_iso2_purpose[(donor_iso, purpose)] += amt
                purpose_totals[purpose] += amt
            except Exception:
                # Be resilient to row-level issues in a very large CSV
                continue

    # Country totals
    all_iso2 = set(donated_by_iso2) | set(received_by_iso2)
    totals = []
    for iso2 in sorted(all_iso2):
        donated = donated_by_iso2.get(iso2, 0.0)
        received = received_by_iso2.get(iso2, 0.0)
        totals.append({
            "iso2": iso2,
            "donated": round(float(donated), 2),
            "received": round(float(received), 2),
            "net": round(float(received - donated), 2),
        })

    (out_dir / "country_totals.json").write_text(
        json.dumps({"countries": totals}, separators=(",", ":"))
    )

    # Write iso2 -> name mapping for tooltips
    (out_dir / "iso2_names.json").write_text(
        json.dumps(iso2_names, separators=(",", ":"))
    )

    # Top 5 purposes by total received
    top5 = sorted(purpose_totals.items(), key=lambda kv: kv[1], reverse=True)[:5]
    purposes_order = [p for p, _ in top5]

    per_purpose: dict[str, dict[str, float]] = {}
    global_max = 0.0
    for p in purposes_order:
        per_country: dict[str, float] = {}
        for (iso2, purpose), val in rec_by_iso2_purpose.items():
            if purpose == p:
                per_country[iso2] = per_country.get(iso2, 0.0) + float(val)
                if per_country[iso2] > global_max:
                    global_max = per_country[iso2]
        per_purpose[p] = {k: round(v, 2) for k, v in per_country.items()}

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

    # Country-level purpose breakdowns for received aid
    country_purposes_received: dict[str, dict[str, float]] = {}
    for (iso2, purpose), val in rec_by_iso2_purpose.items():
        if iso2 not in country_purposes_received:
            country_purposes_received[iso2] = {}
        country_purposes_received[iso2][purpose] = round(float(val), 2)

    print(f"Writing country_purposes_received.json with {len(country_purposes_received)} countries")
    (out_dir / "country_purposes_received.json").write_text(
        json.dumps(country_purposes_received, separators=(",", ":"))
    )

    # Country-level purpose breakdowns for donated aid
    country_purposes_donated: dict[str, dict[str, float]] = {}
    for (iso2, purpose), val in don_by_iso2_purpose.items():
        if iso2 not in country_purposes_donated:
            country_purposes_donated[iso2] = {}
        country_purposes_donated[iso2][purpose] = round(float(val), 2)

    print(f"Writing country_purposes_donated.json with {len(country_purposes_donated)} countries")
    (out_dir / "country_purposes_donated.json").write_text(
        json.dumps(country_purposes_donated, separators=(",", ":"))
    )
    print("Done!")


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
    args = p.parse_args()

    aggregate(args.full_csv, args.out_dir)


if __name__ == "__main__":
    main()


def _looks_regional_or_agg(name: str) -> bool:
    n = name.lower()
    if 'regional' in n or 'unspecified' in n:
        return True
    # Heuristic: many aggregates include commas (e.g., "Africa, Regional Programs")
    if ',' in name:
        return True
    return False
