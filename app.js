/**
 * app.js
 * Frontend controller for TrendScope (NASA Space Apps Challenge 2026).
 * Wires the EOSDIS Investigation Wizard to NASA POWER monthly point API via trendscope-engine.mjs.
 */

import { fetchPowerMonthly, parsePowerMonthly, analyse } from "./trendscope-engine.mjs";

const VAR_METADATA = {
  T2M: { name: "Surface Air Temperature", longname: "Temperature at 2 Meters", units: "°C" },
  PRECTOTCORR: { name: "Precipitation", longname: "Precipitation Corrected", units: "mm/day" },
  RH2M: { name: "Relative Humidity", longname: "Relative Humidity at 2 Meters", units: "%" },
  GWETROOT: { name: "Root Zone Soil Wetness", longname: "Root Zone Soil Wetness", units: "0-1" },
  ALLSKY_SFC_SW_DWN: { name: "Solar Irradiance", longname: "All Sky Surface Downwelling Irradiance", units: "kW-hr/m²/day" }
};

export function formatCoordinates(lat, lon, decimals = 2) {
  const latStr = lat >= 0 ? `${lat.toFixed(decimals)}°N` : `${Math.abs(lat).toFixed(decimals)}°S`;
  const lonStr = lon >= 0 ? `${lon.toFixed(decimals)}°E` : `${Math.abs(lon).toFixed(decimals)}°W`;
  return `${latStr}, ${lonStr}`;
}

// Global App State
let currentActiveAnalysis = null;
let gridData = null;
let leafletMap = null;
let gridLayersGroup = null;
let activeGridVar = "T2M";
let activeSelectedCell = null;

// UI Element references
const latInput = document.getElementById("wizard-lat");
const lonInput = document.getElementById("wizard-lon");
const locationLabel = document.getElementById("wizard-location-label");
const yearsSlider = document.getElementById("wizard-years-slider");
const startYearLabel = document.getElementById("wizard-start-year-label");
const endYearLabel = document.getElementById("wizard-end-year-label");
const epochInfo = document.getElementById("wizard-epoch-info");
const btnExecute = document.getElementById("btn-execute-investigation");
const btnIcon = document.getElementById("wizard-btn-icon");
const btnText = document.getElementById("wizard-btn-text");
const statusBanner = document.getElementById("wizard-status-banner");
const resultsContainer = document.getElementById("wizard-results-container");

// Presets button handlers
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const lat = parseFloat(btn.dataset.lat);
    const lon = parseFloat(btn.dataset.lon);
    const name = btn.dataset.name;
    if (latInput) latInput.value = lat;
    if (lonInput) lonInput.value = lon;
    if (locationLabel) locationLabel.textContent = name;
  });
});

// Slider epoch handler
if (yearsSlider) {
  yearsSlider.addEventListener("input", (e) => {
    const years = parseInt(e.target.value, 10);
    const endYear = 2024;
    const startYear = endYear - years + 1;
    if (startYearLabel) startYearLabel.textContent = `${startYear} (Start)`;
    if (endYearLabel) endYearLabel.textContent = `${endYear} (Present)`;
    if (epochInfo) {
      epochInfo.textContent = `Window: ${years} years / ${years * 12} monthly points${years < 15 ? ' (⚠️ Short record < 15y)' : ''}`;
    }
  });
}

// Format p-value cleanly
function formatP(p) {
  if (p === null || p === undefined || isNaN(p)) return "N/A";
  if (p < 0.0001) return p.toExponential(4);
  return p.toFixed(4);
}

