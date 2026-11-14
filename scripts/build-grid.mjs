import fs from "fs";
import path from "path";
import { fetchPowerMonthly, parsePowerMonthly, analyse } from "../trendscope-engine.mjs";

const LATS = [29.0, 23.0, 17.0, 11.0]; // North to South
const LONS = [71.0, 77.0, 83.0, 89.0]; // West to East
const VARIABLES = [
  { id: "T2M", name: "Temperature at 2 Meters", units: "°C" },
  { id: "PRECTOTCORR", name: "Precipitation Corrected", units: "mm/day" }
];

const START_YEAR = 2001;
const END_YEAR = 2024;
const OUT_DIR = path.resolve("./data/grid");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

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

// Benjamini-Hochberg False Discovery Rate (FDR) adjustment
function computeFDR(pValues, qThreshold = 0.05) {
  const m = pValues.length;
  const indexed = pValues.map((p, idx) => ({ p, idx }));
  indexed.sort((a, b) => a.p - b.p);

  const qValues = new Array(m);
  let minAdj = 1.0;
  for (let k = m; k >= 1; k--) {
    const p = indexed[k - 1].p;
    const adj = (p * m) / k;
    minAdj = Math.min(minAdj, adj);
    qValues[indexed[k - 1].idx] = Math.min(1.0, minAdj);
  }

  const isFdrSig = qValues.map(q => q < qThreshold);
  return { qValues, isFdrSig };
}

async function buildGrid() {
  console.log("=== Building 4x4 Real NASA POWER Climate Grid over India (lat 11-29, lon 71-89) ===");
  const gridResults = {
    meta: {
      region: "Indian Subcontinent & Surrounding Waters",
      latBounds: [11.0, 29.0],
      lonBounds: [71.0, 89.0],
      rows: LATS.length,
      cols: LONS.length,
      lats: LATS,
      lons: LONS,
      period: `${START_YEAR}-01 to ${END_YEAR}-12`,
      totalMonths: (END_YEAR - START_YEAR + 1) * 12,
      source: "NASA POWER Monthly API (MERRA-2)",
      citation: "These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program (power.larc.nasa.gov)."
    },
    variables: {}
  };

  for (const v of VARIABLES) {
    console.log(`\n--- Fetching & Analysing 4x4 Grid for ${v.name} (${v.id}) ---`);
    const cells = [];
    const pList = [];

    for (let r = 0; r < LATS.length; r++) {
      for (let c = 0; c < LONS.length; c++) {
        const lat = LATS[r];
        const lon = LONS[c];
        const cellId = `cell_${r}_${c}`;
        const cellFileName = `${cellId}-${v.id.toLowerCase()}.json`;
        const cellFilePath = path.join(OUT_DIR, cellFileName);

        console.log(`Cell [${r},${c}] @ (${lat}°N, ${lon}°E) -> ${v.id}...`);
        let parsed;
        try {
          const raw = await fetchWithRetry(lat, lon, v.id, START_YEAR, END_YEAR);
          parsed = parsePowerMonthly(raw, v.id);
        } catch (err) {
          console.warn(`  Network error for [${lat},${lon}]: ${err.message}. Checking existing cache...`);
          if (fs.existsSync(cellFilePath)) {
            const existing = JSON.parse(fs.readFileSync(cellFilePath, "utf-8"));
            parsed = { rawValues: existing.rawValues, dates: existing.dates };
          } else {
            console.error(`  Fatal: cannot obtain data for cell [${r},${c}]. Skipping.`);
            continue;
          }
        }

        const res = analyse({
          rawValues: parsed.rawValues,
          dates: parsed.dates,
          variable: v.id,
          locationName: `Grid Cell (${lat}°N, ${lon}°E)`,
          lat,
          lon,
          paramMeta: { longname: v.name, units: v.units },
          sourceName: "NASA POWER Monthly API (MERRA-2)",
          dateRetrieved: new Date().toISOString().split("T")[0]
        });

        const validRaw = res.series.raw.filter(x => !isNaN(x));
        const meanVal = validRaw.length > 0 ? (validRaw.reduce((a, b) => a + b, 0) / validRaw.length) : 0;
        const pctOfMean = meanVal !== 0 ? (res.corrected.slopePerDecade / Math.abs(meanVal)) * 100 : 0;

        const cellData = {
          cellId,
          row: r,
          col: c,
          lat,
          lon,
          variable: v.id,
          variableName: v.name,
          units: v.units,
          mean: Math.round(meanVal * 1000) / 1000,
          slopePerDecade: res.corrected.slopePerDecade,
          pctOfMeanPerDecade: Math.round(pctOfMean * 100) / 100,
          correctedP: res.corrected.p,
          correctedZ: res.corrected.z,
          naiveP: res.naive.p,
          naiveZ: res.naive.z,
          isSignificant: res.corrected.p < 0.05,
          confidence: res.verdict.confidence,
          dates: res.series.dates,
          rawValues: res.series.raw,
          deseasonalised: res.series.deseasonalised,
          trendLine: res.series.trendLine
        };

        fs.writeFileSync(cellFilePath, JSON.stringify(cellData, null, 2), "utf-8");
        cells.push(cellData);
        pList.push(res.corrected.p);

        await new Promise(r => setTimeout(r, 250));
      }
    }

    // Apply Benjamini-Hochberg FDR correction across all 16 cells
    const { qValues, isFdrSig } = computeFDR(pList, 0.05);
    for (let i = 0; i < cells.length; i++) {
      cells[i].fdrQValue = qValues[i];
      cells[i].isFdrSignificant = isFdrSig[i];
      cells[i].sign = cells[i].slopePerDecade > 0 ? "+" : cells[i].slopePerDecade < 0 ? "-" : "0";
    }

    // Detect opposite sign cells (dipoles/contrasts)
    const posCells = cells.filter(c => c.slopePerDecade > 0);
    const negCells = cells.filter(c => c.slopePerDecade < 0);
    const hasOppositeSigns = posCells.length > 0 && negCells.length > 0;

    gridResults.variables[v.id] = {
      variable: v.id,
      name: v.name,
      units: v.units,
      cells,
      summary: {
        totalCells: cells.length,
        significantCountRaw: cells.filter(c => c.isSignificant).length,
        significantCountFDR: cells.filter(c => c.isFdrSignificant).length,
        positiveCount: posCells.length,
        negativeCount: negCells.length,
        hasOppositeSigns,
        contrastNote: hasOppositeSigns
          ? `Opposite-sign spatial dipole detected: ${posCells.length} cells exhibiting positive decadal drift vs ${negCells.length} cells exhibiting negative drift across the Indian subcontinent.`
          : `Monotonic spatial uniformity: all cells exhibit consistent sign of secular change.`
      }
    };

    console.log(`\n${v.id} FDR Summary:`);
    console.log(`  Raw p < 0.05: ${gridResults.variables[v.id].summary.significantCountRaw} / 16`);
    console.log(`  FDR q < 0.05: ${gridResults.variables[v.id].summary.significantCountFDR} / 16`);
    console.log(`  Opposite signs: ${hasOppositeSigns} (${posCells.length} positive, ${negCells.length} negative)`);
  }

  const gridOutPath = path.join(OUT_DIR, "india-grid.json");
  fs.writeFileSync(gridOutPath, JSON.stringify(gridResults, null, 2), "utf-8");
  console.log(`\nSaved complete 4x4 grid matrix to ${gridOutPath}`);
}

buildGrid();
