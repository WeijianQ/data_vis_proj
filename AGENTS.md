# Repository Guidelines

## Project Structure & Module Organization
- `AidDataCore_ResearchRelease_Level1_v3/`: Raw source CSVs (do not modify). Key files: `AidDataCoreFull_*.csv`, `AidDataCoreThin_*.csv`, and README.pdf.
- Suggested additions: `notebooks/` (exploration, EDA, visuals), `scripts/` (reusable transforms), `tests/` (unit tests), `figures/` (exported charts), `data/processed/` (derived datasets). Keep raw vs. processed data clearly separated.

## Build, Test, and Development Commands
- Environment (optional): `python -m venv .venv && source .venv/bin/activate`
- Quick preview (no project build needed):
  - `python -c "import pandas as pd; print(pd.read_csv('AidDataCore_ResearchRelease_Level1_v3/AidDataCoreThin_ResearchRelease_Level1_v3.1.csv', nrows=5))"`
- Jupyter workflow (optional): `pip install pandas jupyter && jupyter lab`
- If adding tests: run with `pytest -q` from the repo root.

## Coding Style & Naming Conventions
- Python: 4-space indent, `snake_case` for files and functions, `CapWords` for classes.
- Notebooks: prefix with ordering and topic, e.g., `01-data-audit.ipynb`, `02-country-trends.ipynb`.
- Scripts: pure functions in `scripts/` with clear I/O; avoid side effects. Document each module with a short top-of-file docstring.
- Formatting: prefer `black` and `ruff` (if used in your environment). Keep lines ≤ 100 chars.

## Testing Guidelines
- Framework: `pytest` with tests in `tests/` named `test_*.py`.
- What to test: data-loading helpers, transforms, and plotting utilities (return shapes, column presence, value ranges).
- Aim for >80% coverage on custom code; use small, synthetic fixtures under `tests/fixtures/`.

## Commit & Pull Request Guidelines
- Commits: imperative mood, concise subject (≤72 chars), optional scope. Example: `feat(transform): add donor-year aggregation`.
- PRs: include purpose, dataset(s) touched, before/after visuals (if applicable), and reproduction steps. Link related issues. Keep PRs focused and <400 LOC when possible.

## Data Handling & Performance
- Treat files under `AidDataCore_ResearchRelease_Level1_v3/` as read-only. Write outputs to `data/processed/`.
- For large CSVs, prefer chunked reads and column pruning: `pd.read_csv(path, usecols=[...], chunksize=100_000)`.
- Do not commit secrets or files >100MB; consider Git LFS for large, versioned assets.
