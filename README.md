# TrendScope | Earth Observatory Intelligence

**NASA Space Apps Challenge 2026 Entry**  
**Challenge**: "Be an Earth System Trend Detective"  
**Live Application**: [https://6e6d4fdc-trendscope-earth-data-explorer.netlify.app/](https://6e6d4fdc-trendscope-earth-data-explorer.netlify.app/)  
**GitHub Repository**: [https://github.com/harishcjcoder/TrendScope](https://github.com/harishcjcoder/TrendScope)  

---

## Overview
**TrendScope** is an open-source climate forensics platform that turns anyone into an Earth System Trend Detective. While naive linear regressions frequently mistake seasonal weather noise and serial autocorrelation for alarming climate shifts, TrendScope applies peer-reviewed non-parametric statistical methods directly to 24 years (2001–2024, 288 monthly vectors) of open NASA POWER observations.

### Hard Rules Strictly Enforced
- **Zero Synthetic Numbers**: Every number displayed comes directly from NASA POWER (MERRA-2 atmospheric reanalysis and CERES radiation models) via `analyse()`.
- **Honest Science**: Non-significant trends (such as Chennai Air Temperature, $p = 0.2755$) and sub-critical grid cells are highlighted as valid, vital scientific discoveries rather than suppressed.
- **Auditable Mathematics**: Mathematical algorithms in `trendscope-engine.mjs` are verified against Python’s `pymannkendall 1.4.3` benchmark suite with 100% numerical match.

---

## Key Features

### 1. Planetary Anomaly Radar
- Evaluates 5 core biophysical variables (`T2M`, `PRECTOTCORR`, `RH2M`, `GWETROOT`, `ALLSKY_SFC_SW_DWN`) simultaneously across diverse global biomes (Chennai, Jaipur, Manaus, Svalbard).
- Ranks sensors dynamically by statistical significance ($|Z|$ and corrected $p$-value).

### 2. Geospatial Trend Map (Interactive 4×4 Climate Grid)
- Subcontinental 4×4 spatial matrix over India (lat 11°–29°N, lon 71°–89°E) from NASA POWER MERRA-2 (4,608 monthly vectors).
- **Benjamini-Hochberg FDR Multi-Testing Control ($q < 0.05$)**: Stipples cells that survive multi-testing with dashed cyan borders to prevent false alarm accumulation.
- **Opposite-Sign Dipole Detection**: Uncovers regional contrasts where southern/eastern cells warm (+0.12 to +0.31 °C/dec) while northwestern cells show mild cooling (-0.29 °C/dec).

### 3. Deep Forensic Deck
- **Yue-Pilon Trend-Free Pre-Whitening (TFPW)**: Pre-whitens lag-1 serial autocorrelation ($r_1$) without blunting true secular slope.
- **Theil-Sen Slope with 95% Bootstrap CI Ribbon**: Renders robust median pairwise slopes with dynamic confidence polygons.
- **12-Month Rolling Mean & Layer Toggles**: Users can toggle between Anomaly, Sen's Trend, 95% CI Ribbon, 12-Month Smoothing, and Raw layers.
- **Time-to-Significance Simulator**: Extrapolates observation time required for sub-critical trends to reach significance.
- **Publication Exports**: Instant CSV download, high-resolution PNG chart capture, and permanent shareable URLs.

### 4. Live NASA POWER Query Wizard
- Direct REST query to NASA POWER monthly point API for any coordinate on Earth with real measured round-trip response time (~1.2 seconds).
- Natural language query parser ("Is it getting drier in Rajasthan?").

---

## Validation & Verification

Run the engine test suite locally to verify 100% numerical parity against Python `pymannkendall`:
```bash
node test-engine.mjs
```
Expected output:
```text
trend_ar  naive z      1.195614e+1     1.195614e+1 OK
...
ALL MATCH pymannkendall
```

---

## Local Development & Zero-Build Run

TrendScope is built with zero compilation friction. No `npm run build` or bundler required:
```bash
# Clone the repository
git clone https://github.com/harishcjcoder/TrendScope.git
cd TrendScope

# Start any static server
npx serve .
# or: python -m http.server 8000
```
Open `http://localhost:3000` (or `http://localhost:8000`) in your browser.

---

## Project Structure
```text
├── index.html                   # Semantic HTML5 UI (Google Stitch aesthetic)
├── app.js                       # Frontend controller, Leaflet map & exports
├── trendscope-engine.mjs        # Core statistical engine (TFPW, Theil-Sen, MK)
├── test-engine.mjs              # Validation suite against pymannkendall
├── reference-data.json          # Benchmark datasets from pymannkendall
├── sw.js                        # Offline demo Service Worker
├── netlify.toml                 # Netlify deployment configuration & headers
├── netlify/functions/power.mjs  # Optional serverless CORS proxy for NASA POWER
├── data/
│   ├── cases/                   # 20 pre-computed cases + manifest.json
│   └── grid/                    # 4x4 India grid matrix (32 cell files + india-grid.json)
├── scripts/
│   ├── build-cases.mjs          # Script to fetch and build 20 offline cases
│   └── build-grid.mjs           # Script to fetch and build 4x4 spatial grid
└── submission/                  # Challenge submission documentation
    ├── project-summary.md       # 150-word summary
    ├── project-description.md   # 500-word comprehensive description
    ├── demo-script.md           # 3-minute video presentation script
    ├── slides-outline.md        # 8-slide presentation outline
    ├── data-sources.md          # Scientific lineage & NASA POWER citation
    ├── tools-and-ai-disclosure.md # Complete Tools & AI transparency disclosure
    └── DECISIONS.md             # Complete record of engineering decisions
```

---

## Roadmap
Features deferred to future development (never left as fake placeholders):
- **Daily Extreme Climate Indices**: Integration of ETCCDI indices (TX90p hot days, R95p heavy precipitation).
- **High-Resolution Satellite Grids**: Expanding from 0.5° MERRA-2 to 30-meter Landsat thermal infrared records.
- **Ensemble Reanalysis Cross-Validation**: Coupling NASA MERRA-2 with ECMWF ERA5 and JRA-55.

---

## Data Attribution & Citation
These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science / Applied Science Program ([https://power.larc.nasa.gov/](https://power.larc.nasa.gov/)).

*Built with NASA POWER open data. Not an official NASA product. Not affiliated with or endorsed by NASA.*
