# TrendScope: Comprehensive Project Description (500 Words)

**Project Name**: TrendScope | Earth Observatory Intelligence  
**Challenge**: NASA Space Apps Challenge 2026 — "Be an Earth System Trend Detective"  
**Live Site**: https://6e6d4fdc-trendscope-earth-data-explorer.netlify.app/  
**Code Repository**: https://github.com/harish-cj/TrendScope  

---

### The Problem: When Noise Masquerades as Trend
Detecting genuine environmental trends across Earth observation records is one of modern science's greatest challenges. Satellite time series are subject to seasonal cycles, episodic weather extremes, sensor drift, and strong serial autocorrelation ($r_1$). Standard linear regressions and naive Mann-Kendall tests frequently mistake natural persistence for alarming secular changes, triggering costly false positives. Furthermore, spatial multi-testing without statistical controls inevitably generates spurious discoveries across planetary grids.

### The Solution: Non-Parametric Climate Forensics
TrendScope transforms researchers, students, and civic analysts into rigorous "Earth System Trend Detectives". Built directly upon open NASA POWER monthly point data (MERRA-2 atmospheric reanalysis and CERES satellite radiation models from 2001 to 2024), TrendScope implements an end-to-end, peer-reviewed forensic pipeline:

1. **Seasonal Climatology Stripping**: Decomposes 288 monthly vectors into localized calendar-month normals, isolating secular anomalies from annual solar cycles.
2. **Yue-Pilon Trend-Free Pre-Whitening (TFPW)**: Automatically quantifies and whitens lag-1 autocorrelation without degrading true physical slope magnitude, preventing serial correlation from inflating significance.
3. **Theil-Sen Median Slope & 95% Bootstrap CI**: Computes robust non-parametric slopes resistant to up to 29% gross outlier contamination, wrapped in dynamic 95% confidence ribbon envelopes.
4. **Benjamini-Hochberg FDR Control**: Controls False Discovery Rates ($q < 0.05$) across multi-cell spatial matrices to cap false alarms.

TrendScope’s mathematical engine is strictly validated with 100% numerical parity against the Python `pymannkendall 1.4.3` benchmark across all standard test suites.

### Core Discoveries & Features
- **Planetary Anomaly Radar**: Evaluates 5 core biophysical variables (`T2M`, `PRECTOTCORR`, `RH2M`, `GWETROOT`, `ALLSKY_SFC_SW_DWN`) simultaneously across planetary biomes—from the High Arctic (Svalbard) to the Amazon Basin (Manaus) and urban India (Chennai and Jaipur)—ranking sensors by statistical drift.
- **Subcontinental 4×4 Grid & Dipole Detection**: An interactive Leaflet map covering the Indian subcontinent (16 cells, 4,608 total months). Rather than asserting uniform warming, TrendScope uncovers genuine spatial dipoles: 11 cells demonstrate significant warming (up to +0.31 °C/dec), while 5 cells in the northwest corridor exhibit neutral or mild cooling (-0.29 °C/dec).
- **The Value of "No Trend" & Time-to-Significance**: In Chennai air temperature, the naive test yields deceptive significance, whereas Yue-Pilon correction reveals $p = 0.2755$ (Not Significant). TrendScope celebrates this finding, accompanied by a power-law Time-to-Significance simulator projecting the observation window required to distinguish the signal from noise.
- **Complete Open Science Provenance**: Zero synthetic figures, zero placeholder counters, and no simulated satellites. All results export cleanly to CSV and high-resolution PNG, with one-click shareable permalinks and offline Service Worker caching.

By uniting statistical rigor with intuitive visualization, TrendScope ensures that anyone can investigate our changing planet with the skepticism and precision of a NASA scientist.
