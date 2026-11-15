# TrendScope Architectural & Scientific Decisions (DECISIONS.md)

**Project**: TrendScope — Earth Observatory Intelligence  
**Challenge**: NASA Space Apps Challenge 2026 ("Be an Earth System Trend Detective")  
**Target URL**: https://6e6d4fdc-trendscope-earth-data-explorer.netlify.app/  

---

## 1. Zero Synthetic Data (Hard Rule Implementation)
- **Problem**: Earlier visual mockups included placeholder satellite counters ("34 BIRDS", "1,428 dossiers", "99.8% confidence"), synthetic pings, fake DOIs, and fictitious team names.
- **Decision**: Completely purged every synthetic number and placeholder. Every statistic rendered in TrendScope is computed via `analyse()` from live NASA POWER monthly point REST API or loaded from verified `/data/` caches generated strictly by `analyse()`.
- **Result**: 0 matches for forbidden placeholder terms across the repository. Full scientific provenance is documented in the UI and codebase.

## 2. Mathematical Engine Preservation
- **Problem**: The challenge provided `trendscope-engine.mjs` validated against Python `pymannkendall 1.4.3`.
- **Decision**: Maintained the mathematical implementation in `trendscope-engine.mjs` unchanged.
- **Verification**: `test-engine.mjs` runs on 6 reference datasets (trend with AR(1), no trend, strong trend, short record, tied values, falling trend) and returns `ALL MATCH pymannkendall` with exit code 0.

## 3. Autocorrelation Control: Yue-Pilon Trend-Free Pre-Whitening (TFPW)
- **Problem**: Geophysical time series (temperature, precipitation, humidity) possess substantial lag-1 serial autocorrelation ($r_1$). Naive Mann-Kendall tests on autocorrelated series produce severely inflated Type-I error rates (false positives).
- **Decision**: Prominently display both the **Naive Mann-Kendall** p-value and the **Yue-Pilon Pre-Whitened** p-value side-by-side in the Forensic Deck. For instance, in Chennai T2M, the naive test is influenced by autocorrelation, whereas the TFPW test demonstrates $p = 0.2755$ (Not Significant), preventing a false alarm.

## 4. Multi-Testing Control on Spatial Grids (Benjamini-Hochberg FDR)
- **Problem**: When testing trends simultaneously across multiple geographic cells (16 cells in our 4×4 Indian subcontinent matrix), standard $\alpha = 0.05$ thresholds lead to false discovery accumulation ($1 - (1 - 0.05)^{16} \approx 56\%$ chance of at least one false positive).
- **Decision**: Implemented Benjamini-Hochberg False Discovery Rate (FDR) control ($q < 0.05$). Cells with $q < 0.05$ are highlighted with distinct dashed cyan stippling borders on the Leaflet map. In T2M, 11 of 16 cells survive FDR control; in PRECTOTCORR, 4 of 16 cells survive FDR control.

## 5. Non-Parametric 95% Confidence Interval Ribbon
- **Problem**: Trend visualization often shows a bare line, concealing slope uncertainty.
- **Decision**: Derived the non-parametric standard error envelope around Sen's slope based on rank variance $V = \frac{N(N-1)(2N+5)}{18}$ and distance from temporal center $(i - \bar{t})$. Rendered as an SVG `<polygon id="chart-ci-polygon">` ribbon layer that users can toggle.

## 6. Embracing Non-Significant & Opposite-Sign Trends
- **Problem**: Science communicators often hide "no trend" results or cherry-pick monotonic increases.
- **Decision**: TrendScope explicitly highlights non-significant results as first-class scientific outcomes. Furthermore, the 4×4 spatial matrix features an automated **Spatial Dipole Detector** noting that while southern and eastern India exhibit warming (+0.12 to +0.31 °C/dec), northwestern cells exhibit slight negative or neutral anomalies (-0.29 °C/dec), capturing genuine subcontinental climate dynamics.

## 7. Zero-Build Static Deployment with Offline Resilience
- **Problem**: Space Apps judges and peer reviewers need instant, reproducible loading without local compilation friction.
- **Decision**: Built on native ES Modules, Leaflet via CDN, Tailwind CSS, and a lightweight Service Worker (`sw.js`). Added `netlify.toml` with security headers, immutable caching for `/data/*`, and a serverless proxy function (`netlify/functions/power.mjs`) to circumvent browser CORS restrictions if needed.

## 8. Refinements from Scientific Review
- **Short Record Warning**: Suppressed for records ≥ 15 years, retaining it exclusively for shorter exploratory spans.
- **Offline Case Study Count**: Aligned UI counters to precisely display the 4 featured in-depth offline dossiers (Chennai, Jaipur, Manaus, Svalbard).
- **Latency & Version Transparency**: Removed static '~1.2s' and 'v2.4' badges, replacing them with dynamic measured API latency computed per live query.
- **Planetary Mean Removal**: Removed the unverified '~2.5x planetary mean' claim from the Svalbard dossier card.
- **Scientific Phrasing on Non-Significant Trends**: For non-significant cases ($p \ge 0.05$), verdict phrasing states 'no statistically significant trend detected' rather than asserting directional verbs like 'rose'.
- **Standardized Hemispheric Geographic Coordinates**: Normalized all latitude/longitude displays to Cardinal Hemispheric notation (e.g., Manaus formatted as 3.11°S, 60.02°W).
- **Terminology Accuracy**: Updated 'Climatology STL' to 'Monthly climatology removal' to accurately reflect the 12-month calendar baseline subtraction procedure.
- **Attribution & Team Credit**: Updated roster to officially attribute `[TESSARACT AND BHAVYAHARINI R , HARISH C J]`.
- **Sensors Ready Replaced**: Updated header sub-bar telemetry banner to state 'Data source: NASA POWER'.
