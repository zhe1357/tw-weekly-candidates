// Gate for deployment: every published run must pass the same zod schema the
// old /api/ingest endpoint enforced, and weeks.json must index them exactly.
import { readFileSync, readdirSync } from "node:fs";
import { snapshotSchema } from "../src/lib/public-data.ts";

const root = new URL("../public/data/", import.meta.url);
const runId = s => `${s.signalDate}:${s.poolSize ?? "all"}:${s.groupCount}:${s.modelPeriod}${s.poolMode === "fixed" ? `:fixed:${s.marketCapBasisDate}` : ""}`;
const errors = [];
const files = readdirSync(new URL("runs/", root)).filter(name => name.endsWith(".json"));
const runs = new Map();
for (const file of files) {
  const { id, publishedAt, ...snapshot } = JSON.parse(readFileSync(new URL(`runs/${file}`, root), "utf8"));
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) errors.push(`${file}: ${JSON.stringify(parsed.error.flatten())}`);
  if (id !== runId(snapshot)) errors.push(`${file}: id ${id} does not match its contents`);
  if (Number.isNaN(Date.parse(publishedAt))) errors.push(`${file}: invalid publishedAt`);
  runs.set(file, { id, publishedAt, signalDate: snapshot.signalDate });
}
const weeks = JSON.parse(readFileSync(new URL("weeks.json", root), "utf8"));
if (!Array.isArray(weeks) || weeks.length === 0) errors.push("weeks.json is empty");
for (const week of weeks) {
  const run = runs.get(week.file);
  if (!run || run.id !== week.id || run.publishedAt !== week.publishedAt || run.signalDate !== week.signalDate)
    errors.push(`weeks.json entry ${week.id} does not match runs/${week.file}`);
}
for (let i = 1; i < weeks.length; i++)
  if (weeks[i - 1].signalDate < weeks[i].signalDate) errors.push("weeks.json must be newest first");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Validated ${files.length} runs; latest ${weeks[0].signalDate}`);
