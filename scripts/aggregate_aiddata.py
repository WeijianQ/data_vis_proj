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


def _looks_regional_or_agg(name: str) -> bool:
    n = name.lower()
    if 'regional' in n or 'unspecified' in n:
        return True
    if ',' in name:
        return True
    return False


def aggregate(full_csv: Path, out_dir: Path, chunksize: int = 250_000) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # Running totals
    donated_by_iso2: dict[str, float] = defaultdict(float)
    received_by_iso2: dict[str, float] = defaultdict(float)
    # Purposes: sum of received by (iso2, purpose)
    rec_by_iso2_purpose: dict[tuple[str, str], float] = defaultdict(float)
    # Purposes: sum of donated by (iso2, purpose)
    don_by_iso2_purpose: dict[tuple[str, str], float] = defaultdict(float)
    # Donor -> Recipient -> Purpose -> amount (for top donors per recipient-purpose)
    donor_to_recipient_purpose: dict[tuple[str, str, str], float] = defaultdict(float)
    # Donor -> Recipient bilateral flows (for chord diagram)
    donor_to_recipient: dict[tuple[str, str], float] = defaultdict(float)
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

    # Count total lines and skip the last (potentially corrupted) line
    with open(full_csv, 'r') as f:
        total_lines = sum(1 for _ in f)
    nrows = total_lines - 2  # -1 for header, -1 for last line #REMOVING THE LAST LINE JUST FOR NOW SINCE THE FULL CSV WAS NOT COPIED CORRECTLY, WILL REMOVE LATER

    # Read in memory-efficient chunks
    for chunk in pd.read_csv(
        full_csv,
        usecols=usecols,
        chunksize=chunksize,
        nrows=nrows,
        dtype={
            "donor_iso": "string",
            "donor": "string",
            "recipient_iso": "string",
            "recipient": "string",
            "commitment_amount_usd_constant": "float64",
            "coalesced_purpose_name": "string",
        },
        on_bad_lines="skip",  # Skip malformed rows
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

        # Purposes: received by (recipient_iso, purpose) and donated by (donor_iso, purpose)
        if "coalesced_purpose_name" in c.columns:
            # Fill NA purpose with a placeholder bucket
            c["coalesced_purpose_name"] = c["coalesced_purpose_name"].fillna("Unspecified purpose")

            # Received by purpose
            grp = (
                c.groupby(["recipient_iso", "coalesced_purpose_name"])  # type: ignore[list-item]
                ["commitment_amount_usd_constant"]
                .sum()
            )
            for (iso2, purpose), val in grp.items():
                rec_by_iso2_purpose[(iso2, str(purpose))] += float(val)

            # Donated by purpose
            grp_don = (
                c.groupby(["donor_iso", "coalesced_purpose_name"])  # type: ignore[list-item]
                ["commitment_amount_usd_constant"]
                .sum()
            )
            for (iso2, purpose), val in grp_don.items():
                don_by_iso2_purpose[(iso2, str(purpose))] += float(val)

            # Donor -> Recipient -> Purpose flows (for top donors tooltip)
            grp_drp = (
                c.groupby(["donor_iso", "recipient_iso", "coalesced_purpose_name"])  # type: ignore[list-item]
                ["commitment_amount_usd_constant"]
                .sum()
            )
            for (donor, recipient, purpose), val in grp_drp.items():
                donor_to_recipient_purpose[(donor, recipient, str(purpose))] += float(val)

        # Donor -> Recipient bilateral flows (for chord diagram)
        grp_bilateral = (
            c.groupby(["donor_iso", "recipient_iso"])
            ["commitment_amount_usd_constant"]
            .sum()
        )
        for (donor, recipient), val in grp_bilateral.items():
            donor_to_recipient[(donor, recipient)] += float(val)

        # Purposes: Global totals by purpose (sum over all recipients)
        if "coalesced_purpose_name" in c.columns:
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

    # Country purposes received: { iso2: { purpose: amount, ... }, ... }
    country_purposes_received: dict[str, dict[str, float]] = {}
    for (iso2, purpose), val in rec_by_iso2_purpose.items():
        if iso2 not in country_purposes_received:
            country_purposes_received[iso2] = {}
        country_purposes_received[iso2][purpose] = round(float(val), 2)

    (out_dir / "country_purposes_received.json").write_text(
        json.dumps(country_purposes_received, separators=(",", ":"))
    )

    # Country purposes donated: { iso2: { purpose: amount, ... }, ... }
    country_purposes_donated: dict[str, dict[str, float]] = {}
    for (iso2, purpose), val in don_by_iso2_purpose.items():
        if iso2 not in country_purposes_donated:
            country_purposes_donated[iso2] = {}
        country_purposes_donated[iso2][purpose] = round(float(val), 2)

    (out_dir / "country_purposes_donated.json").write_text(
        json.dumps(country_purposes_donated, separators=(",", ":"))
    )

    # Top donors per recipient-purpose: { recipient_iso: { purpose: [[donor_iso, amount], ...], ... }, ... }
    # Only keep top 3 donors per (recipient, purpose) to limit file size
    top_donors_by_recipient_purpose: dict[str, dict[str, list]] = {}

    # First, organize by (recipient, purpose) -> list of (donor, amount)
    recipient_purpose_donors: dict[tuple[str, str], list[tuple[str, float]]] = defaultdict(list)
    for (donor, recipient, purpose), val in donor_to_recipient_purpose.items():
        recipient_purpose_donors[(recipient, purpose)].append((donor, float(val)))

    # Now get top 3 for each
    for (recipient, purpose), donors in recipient_purpose_donors.items():
        # Sort by amount descending and take top 3
        top3 = sorted(donors, key=lambda x: x[1], reverse=True)[:3]
        if recipient not in top_donors_by_recipient_purpose:
            top_donors_by_recipient_purpose[recipient] = {}
        top_donors_by_recipient_purpose[recipient][purpose] = [
            [d, round(amt, 2)] for d, amt in top3
        ]

    (out_dir / "top_donors_by_recipient_purpose.json").write_text(
        json.dumps(top_donors_by_recipient_purpose, separators=(",", ":"))
    )

    # Chord diagram data: bilateral flows between countries
    # We need to identify top donors and top recipients for a focused visualization
    # Get top 15 donors by total donated
    top_donors = sorted(donated_by_iso2.items(), key=lambda kv: kv[1], reverse=True)[:15]
    top_donor_iso2s = {iso2 for iso2, _ in top_donors}

    # Get top 25 recipients by total received (excluding those already in top donors)
    top_recipients = sorted(
        [(iso2, val) for iso2, val in received_by_iso2.items() if iso2 not in top_donor_iso2s],
        key=lambda kv: kv[1],
        reverse=True
    )[:25]
    top_recipient_iso2s = {iso2 for iso2, _ in top_recipients}

    # Combine into a set of countries for the chord diagram
    chord_countries = top_donor_iso2s | top_recipient_iso2s

    # Build the matrix and names list
    chord_country_list = sorted(chord_countries)
    country_to_idx = {iso2: i for i, iso2 in enumerate(chord_country_list)}

    # Create flow matrix (donor -> recipient)
    n = len(chord_country_list)
    matrix = [[0.0] * n for _ in range(n)]

    for (donor, recipient), val in donor_to_recipient.items():
        if donor in country_to_idx and recipient in country_to_idx:
            i = country_to_idx[donor]
            j = country_to_idx[recipient]
            matrix[i][j] += float(val)

    # Round values for JSON
    matrix = [[round(v, 2) for v in row] for row in matrix]

    # Mark which countries are primarily donors vs recipients
    country_roles = {}
    for iso2 in chord_country_list:
        donated = donated_by_iso2.get(iso2, 0.0)
        received = received_by_iso2.get(iso2, 0.0)
        if donated > received * 2:
            country_roles[iso2] = "donor"
        elif received > donated * 2:
            country_roles[iso2] = "recipient"
        else:
            country_roles[iso2] = "mixed"

    chord_data = {
        "countries": chord_country_list,
        "names": {iso2: iso2_names.get(iso2, iso2) for iso2 in chord_country_list},
        "roles": country_roles,
        "matrix": matrix,
        "totals": {
            iso2: {
                "donated": round(donated_by_iso2.get(iso2, 0.0), 2),
                "received": round(received_by_iso2.get(iso2, 0.0), 2)
            }
            for iso2 in chord_country_list
        }
    }

    (out_dir / "chord_flows.json").write_text(
        json.dumps(chord_data, separators=(",", ":"))
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
