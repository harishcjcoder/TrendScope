# TrendScope: Tools & Artificial Intelligence Disclosure (tools-and-ai-disclosure.md)

**Project Name**: TrendScope | Earth Observatory Intelligence  
**Challenge**: NASA Space Apps Challenge 2026 — *"Be an Earth System Trend Detective"*  
**Live Site**: https://jocular-concha-79844a.netlify.app/  
**Code Repository**: https://github.com/harishcjcoder/TrendScope  
**Compliance Standard**: NASA Space Apps Participant FAQ & NASA Open-Source Science Initiative (OSSI)  

---

## 1. Quick-Copy Portal Disclosure
*(Ready to paste directly into the Space Apps submission portal question: "Did you use AI tools? If so, which tools and how?")*

> **Did you use AI tools?**: Yes.
>
> **Which tools and how were they used?**:  
> Our team used AI tools as assistive accelerators while retaining complete human ownership, scientific design, and mathematical verification:
> - **Google Stitch**: Used for initial rapid UI component layout scaffolding, color palette definition, and responsive design structure.
> - **AI Coding Assistants (Antigravity / Gemini / LLMs)**: Used for code scaffolding, boilerplate generation, script formatting for batch NASA POWER API queries, and markdown documentation drafting.
>
> **Strict Guardrails & Human Oversight**:  
> 1. **Zero Hallucinated/Synthetic Data**: AI was strictly prohibited from generating, simulating, or approximating scientific metrics. Every number, p-value, slope, and coordinate displayed in TrendScope originates exclusively from live NASA POWER monthly REST endpoints (MERRA-2 reanalysis and CERES satellite observations) and is processed deterministically via our verified statistical engine (`analyse()`).
> 2. **Independent Benchmark Validation**: All mathematical algorithms (Yue-Pilon Trend-Free Pre-Whitening, Theil-Sen median slopes, and Mann-Kendall statistics) were independently validated against Python’s peer-reviewed `pymannkendall 1.4.3` benchmark library, achieving 100% numerical match (`node test-engine.mjs`).
> 3. **Human Authorship**: Human team members directed all architectural decisions, selected the statistical methodologies, audited data provenance, and conducted end-to-end testing.

---

## 2. Comprehensive Tooling Inventory

### A. Artificial Intelligence & Generative Tools

| Tool / Model | Creator / Provider | Specific Role in Project | Verification & Guardrails |
| :--- | :--- | :--- | :--- |
| **Google Stitch** | Google | Initial UI wireframe generation, layout design tokens, and CSS class scaffolding for the dark Google Stitch theme. | Hand-edited to remove all synthetic metrics, fake satellite HUD counters, and placeholder DOIs; restructured into semantic HTML5 with accessibility tags. |
| **Antigravity / Gemini LLM** | Google DeepMind | Pair-programming assistant for rapid boilerplate implementation, drafting batch fetch scripts (`build-cases.mjs`, `build-grid.mjs`), and formatting technical documentation. | Every generated line of code was inspected, linted, syntax-checked (`node -c`), and audited against project hard rules. |

### B. Open-Source Libraries, Frameworks & Data Sources

| Technology / Tool | Version / Source | Purpose |
| :--- | :--- | :--- |
| **NASA POWER REST API** | Monthly Point Endpoint (`power.larc.nasa.gov`) | Primary open science source providing 2001–2024 monthly records for MERRA-2 meteorology and CERES solar radiation across 5 biophysical parameters. |
| **Vanilla JavaScript (ES Modules)** | ECMAScript 2022+ | Zero-build frontend controller (`app.js`, `trendscope-engine.mjs`) ensuring instant browser execution with no compilation overhead. |
| **Leaflet.js** | 1.9.4 (CDN) | Interactive GIS client rendering the 4×4 subcontinental climate matrix over India with custom SVG layers and popups. |
| **CartoDB Dark Matter** | CARTO / OpenStreetMap | Dark-mode basemap tiles matching the deep-space observatory aesthetic without proprietary map keys. |
| **Tailwind CSS** | 3.4 (CDN) | Utility-first responsive styling and typography system. |
| **Python `pymannkendall`** | 1.4.3 | Independent scientific reference suite used to generate `reference-data.json` for deterministic unit testing. |
| **Node.js** | v24.20.0 | Runtime environment for automated verification suites (`test-engine.mjs`, `check-fakes.mjs`, `audit-provenance.mjs`). |
| **Netlify & Netlify Functions** | Production CDN | Static edge hosting, security headers configuration (`netlify.toml`), and optional serverless CORS proxy. |
| **Service Worker API** | W3C Standard (`sw.js`) | Progressive caching providing offline demo resilience for competition judges. |

