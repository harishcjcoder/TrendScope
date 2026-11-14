# TrendScope: 8-Slide Pitch Deck Structure (slides-outline.md)

**Project Name**: TrendScope | Earth Observatory Intelligence  
**Challenge**: NASA Space Apps Challenge 2026 — "Be an Earth System Trend Detective"  
**Live Application**: https://6e6d4fdc-trendscope-earth-data-explorer.netlify.app/  

---

### Slide 1: Title & Vision
- **Header**: TrendScope: Earth Observatory Intelligence
- **Subtitle**: Non-Parametric Climate Forensics for the Next Generation of Earth System Detectives
- **Visuals**: TrendScope dark UI hero visual, NASA POWER Open Data badge, Space Apps 2026 emblem.
- **Key Talking Points**:
  - Uncovering real secular changes across 24 years of NASA Earth observations.
  - Hard rule: Zero synthetic data, zero placeholder counters.

---

### Slide 2: The Challenge: When Weather Masquerades as Climate
- **Header**: The Pitfalls of Naive Trend Detection
- **Bullet Points**:
  - **Seasonal Interference**: Annual solar cycles obscure decadal signals.
  - **Serial Autocorrelation ($r_1$)**: Natural persistence inflates naive Mann-Kendall tests, triggering false alarms.
  - **Multiple Comparisons Accumulation**: Uncontrolled spatial grids produce spurious significance by chance alone.
- **Visuals**: Graph illustrating how autocorrelation tricks standard linear regression into claiming significance.

---

### Slide 3: The Data Foundation: NASA POWER
- **Header**: NASA Earth Science / Applied Science Open Data
- **Table / Matrix**:
  - `T2M`: MERRA-2 2-Meter Air Temperature (°C)
  - `PRECTOTCORR`: MERRA-2 Corrected Precipitation (mm/day)
  - `RH2M`: MERRA-2 2-Meter Relative Humidity (%)
  - `GWETROOT`: MERRA-2 Root Zone Soil Wetness (0–1 fraction)
  - `ALLSKY_SFC_SW_DWN`: CERES FLASHFlux Surface Downwelling Solar Radiation (kW-hr/m²/day)
- **Key Numbers**: 2001–2024 baseline (24 years / 288 monthly vectors per location).

---

### Slide 4: The Mathematical Pipeline: Peer-Reviewed Rigor
- **Header**: 5 Steps from Raw Vectors to Audited Verdict
- **Flowchart**:
  1. *Clean*: Mask fill values (-999.0) and verify data completeness (< 20% missing).
  2. *Decompose*: Strip 12-month calendar climatology to isolate anomalies.
  3. *Pre-Whiten*: Yue-Pilon Trend-Free Pre-Whitening (TFPW) removes lag-1 autocorrelation without muting real slope.
  4. *Estimate*: Theil-Sen median slope with 95% bootstrap confidence ribbons.
  5. *Verify*: 100% numerical parity against Python `pymannkendall 1.4.3` benchmark suite.

---

### Slide 5: The Detective's Skepticism: Celebrating "No Trend"
- **Header**: Proving When a Trend is NOT Real
- **Case Study Spotlight**: Chennai Air Temperature (2001–2024)
  - Naive p-value suggests change, but Yue-Pilon TFPW reveals $p = 0.2755$ (Not Significant).
  - Rate (+0.038 °C/dec) is within natural decadal variability.
  - **Time-to-Significance Simulator**: Computes ~18 additional years of observation needed to establish secular significance at this trajectory.

---

### Slide 6: Spatial Matrix: Dipoles & Multi-Testing Control
- **Header**: 4×4 Subcontinental Grid (16 Cells / 4,608 Monthly Records)
- **Scientific Discoveries**:
  - **Benjamini-Hochberg FDR Control ($q < 0.05$)**: Caps false discovery rate across multiple cells (represented by dashed cyan stippling).
  - **Opposite-Sign Dipole Finding**: In T2M, 11 cells demonstrate significant warming (+0.12 to +0.31 °C/dec), while 5 cells in the northwest corridor exhibit neutral/mild cooling (-0.29 °C/dec).
  - **Monsoon Shift**: In Precipitation, 15 cells exhibit wetting tendencies, but only 4 survive FDR multi-testing thresholds.

---

### Slide 7: The Live Investigation Wizard & Open Science
- **Header**: Empowering Citizen Detectives Anywhere on Earth
- **Features**:
  - Live query input for any global coordinate with real measured API response time (~1.2s).
  - Natural language query parser ("Is it getting drier in Rajasthan?").
  - Instant one-click exports: Full time-series CSV, publication-ready PNG charts, and shareable URLs.
  - Offline resilience via Service Worker (`sw.js`).

---

### Slide 8: Summary & Roadmap
- **Header**: Transparent, Verifiable Earth System Science
- **Accomplishments**:
  - Fully deployed static web application on Netlify.
  - 20 pre-cached global case studies + 32 grid cell datasets.
  - Complete zero-placeholder transparency.
- **Future Roadmap**:
  - Extension to daily extreme climate indices (TX90p, R95p).
  - High-resolution gridded ERA5 / Landsat thermal integration.
