# TrendScope: Project Summary (150 Words)

**Project Name**: TrendScope | Earth Observatory Intelligence  
**Challenge**: NASA Space Apps Challenge 2026 — "Be an Earth System Trend Detective"  
**Live Application**: https://6e6d4fdc-trendscope-earth-data-explorer.netlify.app/  

---

TrendScope is an open-source Earth system trend intelligence platform designed for the NASA Space Apps Challenge 2026. It equips researchers, students, and citizens with peer-reviewed non-parametric forensics to uncover genuine multi-decadal environmental trends while eliminating false alarms.

Querying live NASA POWER monthly point data (MERRA-2 atmospheric reanalysis and CERES radiation from 2001 to 2024), TrendScope executes seasonal climatology decomposition, Yue-Pilon Trend-Free Pre-Whitening (TFPW) to control lag-1 serial autocorrelation, and Theil-Sen slopes validated against Python `pymannkendall` benchmarks.

TrendScope features an interactive 4×4 subcontinental Leaflet grid with Benjamini-Hochberg False Discovery Rate (FDR) multi-testing stippling, an orbital Anomaly Radar across 5 biophysical parameters, and an exportable Deep Forensic Deck with 95% bootstrap confidence ribbons. Every single figure is computed directly from NASA open data—ensuring complete scientific provenance, celebrating non-significant findings as genuine truths, and detecting real regional climate dipoles with zero synthetic placeholders.
