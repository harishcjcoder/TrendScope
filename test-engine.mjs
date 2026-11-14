import fs from "fs";
import { mannKendall, mannKendallCorrected, senSlope } from "./trendscope-engine.mjs";
const ref = JSON.parse(fs.readFileSync("./reference-data.json"));
let bad = 0;
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
for (const [k, r] of Object.entries(ref)) {
  const n = mannKendall(r.x), c = mannKendallCorrected(r.x);
  const checks = [["naive z", n.z, r.naive_z], ["naive p", n.p, r.naive_p], ["slope", n.slope, r.slope], ["corr z", c.z, r.corr_z], ["corr p", c.p, r.corr_p]];
  for (const [name, a, b] of checks) {
    const ok = Math.abs(a - b) < 1e-9 || rel(a, b) < 1e-6;
    if (!ok) bad++;
    console.log(k.padEnd(9), name.padEnd(8), a.toExponential(6).padStart(15), b.toExponential(6).padStart(15), ok ? "OK" : "MISMATCH");
  }
}
console.log(bad ? `FAILED: ${bad} mismatches` : "ALL MATCH pymannkendall");
