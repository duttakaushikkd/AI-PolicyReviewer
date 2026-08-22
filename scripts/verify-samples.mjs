import { readFile } from "node:fs/promises";
import path from "node:path";
import { expectedRouteForSample } from "../lib/gates.js";

const samples = JSON.parse(
  await readFile(path.join(process.cwd(), "customer_data", "sample_claims.json"), "utf8"),
);

const expected = {
  "claim-01": "auto",
  "claim-02": "auto",
  "claim-03": "escalate",
  "claim-04": "auto",
  "claim-05": "auto",
  "claim-06": "escalate",
  "claim-07": "escalate",
  "claim-08": "auto",
};

let failed = 0;
for (const sample of samples) {
  const route = expectedRouteForSample(sample);
  const want = expected[sample.id];
  const ok = route === want;
  if (!ok) failed += 1;
  console.log(`${ok ? "ok" : "FAIL"} ${sample.id}: ${route} (expected ${want}) — ${sample.expected_type}`);
}

if (failed) {
  console.error(`\n${failed} sample(s) did not match expected routes.`);
  process.exit(1);
}

console.log("\nAll 8 samples match the expected auto vs escalate path from policy gates.");