---

## 3. Human Oversight & Scientific Verification Protocol

In alignment with Space Apps Challenge integrity guidelines, human team members established a four-pillar verification protocol:

### Pillar 1: Mathematical Engine Parity
The core engine `trendscope-engine.mjs` was protected from generative drift. The engine exports mathematical functions for:
- 12-month calendar climatology de-seasonalization
- Lag-1 autocorrelation determination ($r_1$)
- Yue-Pilon (2002) Trend-Free Pre-Whitening (TFPW)
- Kendall's score ($S$), variance ($\text{var}(S)$ with tie corrections), and standard normal deviate ($Z$)
- Theil-Sen non-parametric median pairwise slope
- Benjamini-Hochberg False Discovery Rate (FDR) control ($q < 0.05$)

This engine was subjected to automated unit testing against 6 gold-standard reference datasets (autocorrelated trend, zero trend, strong trend, short record, tied observations, and falling trend), continuously confirming `ALL MATCH pymannkendall`.

### Pillar 2: The "Zero Synthetic Data" Audit
An automated regular-expression scanner (`scripts/check-fakes.mjs`) was built and executed to enforce that no AI-generated placeholder data remained in the codebase:
- Scanned for and eliminated fake satellite telemetry ("SWARM ACTIVE", "34 BIRDS", "SYNC: 1.4s", "42ms").
- Scanned for and eliminated fictional confidence counters ("99.8% confidence", "1,428 dossiers", "84 crises").
- Scanned for and eliminated fictitious DOIs and fabricated author names.
- Confirmed **0 matches** across the repository.

### Pillar 3: Accessibility & Inclusive Design
Human reviewers verified that the application implements accessible web practices:
- `@media (prefers-reduced-motion: reduce)` CSS rules to immediately suppress animations, rotating radar sweeps, and transitions for users with vestibular sensitivities.
- High-contrast color choices adhering to WCAG standards against the `#04132b` background.
- Semantic HTML tags (`<header>`, `<main>`, `<section>`, `<figure>`, `<figcaption>`, `aria-labelledby`, `aria-describedby`) for screen readers.

### Pillar 4: Honest Scientific Philosophy
AI tools often default to producing "successful-looking" positive demonstrations. Human scientists intentionally directed TrendScope to highlight **non-significant trends** (such as Chennai air temperature, $p = 0.2755$) and **opposite-sign spatial dipoles** (cooling/neutral cells in northwest India alongside warming in the south/east), reinforcing that in climate detection, proving when a trend is *not* present is just as crucial as proving when it is.

---

## 4. Open-Source Science Initiative (OSSI) Compliance
- **Public Repository**: Full commit history, code, and documentation are publicly available on GitHub at [https://github.com/harishcjcoder/TrendScope](https://github.com/harishcjcoder/TrendScope).
- **Reproducibility**: Anyone can clone the repository and run `node test-engine.mjs` or launch the application with any local HTTP server (`python -m http.server 8000` or `npx serve .`) with zero dependencies or proprietary API keys.
- **Data Attribution**: Full credit is explicitly provided to the NASA Langley Research Center POWER Project in the user interface, documentation, and metadata in compliance with NASA open data terms.
