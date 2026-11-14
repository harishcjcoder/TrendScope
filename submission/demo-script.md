# TrendScope: 3-Minute Video Demo Script (demo-script.md)

**Title**: TrendScope — Earth Observatory Intelligence  
**Challenge**: NASA Space Apps Challenge 2026: "Be an Earth System Trend Detective"  
**Duration**: 3 Minutes (180 Seconds)  
**Presenter**: Harish C.J. & TrendScope Team  

---

### [0:00 – 0:30] Hook & Mission: The Detective's Challenge
- **Visual**: Screen opens on TrendScope hero section (`https://6e6d4fdc-trendscope-earth-data-explorer.netlify.app/`). Mouse scrolls over the headline: *"Find What's Changing. Prove It's Real."* Camera zooms into the live telemetry HUD showing 288 monthly vectors from NASA POWER.
- **Narrator**:  
  *"Welcome to TrendScope. In climate science, detecting a genuine trend is hard. Natural weather cycles, seasonal oscillations, and autocorrelation easily trick researchers into crying wolf. For the 2026 NASA Space Apps Challenge, we built TrendScope—a forensic tool that connects directly to NASA POWER's 24-year satellite and reanalysis archive to separate true environmental drift from statistical illusion."*

---

### [0:30 – 1:10] The Planetary Anomaly Radar & Polar Amplification
- **Visual**: Navigate to Section 2 (Planetary Anomaly Radar). Switch location button from **Chennai** to **Svalbard**. The polar scope nodes dynamically expand. Click "Inspect in Forensic Deck".
- **Narrator**:  
  *"Let's start our investigation in the High Arctic archipelago of Svalbard. Look at our Planetary Anomaly Radar: 5 biophysical parameters ranked by statistical significance. Air temperature is drifting outward past 3.5 standard deviations.  
  When we open the Forensic Deck, we see the real numbers: over 24 years, Svalbard is warming at +0.593 °C per decade—two and a half times the planetary rate. That’s Arctic Amplification in hard data, with a corrected p-value of 0.00017."*

---

### [1:10 – 1:50] The Power of "Not Significant" (Autocorrelation Control)
- **Visual**: Switch back to **Chennai Air Temperature (T2M)**. Focus on the statistical verification box comparing Naive Mann-Kendall vs. Yue-Pilon Pre-Whitened. Toggle the 95% Bootstrap CI ribbon and 12-month rolling smooth curve on the chart.
- **Narrator**:  
  *"Now let's test a detective's most important skill: proving when a trend is NOT real.  
  Here in Chennai, a naive linear test might suggest significant change. But geophysical monthly data has high serial correlation—last month's heat bleeds into this month.  
  TrendScope runs Yue-Pilon Trend-Free Pre-Whitening (TFPW), validated to 100% numerical match with Python's pymannkendall. After pre-whitening, the corrected p-value is 0.2755—Not Significant. The rate of +0.038 °C per decade is well within natural noise. TrendScope proudly displays this negative result, saving policy-makers from a false alarm, and calculates our Time-to-Significance: an estimated 18 more years of observation needed to confirm a real secular shift."*

---

### [1:50 – 2:30] Spatial Coverage: 4×4 Grid & Opposite-Sign Dipoles
- **Visual**: Scroll to Section 3 (Planetary Trend Map). Click on the Leaflet map over the Indian subcontinent. Toggle between **T2M** and **PRECTOTCORR**. Hover over stippled cells (dashed cyan outline) vs solid cells. Click cell [0, 0] (Indus border) and cell [2, 1] (South India).
- **Narrator**:  
  *"Real Earth systems are not spatially uniform. Here is our 4×4 spatial matrix over the Indian subcontinent, encompassing 16 cells and 4,608 monthly observations.  
  Notice the dashed stippling? That's Benjamini-Hochberg False Discovery Rate control (q < 0.05) to ensure multi-testing doesn't invent false discoveries.  
  Look at the spatial dipole: while southern and eastern cells show robust warming (+0.12 to +0.31 °C/dec), northwestern cells actually show negative decadal anomalies (-0.29 °C/dec). And when we toggle to precipitation, 15 cells show wetting trends, but only 4 survive FDR significance. That is the spatial nuance only NASA open data can reveal."*

---

### [2:30 – 3:00] Live Query Wizard & Open Science
- **Visual**: Scroll to Section 6 (Query Wizard). Click "Jaipur" preset, click "Execute Investigation". Watch the live status banner measure real API round-trip latency (~1200ms) and dynamically render the new findings. Click "CSV Export" and "Share".
- **Narrator**:  
  *"Finally, the Wizard lets any user query any coordinate on Earth in real time. We query live NASA POWER endpoints, strip climatology, pre-whiten, and produce an auditable verdict in 1.2 seconds.  
  You can export the full series to CSV, capture publication-ready PNG charts, or share permanent URLs.  
  Zero fake data. Zero synthetic numbers. Fully offline capable with Service Workers. That's TrendScope: empowering the next generation of Earth System Trend Detectives. Thank you!"*
