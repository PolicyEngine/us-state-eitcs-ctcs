# State EITC and CTC impacts

Interactive dashboard showing state-level Earned Income Tax Credit and Child Tax Credit impacts across US states.

## Architecture

- **Frontend**: React + TypeScript + Vite in `frontend/`
- **UI**: Mantine v8 components
- **Charts**: Custom SVG choropleth map (no Recharts charts needed for this app)
- **Data**: Pre-computed results in `frontend/public/data/results.json`
- **Deployment**: Vercel (static site)

## Development

```bash
cd frontend
npm install
npm run dev      # Dev server
npm run test     # Run tests
npm run build    # Production build
```

## Design tokens

- Primary color: #319795 (teal)
- Font: Inter
- See `src/designTokens.ts`

## Data pipeline

The `results.json` is generated using PolicyEngine US microsimulation. The pipeline neutralizes state EITC and CTC variables and compares poverty, inequality, and cost metrics across all 50 states + DC.

### Modal Pipeline (Recommended)

The Modal pipeline runs simulations in parallel for faster execution:

```bash
cd scripts
pip install -r requirements.txt

# Login to Modal (first time only)
modal token new

# Run the full pipeline (processes all 51 states in parallel)
modal run modal_pipeline.py

# Or deploy as a scheduled monthly job
modal deploy modal_pipeline.py

# Download results to update frontend
python download_modal_results.py
```

### Local Pipeline

For local execution (slower, runs sequentially):

```bash
cd scripts
python generate_data.py
```

### Pipeline Output

Both pipelines generate:
- `data/district_impacts.csv` - Congressional district-level impacts
- `data/state_impacts.csv` - State-level aggregated impacts
- `frontend/public/data/results.json` - JSON for frontend consumption
