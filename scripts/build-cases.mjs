/**
 * scripts/build-cases.mjs
 * Fetches NASA POWER monthly data (2001-2024) for 4 benchmark locations across all 5 variables.
 * Runs analyse() from trendscope-engine.mjs and caches real JSON files in data/cases/.
 * NO FAKE NUMBERS. Every single value is computed from NASA POWER.
 */

import fs from "fs";
import path from "path";
import { fetchPowerMonthly, parsePowerMonthly, analyse } from "../trendscope-engine.mjs";

const LOCATIONS = [
  { id: "chennai", name: "Chennai (Tamil Nadu, India)", lat: 13.08, lon: 80.27 },
  { id: "jaipur", name: "Jaipur (Rajasthan, India)", lat: 26.91, lon: 75.78 },
  { id: "manaus", name: "Manaus (Amazon Basin, Brazil)", lat: -3.11, lon: -60.02 },
  { id: "svalbard", name: "Svalbard (High Arctic, Norway)", lat: 78.22, lon: 15.65 }
];

const VARIABLES = [
  { id: "T2M", name: "Temperature at 2 Meters", units: "°C" },
  { id: "PRECTOTCORR", name: "Precipitation Corrected", units: "mm/day" },
  { id: "RH2M", name: "Relative Humidity at 2 Meters", units: "%" },
  { id: "GWETROOT", name: "Root Zone Soil Wetness", units: "0-1" },
  { id: "ALLSKY_SFC_SW_DWN", name: "All Sky Surface Solar Irradiance", units: "kW-hr/m²/day" }
];

const START_YEAR = 2001;
const END_YEAR = 2024;
const OUT_DIR = path.resolve("./data/cases");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Fetch helper with 3 retries and exponential backoff
async function fetchWithRetry(lat, lon, variable, startYear, endYear, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000;
  while (attempt < maxRetries) {
    try {
      return await fetchPowerMonthly(lat, lon, variable, startYear, endYear);
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      console.warn(`    Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

async function buildAll() {
  console.log(`Starting real NASA POWER data extraction for 4 locations x 5 variables (2001-2024)...`);
  const manifest = [];

  for (const loc of LOCATIONS) {
    for (const v of VARIABLES) {
      const fileName = `${loc.id}-${v.id.toLowerCase()}.json`;
      const filePath = path.join(OUT_DIR, fileName);

      console.log(`Fetching ${loc.name} -> ${v.id}...`);
      let parsed;
      try {
        const raw = await fetchWithRetry(loc.lat, loc.lon, v.id, START_YEAR, END_YEAR);
        parsed = parsePowerMonthly(raw, v.id);
      } catch (err) {
        console.warn(`  Network fetch failed for ${loc.id} ${v.id}: ${err.message}. Checking local cache...`);
        if (fs.existsSync(filePath)) {
          const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          parsed = {
            rawValues: existing.rawValues,
            dates: existing.dates,
            meta: { units: v.units, longname: v.name }
          };
          console.log(`  Loaded from existing local cache: ${fileName}`);
        } else {
          console.error(`  No local cache available for ${fileName}. Skipping.`);
          continue;
        }
      }

      const analysis = analyse({
        rawValues: parsed.rawValues,
        dates: parsed.dates,
        variable: v.id,
        locationName: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        paramMeta: {
          longname: v.name,
          units: v.units
        },
        sourceName: "NASA POWER Monthly API (MERRA-2 / GEOS-5 / CERES)",
        dateRetrieved: new Date().toISOString().split("T")[0]
      });

      // Calculate % of mean per decade
      const validRaw = analysis.series.raw.filter(x => !isNaN(x));
      const meanRaw = validRaw.length > 0 ? (validRaw.reduce((a, b) => a + b, 0) / validRaw.length) : 0;
      const pctOfMeanPerDecade = meanRaw !== 0 ? (analysis.corrected.slopePerDecade / Math.abs(meanRaw)) * 100 : 0;

      // Clean output object for storage
      const caseRecord = {
        locationId: loc.id,
        locationName: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        variable: v.id,
        variableName: v.name,
        units: v.units,
        startYear: START_YEAR,
        endYear: END_YEAR,
        period: `${START_YEAR}-01 to ${END_YEAR}-12`,
        n: analysis.meta.totalMonths,
        totalMonths: analysis.meta.totalMonths,
        fetchDate: analysis.meta.dateRetrieved,
        provenance: {
          source: "NASA POWER API (MERRA-2 / CERES)",
          url: "https://power.larc.nasa.gov/",
          citation: "These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program (power.larc.nasa.gov)."
        },
        slopePerDecade: analysis.corrected.slopePerDecade,
        pctOfMeanPerDecade: Math.round(pctOfMeanPerDecade * 100) / 100,
        meanRaw: Math.round(meanRaw * 1000) / 1000,
        slopePerMonth: analysis.corrected.slope,
        naiveP: analysis.naive.p,
        naiveZ: analysis.naive.z,
        correctedP: analysis.corrected.p,
        correctedZ: analysis.corrected.z,
        isSignificant: analysis.corrected.p < 0.05,
        confidence: analysis.verdict.confidence,
        verdictHeadline: analysis.verdict.headline,
        missingFraction: analysis.meta.missingFraction,
        dates: analysis.series.dates,
        rawValues: analysis.series.raw,
        deseasonalised: analysis.series.deseasonalised,
        trendLine: analysis.series.trendLine,
        climatology: analysis.series.climatology
      };

      fs.writeFileSync(filePath, JSON.stringify(caseRecord, null, 2), "utf-8");
      console.log(`  -> Saved ${fileName} (slope: ${caseRecord.slopePerDecade.toFixed(3)} ${v.units}/dec, ${caseRecord.pctOfMeanPerDecade}%/dec, corr_p: ${caseRecord.correctedP.toExponential(3)})`);

      manifest.push({
        locationId: loc.id,
        locationName: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        variable: v.id,
        variableName: v.name,
        units: v.units,
        slopePerDecade: caseRecord.slopePerDecade,
        pctOfMeanPerDecade: caseRecord.pctOfMeanPerDecade,
        correctedP: caseRecord.correctedP,
        correctedZ: caseRecord.correctedZ,
        naiveP: caseRecord.naiveP,
        naiveZ: caseRecord.naiveZ,
        isSignificant: caseRecord.isSignificant,
        confidence: caseRecord.confidence,
        headline: caseRecord.verdictHeadline,
        period: caseRecord.period,
        n: caseRecord.n,
        file: `data/cases/${fileName}`
      });

      // Delay 300ms to be gentle with NASA POWER API
      await new Promise(r => setTimeout(r, 300));
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\nAll 20 case files and manifest.json updated in ${OUT_DIR}`);
}

buildAll();

