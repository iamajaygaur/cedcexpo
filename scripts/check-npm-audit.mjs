#!/usr/bin/env node
/**
 * Fail CI on high/critical production advisories, except packages with a
 * documented accepted risk in docs/rac/evidence/remediation-log.md.
 *
 * Usage: node scripts/check-npm-audit.mjs [path-to-npm-audit.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/** Package names with no viable fix yet — tracked in the RAC remediation log. */
const ACCEPTED_RISK = new Set([
  // Community SheetJS build; admin-only Excel import. See remediation F-02.
  "xlsx",
]);

const outPath = process.argv[2] ?? "npm-audit.json";

const result = spawnSync(
  "npm",
  ["audit", "--omit=dev", "--json"],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);

const raw = result.stdout || "{}";
writeFileSync(outPath, raw);

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("Failed to parse npm audit JSON");
  process.exit(1);
}

const vulns = report.vulnerabilities ?? {};
const blocking = [];

for (const [name, info] of Object.entries(vulns)) {
  const severity = String(info.severity ?? "").toLowerCase();
  if (severity !== "high" && severity !== "critical") continue;
  if (ACCEPTED_RISK.has(name)) {
    console.warn(
      `::warning::Accepted risk (${severity}): ${name} — see docs/rac/evidence/remediation-log.md`,
    );
    continue;
  }
  blocking.push({ name, severity, via: info.via });
}

if (blocking.length === 0) {
  console.log(
    `npm audit gate passed (${Object.keys(vulns).length} advisories scanned; accepted risks excluded).`,
  );
  process.exit(0);
}

console.error("Blocking high/critical production advisories:");
for (const item of blocking) {
  console.error(`  - ${item.severity}: ${item.name}`);
}
console.error(
  `\n${blocking.length} blocking issue(s). Upgrade dependencies or add a documented accepted risk.`,
);
process.exit(1);
