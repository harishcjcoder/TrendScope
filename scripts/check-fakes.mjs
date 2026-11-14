import fs from "fs";
import path from "path";

const forbidden = [
  "SWARM",
  "34 BIRDS",
  "SYNC: 1.4s",
  "99.8",
  "EOSDIS VERIFIED",
  "CYCLE 2024-Q4",
  "42ms",
  "Thorne",
  "Vasquez",
  "Raye",
  "10.5067",
  "GRACE",
  "ECOSTRESS",
  "MOD11A2"
];

// Check index.html and app.js specifically (DECISIONS.md mentions what was purged in decision 1)
const uiFiles = ["index.html", "app.js", "trendscope-engine.mjs"];

let totalMatches = 0;
for (const file of uiFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf-8");
  for (const term of forbidden) {
    if (content.includes(term)) {
      console.log(`Match found for "${term}" in ${file}`);
      totalMatches++;
    }
  }
}

console.log(`UI & Engine Forbidden Terms Check: ${totalMatches} matches found.`);
