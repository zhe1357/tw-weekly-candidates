import test from "node:test";
import assert from "node:assert/strict";
import { snapshotSchema } from "../src/lib/public-data.ts";

function snapshot() {
  const row = { ticker:"2330",name:"台積電",market:"TWSE",yahooSymbol:"2330.TW",
    probability:.6,predictedReturn:.01,probabilityRank:1,returnRank:1,
    probabilityGroup:1,returnGroup:1,marketCapMillion:1000,marketCapRank:1 };
  return { signalDate:"2026-10-16",targetWeekStart:"2026-10-19",targetWeekEnd:"2026-10-23",
    generatedAt:"2026-10-18T00:00:00Z",sourceUpdatedAt:null,poolSize:500,groupCount:10,
    eligibleCount:1,modelPeriod:"2000_2019",marketCapMethods:{},rows:[row],
    universeRows:[row],universeCount:1000,poolMode:"fixed",marketCapBasisDate:"2025-12-31" };
}
test("fixed pool requires an earlier basis and a ceiling of at most 1000", () => {
  assert(snapshotSchema.safeParse(snapshot()).success);
  for(const change of [{marketCapBasisDate:"2026-10-16"},{marketCapBasisDate:undefined},
    {universeCount:1001},{poolSize:1001},{universeCount:undefined},{poolMode:undefined}]) {
    assert(!snapshotSchema.safeParse({...snapshot(),...change}).success);
  }
});
test("legacy current-cap snapshots remain readable", () => {
  const old=snapshot();delete old.poolMode;delete old.marketCapBasisDate;
  delete old.universeCount;delete old.universeRows;
  assert(snapshotSchema.safeParse(old).success);
});
test("observed returns cannot contain future intervals, inconsistent universes or missing dates", () => {
  const data=snapshot();
  const row={...data.rows[0],previousWeekReturn:.05,previousWeekStart:"2026-10-09",previousWeekEnd:"2026-10-16"};
  const valid={...data,rows:[row],universeRows:[row]};
  assert(snapshotSchema.safeParse(valid).success);
  for(const fields of [{previousWeekEnd:"2026-10-23"},{previousWeekStart:null},
    {previousWeekStart:"2026-10-16"},{previousWeekReturn:Infinity},{previousWeekReturn:-2}]) {
    const bad={...row,...fields};
    assert(!snapshotSchema.safeParse({...valid,rows:[bad],universeRows:[bad]}).success);
  }
  assert(!snapshotSchema.safeParse({...valid,universeRows:[{...row,previousWeekReturn:.9}]}).success);
  const missing={...row,previousWeekReturn:null};
  assert(snapshotSchema.safeParse({...valid,rows:[missing],universeRows:[missing]}).success);
});