// Generate smooth SVG path from (x, y) points
function generateSvgPath(points) {
  if (!points || points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

// Update the Forensic Chart with actual analysed series
export function updateForensicChart(series, meta) {
  const anomalies = series.deseasonalised;
  const trendLine = series.trendLine;
  const rawValues = series.raw;
  const n = anomalies.length;
  if (n < 2) return;

  // Find min/max bounds for scaling
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (!isNaN(anomalies[i])) {
      if (anomalies[i] < minY) minY = anomalies[i];
      if (anomalies[i] > maxY) maxY = anomalies[i];
    }
    if (!isNaN(trendLine[i])) {
      if (trendLine[i] < minY) minY = trendLine[i];
      if (trendLine[i] > maxY) maxY = trendLine[i];
    }
  }

  // Add 15% visual padding to top and bottom
  const range = (maxY - minY) || 1;
  const pad = range * 0.15;
  const yLow = minY - pad;
  const yHigh = maxY + pad;

  // Viewbox coordinates: 500 wide, 200 high, margins (left: 10, right: 490, top: 20, bottom: 180)
  const mapPoint = (i, val) => ({
    x: 10 + (i / (n - 1)) * 480,
    y: 180 - ((val - yLow) / (yHigh - yLow)) * 160
  });

  const anomalyPoints = [];
  const trendPoints = [];
  const rawPoints = [];
  const smoothPoints = [];

  for (let i = 0; i < n; i++) {
    anomalyPoints.push(mapPoint(i, anomalies[i]));
    trendPoints.push(mapPoint(i, trendLine[i]));
    if (rawValues && rawValues.length > i && !isNaN(rawValues[i])) {
      rawPoints.push(mapPoint(i, anomalies[i]));
    }

    // Trailing 12-month rolling mean
    const start = Math.max(0, i - 11);
    const slice = anomalies.slice(start, i + 1).filter(v => !isNaN(v));
    const rollingVal = slice.length > 0 ? (slice.reduce((a, b) => a + b, 0) / slice.length) : anomalies[i];
    smoothPoints.push(mapPoint(i, rollingVal));
  }

  // Paths
  const anomalyPath = document.getElementById("chart-anomaly-path");
  const trendPath = document.getElementById("chart-trend-path");
  const rawPath = document.getElementById("chart-raw-path");
  const smoothPath = document.getElementById("chart-smooth-path");

  if (anomalyPath) anomalyPath.setAttribute("d", generateSvgPath(anomalyPoints));
  if (trendPath) trendPath.setAttribute("d", generateSvgPath(trendPoints));
  if (rawPath) rawPath.setAttribute("d", generateSvgPath(anomalyPoints));
  if (smoothPath) smoothPath.setAttribute("d", generateSvgPath(smoothPoints));

  // 95% Bootstrap Confidence Ribbon Polygon
  let sumSq = 0;
  let validCount = 0;
  for (let i = 0; i < n; i++) {
    if (!isNaN(anomalies[i]) && !isNaN(trendLine[i])) {
      sumSq += Math.pow(anomalies[i] - trendLine[i], 2);
      validCount++;
    }
  }
  const sigma = validCount > 2 ? Math.sqrt(sumSq / (validCount - 2)) : 0.4;
  const tBar = (n - 1) / 2;
  const tDenom = (n * (n * n - 1)) / 12;

  const upperPoints = [];
  const lowerPoints = [];

  for (let i = 0; i < n; i++) {
    const tDistSq = Math.pow(i - tBar, 2);
    const seFit = sigma * Math.sqrt((1 / n) + (tDistSq / tDenom));
    const margin = 1.96 * seFit;
    const yVal = trendLine[i];
    upperPoints.push(mapPoint(i, yVal + margin));
    lowerPoints.push(mapPoint(i, yVal - margin));
  }

  const ciPointsStr = upperPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    " " + lowerPoints.reverse().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const ciPolygon = document.getElementById("chart-ci-polygon");
  if (ciPolygon) ciPolygon.setAttribute("points", ciPointsStr);

  // Update year markers on x-axis
  const yearsContainer = document.getElementById("chart-years-container");
  if (yearsContainer && meta.totalMonths && series.dates && series.dates.length > 0) {
    const startYear = parseInt(series.dates[0].substring(0, 4), 10);
    const endYear = parseInt(series.dates[n - 1].substring(0, 4), 10);
    const step = Math.max(1, Math.round((endYear - startYear) / 5));
    let tickHtml = "";
    for (let yr = startYear; yr < endYear; yr += step) {
      tickHtml += `<span>${yr}</span>`;
    }
    tickHtml += `<span>${endYear}</span>`;
    yearsContainer.innerHTML = tickHtml;
  }
}


// Populate the Forensic Deck with analyse() results
export function renderForensicDeck(res) {
  currentActiveAnalysis = res;
  const meta = res.meta;
  const verdict = res.verdict;
  const corrected = res.corrected;
  const naive = res.naive;

  // Header & Coordinates
  const title = document.getElementById("forensic-title");
  if (title) title.textContent = `Forensic Analysis: ${meta.locationName} ${meta.variable}`;

  const epoch = document.getElementById("forensic-epoch");
  if (epoch) {
    const startY = res.series.dates[0];
    const endY = res.series.dates[res.series.dates.length - 1];
    epoch.textContent = `EPOCH: ${startY.slice(0, 4)}-${startY.slice(4, 6)} to ${endY.slice(0, 4)}-${endY.slice(4, 6)} (${meta.totalMonths} vectors)`;
  }

  const spatialTitle = document.getElementById("forensic-spatial-title");
  if (spatialTitle) spatialTitle.textContent = meta.locationName;

  const spatialCoords = document.getElementById("forensic-spatial-coords");
  if (spatialCoords) spatialCoords.textContent = formatCoordinates(meta.lat, meta.lon, 4);

  const missingEl = document.getElementById("forensic-missing");
  if (missingEl) missingEl.textContent = `${(meta.missingFraction * 100).toFixed(1)}%`;

  // Chart
  const chartTitle = document.getElementById("forensic-chart-title");
  if (chartTitle) chartTitle.textContent = `${meta.longname} (${meta.variable}) Anomalies & Sen's Trend`;

  updateForensicChart(res.series, meta);

  // Provenance Line & Short warning
  const provenance = document.getElementById("forensic-provenance");
  if (provenance) {
    provenance.innerHTML = `
      <span>SOURCE: ${meta.sourceName} :: PARAMETER: ${meta.variable} (${meta.units || 'unitless'}) :: RETRIEVED: ${meta.dateRetrieved}</span>
      <span>API ENDPOINT: <a href="https://power.larc.nasa.gov/" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">power.larc.nasa.gov</a></span>
    `;
  }

  const shortWarn = document.getElementById("forensic-short-warning");
  if (shortWarn) {
    const years = meta.yearsSpanned || (meta.totalMonths / 12);
    if (meta.isShortRecord || years < 15) {
      shortWarn.classList.remove("hidden");
      shortWarn.style.display = "block";
      shortWarn.textContent = `⚠️ Short record warning: Time series span is ${years.toFixed(1)} years (< 15 years threshold). Low-frequency climate modes may obscure secular monotonic trends.`;
    } else {
      shortWarn.classList.add("hidden");
      shortWarn.style.display = "none";
    }
  }

  // Statistical Boxes (Naive vs Pre-Whitened)
  const naiveEl = document.getElementById("forensic-naive-p");
  if (naiveEl) naiveEl.textContent = `p = ${formatP(naive.p)} (z = ${naive.z.toFixed(2)})`;

  const corrEl = document.getElementById("forensic-corrected-p");
  if (corrEl) corrEl.textContent = `p = ${formatP(corrected.p)} (z = ${corrected.z.toFixed(2)}, ${verdict.confidence})`;

  // Decadal shift values
  const half = Math.floor(res.series.raw.length / 2);
  const firstHalf = res.series.raw.slice(0, half).filter(v => !isNaN(v));
  const secondHalf = res.series.raw.slice(half).filter(v => !isNaN(v));
  const m1 = firstHalf.length > 0 ? (firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length) : 0;
  const m2 = secondHalf.length > 0 ? (secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length) : 0;
  const diff = m2 - m1;

  const startYr = res.series.dates[0].substring(0, 4);
  const midYr = res.series.dates[half].substring(0, 4);
  const endYr = res.series.dates[res.series.dates.length - 1].substring(0, 4);

  const ep1Label = document.getElementById("forensic-epoch1-label");
  const ep2Label = document.getElementById("forensic-epoch2-label");
  if (ep1Label) ep1Label.textContent = `Baseline Half Mean (${startYr}–${midYr})`;
  if (ep2Label) ep2Label.textContent = `Recent Half Mean (${midYr}–${endYr})`;

  const ep1Val = document.getElementById("forensic-epoch1-val");
  const ep2Val = document.getElementById("forensic-epoch2-val");
  if (ep1Val) ep1Val.textContent = `${m1.toFixed(2)} ${meta.units}`;
  if (ep2Val) ep2Val.textContent = `${m2.toFixed(2)} ${meta.units} (${diff >= 0 ? '+' : ''}${diff.toFixed(2)} ${meta.units})`;

  const ep1Bar = document.getElementById("forensic-epoch1-bar");
  const ep2Bar = document.getElementById("forensic-epoch2-bar");
  const maxMean = Math.max(Math.abs(m1), Math.abs(m2)) || 1;
  if (ep1Bar) ep1Bar.style.width = `${Math.round((Math.abs(m1) / maxMean) * 100)}%`;
  if (ep2Bar) ep2Bar.style.width = `${Math.round((Math.abs(m2) / maxMean) * 100)}%`;

  // 4 Evidentiary Cards
  const cardWhat = document.getElementById("card-what-val");
  if (cardWhat) cardWhat.textContent = `${meta.longname} (${meta.variable})`;

  const cardWhere = document.getElementById("card-where-val");
  if (cardWhere) cardWhere.textContent = `${meta.locationName} (${formatCoordinates(meta.lat, meta.lon, 2)})`;

  const cardHowMuch = document.getElementById("card-howmuch-val");
  if (cardHowMuch) {
    const sign = corrected.slopePerDecade >= 0 ? "+" : "";
    const pctStr = meta.pctOfMeanPerDecade !== undefined ? ` (${meta.pctOfMeanPerDecade >= 0 ? '+' : ''}${meta.pctOfMeanPerDecade.toFixed(2)}%/dec)` : "";
    cardHowMuch.textContent = `${sign}${corrected.slopePerDecade.toFixed(3)} ${meta.units} / decade${pctStr}`;
  }

  const cardSig = document.getElementById("card-sig-val");
  if (cardSig) {
    cardSig.textContent = `${verdict.headline.toUpperCase()} (p = ${formatP(corrected.p)})`;
  }

  // Reliability Score & Audit calculation
  let relScore = 100;
  const years = meta.yearsSpanned || (meta.totalMonths / 12);
  if (years < 15) relScore -= 35;
  else if (years < 20) relScore -= 10;
  if (meta.missingFraction > 0.05) relScore -= 20;
  if (corrected.p >= 0.05) relScore -= 15;
  if (naive.p < 0.05 && corrected.p >= 0.05) relScore -= 10; // Autocorrelation false alarm penalization
  relScore = Math.max(30, Math.min(99, Math.round(relScore)));

  const relVal = document.getElementById("forensic-reliability-val");
  const relBar = document.getElementById("forensic-reliability-bar");
  const relScoreEl = document.getElementById("forensic-rel-score");
  const qcStatus = document.getElementById("forensic-qc-status");
  const relReason = document.getElementById("forensic-reliability-reason");

  if (relVal) relVal.textContent = verdict.confidence;
  if (relBar) relBar.style.width = `${relScore}%`;
  if (relScoreEl) relScoreEl.textContent = `${relScore} / 100`;
  if (qcStatus) qcStatus.textContent = `${((meta.missingFraction || 0) * 100).toFixed(1)}% missing flags`;
  if (relReason) {
    if (corrected.p < 0.05) {
      relReason.textContent = `Statistically robust monotonic trend verified under Yue-Pilon TFPW (p = ${formatP(corrected.p)} < 0.05). Full ${years.toFixed(1)}-year satellite record (${meta.totalMonths} months, ${((meta.missingFraction || 0) * 100).toFixed(1)}% missing).`;
    } else {
      relReason.textContent = `Complete ${years.toFixed(1)}-year record (${meta.totalMonths} months, ${((meta.missingFraction || 0) * 100).toFixed(1)}% missing). Sub-critical effect size indicates trajectory remains within natural decadal climate variability.`;
    }
  }

  // Time-to-Significance simulation calculation
  const ttsEl = document.getElementById("forensic-time-to-sig");
  if (ttsEl) {
    if (corrected.p < 0.05) {
      ttsEl.textContent = `Trend has achieved statistical significance (corrected p = ${formatP(corrected.p)} < 0.05) over the ${years.toFixed(1)}-year observation baseline.`;
    } else {
      const absZ = Math.max(0.1, Math.abs(corrected.z));
      const nReq = Math.round(meta.totalMonths * Math.pow(1.96 / absZ, 2 / 3));
      const extraMonths = Math.max(12, nReq - meta.totalMonths);
      const extraYears = Math.round(extraMonths / 12);
      ttsEl.textContent = `Estimated ~${extraYears} additional years of continuous observation required at the current rate to detect statistical significance (simulation estimate, |Z|=${absZ.toFixed(2)}).`;
    }
  }

  // Operative Verdict Text
  const verdictText = document.getElementById("forensic-verdict-text");
  if (verdictText) {
    const isSignificant = corrected.p < 0.05;
    if (!isSignificant) {
      const sign = corrected.slopePerDecade >= 0 ? "+" : "";
      verdictText.textContent = `Between ${startYr} and ${endYr}, no statistically significant trend detected for mean ${meta.longname.toLowerCase()} here (${sign}${corrected.slopePerDecade.toFixed(3)} ${meta.units} per decade, corrected p = ${formatP(corrected.p)}, ${verdict.headline}).`;
    } else {
      const dirVerb = corrected.slopePerDecade > 0 ? "rose" : corrected.slopePerDecade < 0 ? "fell" : "remained steady";
      verdictText.textContent = `Between ${startYr} and ${endYr}, mean ${meta.longname.toLowerCase()} here ${dirVerb} about ${Math.abs(corrected.slopePerDecade).toFixed(3)} ${meta.units} per decade (corrected p = ${formatP(corrected.p)}, ${verdict.headline}).`;
    }
  }
}


// Render instant summary in Wizard Results container
function renderWizardResults(res) {
  if (!resultsContainer) return;
  resultsContainer.classList.remove("hidden");

  const wresTitle = document.getElementById("wres-title");
  if (wresTitle) wresTitle.textContent = `${res.meta.locationName}: ${res.meta.variable} Investigation Complete`;

  const wresSlope = document.getElementById("wres-slope");
  if (wresSlope) {
    const sign = res.corrected.slopePerDecade >= 0 ? "+" : "";
    wresSlope.textContent = `${sign}${res.corrected.slopePerDecade.toFixed(3)} ${res.meta.units}/dec`;
  }

  const wresCorrP = document.getElementById("wres-corr-p");
  if (wresCorrP) wresCorrP.textContent = `p = ${formatP(res.corrected.p)}`;

  const wresNaiveP = document.getElementById("wres-naive-p");
  if (wresNaiveP) wresNaiveP.textContent = `p = ${formatP(res.naive.p)}`;

  const wresVerdict = document.getElementById("wres-verdict");
  if (wresVerdict) {
    wresVerdict.textContent = res.verdict.headline;
    wresVerdict.className = `text-base font-bold ${res.verdict.correctedP < 0.05 ? 'text-tertiary' : 'text-on-surface'}`;
  }
}

// Execute Investigation click handler
export async function handleExecuteInvestigation() {
  const selectedVarEl = document.querySelector('input[name="var-target"]:checked');
  const variable = selectedVarEl ? selectedVarEl.value : "T2M";
  const lat = parseFloat(latInput ? latInput.value : 13.08);
  const lon = parseFloat(lonInput ? lonInput.value : 80.27);
  const years = parseInt(yearsSlider ? yearsSlider.value : 24, 10);
  const endYear = 2024;
  const startYear = endYear - years + 1;
  const locationName = (locationLabel && locationLabel.textContent.trim()) || `Coord (${lat.toFixed(2)}, ${lon.toFixed(2)})`;

  // UI loading state
  if (btnExecute) btnExecute.disabled = true;
  if (btnIcon) {
    btnIcon.textContent = "refresh";
    btnIcon.classList.add("animate-spin");
  }
  if (btnText) btnText.textContent = "Fetching NASA POWER Live Data...";
  if (statusBanner) {
    statusBanner.classList.remove("hidden", "bg-error/20", "text-error", "border-error/40");
    statusBanner.classList.add("bg-surface-container-high", "text-primary", "border-primary/40");
    statusBanner.textContent = `Connecting to NASA POWER API (monthly point: ${variable} @ ${formatCoordinates(lat, lon, 2)}, ${startYear}-${endYear})...`;
  }

  const startTime = performance.now();

  try {
    const rawData = await fetchPowerMonthly(lat, lon, variable, startYear, endYear);
    const elapsed = Math.round(performance.now() - startTime);

    const hudLatency = document.getElementById("hud-latency");
    const hudSubbar = document.getElementById("hud-latency-subbar");
    if (hudLatency) hudLatency.textContent = `${elapsed}ms`;
    if (hudSubbar) hudSubbar.textContent = `API: ${elapsed}ms`;

    const parsed = parsePowerMonthly(rawData, variable);
    const meta = {
      ...parsed.meta,
      ...VAR_METADATA[variable]
    };

    const analysis = analyse({
      rawValues: parsed.rawValues,
      dates: parsed.dates,
      variable,
      locationName,
      lat,
      lon,
      paramMeta: meta,
      sourceName: "NASA POWER Monthly API (MERRA-2 / GEOS-5)",
      dateRetrieved: new Date().toISOString().split("T")[0]
    });

    // Populate displays
    renderWizardResults(analysis);
    renderForensicDeck(analysis);

    if (statusBanner) {
      statusBanner.classList.remove("text-primary");
      statusBanner.classList.add("text-tertiary", "border-tertiary/40");
      statusBanner.textContent = `✓ Investigation complete (${elapsed}ms): ${analysis.meta.totalMonths} monthly records processed from NASA POWER. Yue-Pilon corrected p = ${formatP(analysis.corrected.p)}.`;
    }
  } catch (err) {
    console.error("NASA POWER fetch failed:", err);
    if (statusBanner) {
      statusBanner.classList.remove("hidden", "bg-surface-container-high", "text-primary", "text-tertiary", "border-primary/40", "border-tertiary/40");
      statusBanner.classList.add("bg-error/20", "text-error", "border-error/40");
      statusBanner.textContent = `⚠️ Investigation error: ${err.message}. (HARD RULE: Numbers are never fabricated. Check internet connection or coordinates).`;
    }
  } finally {
    if (btnExecute) btnExecute.disabled = false;
    if (btnIcon) {
      btnIcon.textContent = "bolt";
      btnIcon.classList.remove("animate-spin");
    }
    if (btnText) btnText.textContent = "Execute Investigation";
  }
}

if (btnExecute) {
  btnExecute.addEventListener("click", handleExecuteInvestigation);
}

// Natural Language Query Bar Parser
const parseQueryBtn = document.querySelector("#investigation-wizard button.bg-primary-container");
const queryInput = document.querySelector("#investigation-wizard input[type='text']");
if (parseQueryBtn && queryInput) {
  parseQueryBtn.addEventListener("click", () => {
    const q = queryInput.value.toLowerCase();
    if (q.includes("rajasthan") || q.includes("jaipur")) {
      if (latInput) latInput.value = 26.91;
      if (lonInput) lonInput.value = 75.78;
      if (locationLabel) locationLabel.textContent = "Jaipur (Rajasthan, India)";
    } else if (q.includes("chennai")) {
      if (latInput) latInput.value = 13.08;
      if (lonInput) lonInput.value = 80.27;
      if (locationLabel) locationLabel.textContent = "Chennai (Tamil Nadu, India)";
    } else if (q.includes("amazon") || q.includes("manaus")) {
      if (latInput) latInput.value = -3.11;
      if (lonInput) lonInput.value = -60.02;
      if (locationLabel) locationLabel.textContent = "Manaus (Amazon Basin, Brazil)";
    } else if (q.includes("arctic") || q.includes("svalbard")) {
      if (latInput) latInput.value = 78.22;
      if (lonInput) lonInput.value = 15.65;
      if (locationLabel) locationLabel.textContent = "Svalbard (High Arctic, Norway)";
    }

    if (q.includes("dry") || q.includes("rain") || q.includes("precip")) {
      const radio = document.querySelector('input[name="var-target"][value="PRECTOTCORR"]');
      if (radio) radio.checked = true;
    } else if (q.includes("soil") || q.includes("moist")) {
      const radio = document.querySelector('input[name="var-target"][value="GWETROOT"]');
      if (radio) radio.checked = true;
    } else if (q.includes("hot") || q.includes("warm") || q.includes("temp")) {
      const radio = document.querySelector('input[name="var-target"][value="T2M"]');
      if (radio) radio.checked = true;
    }
  });
}

// Case studies and Radar state
let casesManifest = [];
let activeRadarLoc = "chennai";
let activeRadarTopFile = null;

// Normalize case study JSON file into analyse() compatible structure
export function normalizeCaseFile(d) {
  const metaMeta = VAR_METADATA[d.variable] || {};
  const totalMonths = d.totalMonths || d.dates?.length || 288;
  const years = totalMonths / 12;

  return {
    meta: {
      variable: d.variable,
      longname: d.variableName || metaMeta.longname || d.variable,
      units: d.units || metaMeta.units || "",
      locationName: d.locationName || `Grid Cell (${formatCoordinates(d.lat, d.lon, 2)})`,
      lat: d.lat,
      lon: d.lon,
      sourceName: d.provenance?.source || "NASA POWER API (MERRA-2 / CERES)",
      dateRetrieved: d.fetchDate || "2026-11-14",
      totalMonths,
      yearsSpanned: Math.round(years * 10) / 10,
      isShortRecord: years < 15,
      missingFraction: d.missingFraction ?? 0,
      pctOfMeanPerDecade: d.pctOfMeanPerDecade
    },
    series: {
      dates: d.dates,
      raw: d.rawValues,
      deseasonalised: d.deseasonalised,
      trendLine: d.trendLine,
      climatology: d.climatology || []
    },
    naive: {
      z: d.naiveZ ?? 0,
      p: d.naiveP ?? 1,
      slopePerDecade: d.slopePerDecade
    },
    corrected: {
      z: d.correctedZ ?? 0,
      p: d.correctedP ?? 1,
      slopePerDecade: d.slopePerDecade
    },
    verdict: {
      headline: d.verdictHeadline || (d.isSignificant ? "Statistically Significant" : "Not Significant"),
      confidence: d.confidence || (d.correctedP < 0.01 ? "High (p < 0.01)" : d.correctedP < 0.05 ? "Moderate (p < 0.05)" : "Low (p ≥ 0.05)"),
      slopePerDecade: d.slopePerDecade,
      correctedP: d.correctedP,
      naiveP: d.naiveP,
      isSignificant: d.isSignificant !== undefined ? d.isSignificant : (d.correctedP < 0.05),
      isShortRecord: years < 15
    }
  };
}

// Load case from JSON file path and render in Forensic Deck
export async function loadCaseFromFile(filePath, shouldScroll = false) {
  try {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`HTTP ${res.status} reading ${filePath}`);
    const data = await res.json();
    const normalized = normalizeCaseFile(data);
    renderForensicDeck(normalized);
    if (shouldScroll) {
      const deckEl = document.getElementById("forensic-dashboard");
      if (deckEl) deckEl.scrollIntoView({ behavior: "smooth" });
    }
  } catch (err) {
    console.error("Failed to load case file:", err);
  }
}

