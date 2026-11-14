# TrendScope: Data Lineage & Provenance Specification (data-sources.md)

**Project**: TrendScope — Earth Observatory Intelligence  
**Challenge**: NASA Space Apps Challenge 2026 — "Be an Earth System Trend Detective"  
**Open Science Compliance**: NASA Open-Source Science Initiative (OSSI)  

---

## 1. Primary Data Provider: NASA POWER
All atmospheric, hydrologic, and solar radiation records queried by TrendScope originate exclusively from the **NASA Prediction Of Worldwide Energy Resources (POWER)** project at NASA Langley Research Center (LaRC), funded through the NASA Earth Science / Applied Sciences Program.

- **Primary API Endpoint**: `https://power.larc.nasa.gov/api/temporal/monthly/point`
- **Cadence**: Monthly Mean Aggregation (`temporal/monthly`)
- **Community Parameter**: Agroclimatology & Sustainable Energy (`community=AG`)
- **Format**: JSON REST response

---

## 2. Ingested Biophysical Variables

| Parameter Identifier | Long Parameter Name | Units | Atmospheric / Satellite Model | Spatial Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **`T2M`** | Temperature at 2 Meters | °C | MERRA-2 (NASA GMAO) | 0.5° × 0.625° |
| **`PRECTOTCORR`** | Precipitation Corrected | mm/day | MERRA-2 (NASA GMAO) | 0.5° × 0.625° |
| **`RH2M`** | Relative Humidity at 2 Meters | % | MERRA-2 (NASA GMAO) | 0.5° × 0.625° |
| **`GWETROOT`** | Root Zone Soil Wetness | 0–1 fraction | MERRA-2 (NASA GMAO) | 0.5° × 0.625° |
| **`ALLSKY_SFC_SW_DWN`** | All Sky Surface Solar Irradiance | kW-hr/m²/day | CERES FLASHFlux / SRB | 1.0° × 1.0° |

---

## 3. Atmospheric Models & Reanalysis Lineage

### MERRA-2 (Modern-Era Retrospective analysis for Research and Applications, Version 2)
- **Producing Organization**: NASA Global Modeling and Assimilation Office (GMAO), Goddard Space Flight Center.
- **Role in TrendScope**: Supplies `T2M`, `PRECTOTCORR`, `RH2M`, and `GWETROOT`.
- **Characteristics**: Integrates millions of space-borne observations (hyperspectral infrared, microwave sounders, radio occultation) into the GEOS-5 atmospheric model, providing a consistent 1980–present reanalysis record.

### CERES (Clouds and the Earth's Radiant Energy System)
- **Producing Organization**: NASA Langley Research Center.
- **Instruments**: CERES instruments aboard Terra, Aqua, Suomi-NPP, and NOAA-20 satellites.
- **Role in TrendScope**: Supplies `ALLSKY_SFC_SW_DWN` via FLASHFlux rapid-release products, measuring top-of-atmosphere and surface radiation balance.

---

## 4. Temporal Domain & Quality Control
- **Temporal Baseline**: 2001-01 through 2024-12 (24 complete calendar years / 288 consecutive monthly vectors per series).
- **Missing Value Sentinel**: NASA POWER encodes absent observations as `-999.0`. TrendScope explicitly filters `-999.0` sentinel values and computes missing data fraction (`missingFraction`).
- **Data Completeness Threshold**: Series with > 20% missing values are flagged as unviable. All 20 offline case studies and 16 grid cells in TrendScope possess 0.0% missing data across the entire 288-month baseline.

---

## 5. Official NASA POWER Citation
Any scientific use or reproduction of data within TrendScope must include the official citation:
> *"These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science / Applied Science Program (https://power.larc.nasa.gov/)."*

---

## 6. Scientific Caveat on Causation & Attribution
In accordance with established climate forensics standards:
> **A statistically significant monotonic trend is NOT standalone proof of human causation.**  
> Non-parametric trend estimation rigorously quantifies the physical velocity and statistical significance of environmental shifts during the 2001–2024 satellite observation era. Determining physical attribution (anthropogenic greenhouse forcing vs. localized land-use change vs. multi-decadal teleconnections like ENSO/IOD) requires coupling TrendScope’s mathematical findings with localized socio-ecological and ground-truth validation.