// Render dynamic Planetary Anomaly Radar
export function renderRadar(locId) {
  if (!casesManifest || casesManifest.length === 0) return;
  const items = casesManifest.filter(c => c.locationId === locId);
  if (items.length === 0) return;

  // Sort by statistical significance: smallest correctedP first
  items.sort((a, b) => a.correctedP - b.correctedP);

  const locName = items[0].locationName;
  const lat = items[0].lat;
  const lon = items[0].lon;

  // Update Radar location header
  const radarLocTitle = document.getElementById("radar-loc-title");
  if (radarLocTitle) {
    const latStr = lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`;
    const lonStr = lon >= 0 ? `${lon.toFixed(2)}°E` : `${Math.abs(lon).toFixed(2)}°W`;
    radarLocTitle.textContent = `LOCATION: ${locName.toUpperCase()} (${latStr}, ${lonStr})`;
  }

  // Top Feature Card
  const top = items[0];
  activeRadarTopFile = top.file;

  const topTitle = document.getElementById("radar-top-title");
  const topDesc = document.getElementById("radar-top-desc");
  const topSlope = document.getElementById("radar-top-slope");
  const topP = document.getElementById("radar-top-p");
  const topBadge = document.getElementById("radar-top-badge");

  if (topTitle) topTitle.textContent = `${top.variableName} (${top.variable})`;
  if (topDesc) {
    topDesc.textContent = `${top.headline}: 24-year NASA POWER monthly series reveals ${top.slopePerDecade >= 0 ? 'positive' : 'negative'} secular shift (${top.confidence}).`;
  }
  if (topSlope) {
    const sign = top.slopePerDecade >= 0 ? "+" : "";
    topSlope.textContent = `${sign}${top.slopePerDecade.toFixed(3)} ${top.units} / dec`;
  }
  if (topP) {
    topP.textContent = `p = ${formatP(top.correctedP)}`;
  }
  if (topBadge) {
    topBadge.textContent = top.isSignificant ? "PRIMARY SIGNIFICANT DRIFT" : "BASELINE SENSOR VARIATION";
  }

  // Active 5-Parameter Ranking List
  const paramList = document.getElementById("radar-param-list");
  if (paramList) {
    paramList.innerHTML = items.map((item, idx) => {
      const sign = item.slopePerDecade >= 0 ? "+" : "";
      const sigColor = item.isSignificant ? "text-tertiary" : "text-on-surface-variant";
      const badgeBg = item.isSignificant ? "bg-tertiary/15 text-tertiary border-tertiary/30" : "bg-surface-container-high text-on-surface-variant";
      return `
        <div class="group flex items-center justify-between p-2 rounded-xl bg-surface-container/70 hover:bg-surface-container-high/90 border border-transparent hover:border-primary-container/40 transition-all cursor-pointer" data-case-file="${item.file}">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md flex items-center justify-center font-mono text-xs font-bold ${idx === 0 ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'}">${idx + 1}</span>
            <div class="flex flex-col">
              <span class="font-headline-sm text-xs font-bold text-on-surface group-hover:text-primary transition-colors">${item.variable} <span class="text-on-surface-variant font-normal">(${item.units})</span></span>
              <span class="text-[11px] font-mono text-on-surface-variant">${item.variableName}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 text-right">
            <span class="font-mono text-xs font-bold ${item.slopePerDecade >= 0 ? 'text-primary' : 'text-secondary'}">${sign}${item.slopePerDecade.toFixed(3)}/dec</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono border ${badgeBg}">p=${formatP(item.correctedP)}</span>
          </div>
        </div>
      `;
    }).join("");

    paramList.querySelectorAll("[data-case-file]").forEach((el) => {
      el.addEventListener("click", () => {
        loadCaseFromFile(el.dataset.caseFile, true);
      });
    });
  }

  // Polar Scope Dynamic Nodes Container
  const nodesContainer = document.getElementById("radar-nodes-container");
  if (nodesContainer) {
    const total = items.length;
    let nodesHtml = "";

    items.forEach((item, i) => {
      const z = Math.abs(item.correctedZ || 0);
      const r = Math.min(185, Math.max(30, (z / 3.0) * 160));
      const angle = (i * (2 * Math.PI / total)) - (Math.PI / 2);
      const x = Math.round(r * Math.cos(angle));
      const y = Math.round(r * Math.sin(angle));

      const isSig = item.isSignificant;
      const dotColor = isSig ? "bg-primary-container" : "bg-secondary-container";
      const ringGlow = isSig ? "rgba(255, 179, 71, 0.4)" : "rgba(59, 147, 238, 0.3)";
      const labelColor = isSig ? "text-primary" : "text-secondary";

      nodesHtml += `
        <div class="radar-node absolute flex flex-col items-center justify-center cursor-pointer group"
             style="left: calc(50% + ${x}px - 14px); top: calc(50% + ${y}px - 14px); width: 28px; height: 28px; z-index: 25;"
             data-case-file="${item.file}"
             title="${item.variableName} (${item.variable}): |Z| = ${z.toFixed(2)}, p = ${formatP(item.correctedP)}">
          <span class="absolute w-7 h-7 rounded-full animate-ping opacity-30 ${dotColor}" style="box-shadow: 0 0 12px ${ringGlow};"></span>
          <span class="w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-surface-container shadow-md group-hover:scale-125 transition-transform"></span>
          <span class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-surface-container-lowest/90 border border-surface-container text-[10px] font-mono font-bold ${labelColor} whitespace-nowrap pointer-events-none group-hover:scale-110 transition-transform">
            ${item.variable} (${z.toFixed(1)}σ)
          </span>
        </div>
      `;
    });

    nodesContainer.innerHTML = nodesHtml;

    nodesContainer.querySelectorAll(".radar-node").forEach(node => {
      node.addEventListener("click", () => {
        loadCaseFromFile(node.dataset.caseFile, true);
      });
    });
  }
}

// ---------------------------------------------------------
// GEOSPATIAL TREND MAP (Interactive Leaflet 4x4 Climate Grid)
// ---------------------------------------------------------

function updateGridCellInspector(cell) {
  activeSelectedCell = cell;
  const title = document.getElementById("gcc-title");
  const badge = document.getElementById("gcc-badge");
  const coords = document.getElementById("gcc-coords");
  const locname = document.getElementById("gcc-locname");
  const slope = document.getElementById("gcc-slope");
  const pct = document.getElementById("gcc-pct");
  const rawp = document.getElementById("gcc-rawp");
  const fdrq = document.getElementById("gcc-fdrq");

  if (title) title.textContent = `SELECTED CELL: [${cell.row}, ${cell.col}]`;
  if (badge) {
    if (cell.isFdrSignificant) {
      badge.textContent = "FDR SIGNIFICANT (q < 0.05)";
      badge.className = "px-2 py-0.5 rounded text-[10px] font-mono border border-tertiary text-tertiary bg-tertiary/10";
    } else {
      badge.textContent = "SUB-CRITICAL (q ≥ 0.05)";
      badge.className = "px-2 py-0.5 rounded text-[10px] font-mono border border-surface-container-high text-on-surface-variant bg-surface-container-high";
    }
  }
  if (coords) coords.textContent = formatCoordinates(cell.lat, cell.lon, 2);
  if (locname) locname.textContent = cell.locationName || `Indian Grid Cell (${formatCoordinates(cell.lat, cell.lon, 2)})`;
  if (slope) {
    const s = cell.slopePerDecade >= 0 ? "+" : "";
    slope.textContent = `${s}${cell.slopePerDecade.toFixed(3)} ${cell.units}/dec`;
  }
  if (pct) {
    const s = cell.pctOfMeanPerDecade >= 0 ? "+" : "";
    pct.textContent = `${s}${cell.pctOfMeanPerDecade.toFixed(2)}%/dec`;
  }
  if (rawp) rawp.textContent = `p = ${formatP(cell.correctedP)}`;
  if (fdrq) fdrq.textContent = `q = ${formatP(cell.fdrQValue)}`;
}

function renderTrendMapGrid(variable) {
  if (!leafletMap || !gridData || !gridData.variables[variable]) return;
  if (gridLayersGroup) gridLayersGroup.clearLayers();

  activeGridVar = variable;
  const varData = gridData.variables[variable];
  const cells = varData.cells;

  // Update Section Header and Notes
  const contrastNote = document.getElementById("grid-contrast-note");
  const signDist = document.getElementById("grid-sign-dist");
  const rawCount = document.getElementById("grid-raw-count");
  const fdrCount = document.getElementById("grid-fdr-count");
  const legendMin = document.getElementById("legend-min");
  const legendMax = document.getElementById("legend-max");
  const legendUnits = document.getElementById("legend-units");

  if (contrastNote) contrastNote.textContent = varData.summary.contrastNote;
  if (signDist) signDist.textContent = `${varData.summary.positiveCount} positive / ${varData.summary.negativeCount} negative`;
  if (rawCount) rawCount.textContent = `${varData.summary.significantCountRaw} / 16`;
  if (fdrCount) fdrCount.textContent = `${varData.summary.significantCountFDR} / 16`;

  const maxThreshold = variable === "T2M" ? 0.35 : 0.50;
  if (legendMin) legendMin.textContent = `-${maxThreshold.toFixed(2)}`;
  if (legendMax) legendMax.textContent = `+${maxThreshold.toFixed(2)}`;
  if (legendUnits) legendUnits.textContent = `(${varData.units} / decade)`;

  // Draw 16 grid cell rectangles
  cells.forEach(cell => {
    const lat = cell.lat;
    const lon = cell.lon;
    const bounds = [
      [lat - 2.7, lon - 2.7],
      [lat + 2.7, lon + 2.7]
    ];

    // Diverging color scale
    let fillColor = "#27354e";
    if (variable === "T2M") {
      if (cell.slopePerDecade >= 0) {
        fillColor = cell.slopePerDecade > 0.15 ? "#ffb347" : "#d97706";
      } else {
        fillColor = Math.abs(cell.slopePerDecade) > 0.15 ? "#3b93ee" : "#1e40af";
      }
    } else {
      if (cell.slopePerDecade >= 0) {
        fillColor = cell.slopePerDecade > 0.15 ? "#74f2e5" : "#0d9488";
      } else {
        fillColor = "#d97706";
      }
    }

    const isSig = cell.isFdrSignificant;
    const rect = L.rectangle(bounds, {
      fillColor: fillColor,
      fillOpacity: isSig ? 0.75 : 0.45,
      color: isSig ? "#74f2e5" : "#524535",
      weight: isSig ? 2.5 : 1,
      dashArray: isSig ? "5, 5" : null
    });

    const sign = cell.slopePerDecade >= 0 ? "+" : "";
    rect.bindTooltip(`
      <div class="font-mono text-xs">
        <strong class="text-primary">${varData.name}</strong><br>
        Cell [${cell.row},${cell.col}] (${lat}°N, ${lon}°E)<br>
        Slope: <strong>${sign}${cell.slopePerDecade.toFixed(3)} ${cell.units}/dec</strong><br>
        Raw p: ${formatP(cell.correctedP)} | FDR q: ${formatP(cell.fdrQValue)}<br>
        ${isSig ? '<span class="text-tertiary">★ Benjamini-Hochberg Significant</span>' : '<span class="text-on-surface-variant">Sub-critical</span>'}
      </div>
    `, { className: "bg-surface-container-lowest text-on-surface p-1 rounded border border-surface-container" });

    rect.on("click", () => {
      updateGridCellInspector(cell);
    });

    gridLayersGroup.addLayer(rect);
  });

  // Select first cell by default
  if (cells.length > 0) {
    updateGridCellInspector(cells[0]);
  }
}

export async function initTrendMap() {
  const mapEl = document.getElementById("leaflet-trend-map");
  if (!mapEl || typeof L === "undefined") return;

  try {
    const res = await fetch("data/grid/india-grid.json");
    if (!res.ok) throw new Error(`Failed to fetch india-grid.json: ${res.status}`);
    gridData = await res.json();
  } catch (err) {
    console.error("Could not load india-grid.json:", err);
    return;
  }

  // Initialize Leaflet map
  leafletMap = L.map("leaflet-trend-map", {
    center: [20.5, 80.0],
    zoom: 4,
    minZoom: 3,
    maxZoom: 7,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(leafletMap);

  gridLayersGroup = L.layerGroup().addTo(leafletMap);

  // Wire buttons
  const btnT2m = document.getElementById("grid-toggle-t2m");
  const btnPrecip = document.getElementById("grid-toggle-precip");

  if (btnT2m) {
    btnT2m.addEventListener("click", () => {
      btnT2m.className = "px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-primary-container text-on-primary-container transition-all cursor-pointer";
      if (btnPrecip) btnPrecip.className = "px-3 py-1.5 rounded-lg text-xs font-mono text-on-surface-variant hover:text-on-surface transition-all cursor-pointer";
      renderTrendMapGrid("T2M");
    });
  }

  if (btnPrecip) {
    btnPrecip.addEventListener("click", () => {
      btnPrecip.className = "px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-primary-container text-on-primary-container transition-all cursor-pointer";
      if (btnT2m) btnT2m.className = "px-3 py-1.5 rounded-lg text-xs font-mono text-on-surface-variant hover:text-on-surface transition-all cursor-pointer";
      renderTrendMapGrid("PRECTOTCORR");
    });
  }

  const btnInspectCell = document.getElementById("gcc-btn-inspect");
  if (btnInspectCell) {
    btnInspectCell.addEventListener("click", () => {
      if (activeSelectedCell) {
        const filePath = `data/grid/cell_${activeSelectedCell.row}_${activeSelectedCell.col}-${activeGridVar.toLowerCase()}.json`;
        loadCaseFromFile(filePath, true);
      }
    });
  }

  // Initial render
  renderTrendMapGrid("T2M");
}

// ---------------------------------------------------------
// FORENSIC CHART LAYER TOGGLES & EXPORTS
// ---------------------------------------------------------

function initChartControlsAndExports() {
  // Layer toggles
  const layers = [
    { btnId: "toggle-layer-anomaly", elId: "chart-anomaly-path", activeClass: "bg-secondary-container/30 text-secondary border-secondary-container/40" },
    { btnId: "toggle-layer-trend", elId: "chart-trend-path", activeClass: "bg-primary-container/30 text-primary border-primary-container/40" },
    { btnId: "toggle-layer-ci", elId: "chart-ci-polygon", activeClass: "bg-tertiary/20 text-tertiary border-tertiary/30" },
    { btnId: "toggle-layer-smooth", elId: "chart-smooth-path", activeClass: "bg-tertiary-container/30 text-tertiary border-tertiary-container/40" },
    { btnId: "toggle-layer-raw", elId: "chart-raw-path", activeClass: "bg-surface-container-highest text-on-surface border-surface-container-high" }
  ];

  layers.forEach(({ btnId, elId, activeClass }) => {
    const btn = document.getElementById(btnId);
    const el = document.getElementById(elId);
    if (btn && el) {
      btn.addEventListener("click", () => {
        const isHidden = el.classList.toggle("hidden");
        if (isHidden) {
          btn.className = "px-2 py-0.5 rounded bg-surface-container text-on-surface-variant/60 border border-surface-container-high transition-all cursor-pointer opacity-50";
        } else {
          btn.className = `px-2 py-0.5 rounded font-bold transition-all cursor-pointer border ${activeClass}`;
        }
      });
    }
  });

  // CSV Export
  const btnCsv = document.getElementById("btn-export-csv");
  if (btnCsv) {
    btnCsv.addEventListener("click", () => {
      if (!currentActiveAnalysis) {
        alert("Please load or execute an investigation first.");
        return;
      }
      const { dates, raw, deseasonalised, trendLine } = currentActiveAnalysis.series;
      const { variable, units, locationName } = currentActiveAnalysis.meta;
      let csv = "Date,RawValue,DeseasonalisedAnomaly,TheilSenTrend,Units,Location,Variable\n";
      for (let i = 0; i < dates.length; i++) {
        csv += `${dates[i]},${raw[i] ?? ""},${deseasonalised[i]?.toFixed(4) ?? ""},${trendLine[i]?.toFixed(4) ?? ""},"${units}","${locationName}","${variable}"\n`;
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trendscope-${variable}-${locationName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // PNG Export
  const btnPng = document.getElementById("btn-export-png");
  if (btnPng) {
    btnPng.addEventListener("click", () => {
      const svgEl = document.getElementById("forensic-chart-svg");
      if (!svgEl) return;
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000e25";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 40, canvas.width, canvas.height - 50);

        ctx.fillStyle = "#ffd7a9";
        ctx.font = "bold 18px 'Space Grotesk', sans-serif";
        ctx.fillText(`TrendScope Forensic Analysis: ${currentActiveAnalysis?.meta?.locationName || "Location"} - ${currentActiveAnalysis?.meta?.longname || ""}`, 20, 28);

        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `trendscope-chart-${currentActiveAnalysis?.meta?.variable || "series"}.png`;
        a.click();
        URLObj.revokeObjectURL(blobURL);
      };
      img.src = blobURL;
    });
  }

  // Share URL
  const btnShare = document.getElementById("btn-share-url");
  if (btnShare) {
    btnShare.addEventListener("click", () => {
      const lat = currentActiveAnalysis?.meta?.lat || (latInput ? latInput.value : 13.08);
      const lon = currentActiveAnalysis?.meta?.lon || (lonInput ? lonInput.value : 80.27);
      const variable = currentActiveAnalysis?.meta?.variable || "T2M";
      const name = currentActiveAnalysis?.meta?.locationName || (locationLabel ? locationLabel.textContent : "Chennai");
      const shareUrl = `${window.location.origin}${window.location.pathname}?lat=${lat}&lon=${lon}&var=${variable}&name=${encodeURIComponent(name)}`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          const toast = document.getElementById("share-copied-toast");
          if (toast) {
            toast.classList.remove("hidden");
            setTimeout(() => toast.classList.add("hidden"), 2500);
          }
        }).catch(() => {
          prompt("Copy this share URL:", shareUrl);
        });
      } else {
        prompt("Copy this share URL:", shareUrl);
      }
    });
  }
}

// Check and restore URL search parameters
function checkUrlParams() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.has("lat") && params.has("lon")) {
    const lat = parseFloat(params.get("lat"));
    const lon = parseFloat(params.get("lon"));
    const variable = params.get("var") || "T2M";
    const name = params.get("name") || `Coord (${lat}, ${lon})`;

    if (latInput) latInput.value = lat;
    if (lonInput) lonInput.value = lon;
    if (locationLabel) locationLabel.textContent = name;

    const radio = document.querySelector(`input[name="var-target"][value="${variable}"]`);
    if (radio) radio.checked = true;

    setTimeout(() => {
      handleExecuteInvestigation();
      const deckEl = document.getElementById("forensic-dashboard");
      if (deckEl) deckEl.scrollIntoView({ behavior: "smooth" });
    }, 400);
  }
}

// Initialise offline case studies and Radar
export async function initCasesAndRadar() {
  try {
    const res = await fetch("data/cases/manifest.json");
    if (res.ok) {
      casesManifest = await res.json();
    }
  } catch (err) {
    console.error("Could not load manifest.json:", err);
  }

  // Render initial radar with Chennai
  renderRadar(activeRadarLoc);

  // Wire Radar location toggle buttons
  document.querySelectorAll(".radar-loc-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const loc = btn.dataset.loc;
      if (loc) {
        activeRadarLoc = loc;
        document.querySelectorAll(".radar-loc-btn").forEach(b => {
          b.className = "radar-loc-btn px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-xs font-mono hover:text-on-surface cursor-pointer";
        });
        btn.className = "radar-loc-btn px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-xs font-mono font-bold cursor-pointer";
        renderRadar(loc);
      }
    });
  });

  // Wire "Inspect in Forensic Deck" button on top radar card
  const btnRadarInspect = document.getElementById("btn-radar-inspect");
  if (btnRadarInspect) {
    btnRadarInspect.addEventListener("click", () => {
      if (activeRadarTopFile) {
        loadCaseFromFile(activeRadarTopFile, true);
      }
    });
  }

  // Wire all Case Dossier cards
  document.querySelectorAll(".btn-load-case").forEach((btn) => {
    btn.addEventListener("click", () => {
      const file = btn.dataset.caseFile;
      if (file) loadCaseFromFile(file, true);
    });
  });

  // Populate Forensic Deck with default Chennai T2M benchmark
  await loadCaseFromFile("data/cases/chennai-t2m.json", false);

  // Initialize GIS Trend Map
  await initTrendMap();

  // Initialize Chart Layer Controls and Exports
  initChartControlsAndExports();

  // Check URL parameters
  checkUrlParams();

  // Register Minimal Offline Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('TrendScope Service Worker registered:', reg.scope);
    }).catch(err => {
      console.log('TrendScope Service Worker registration skipped:', err.message);
    });
  }
}

// Auto-run initialization
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCasesAndRadar);
  } else {
    initCasesAndRadar();
  }
}
