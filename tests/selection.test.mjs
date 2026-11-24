import test from "node:test";
import assert from "node:assert/strict";
import { maximumPoolSize, selectSnapshot, yahooQuoteUrl } from "../src/lib/selection.ts";

function stock(ticker, rank, probability, predictedReturn) {
  return { ticker, name:ticker, market:"TWSE", probability, predictedReturn,
    probabilityRank:1, returnRank:1, probabilityGroup:1, returnGroup:1,
    marketCapMillion:1000/rank, marketCapRank:rank };
}
function fixture() {
  const rows = [stock("2330",1,.8,.01), stock("1101",2,.8,.03), stock("8299",3,.6,.02), stock("2454",5,.7,.04), stock("3008",7,.9,.05)];
  return { signalDate:"2026-10-16",targetWeekStart:"2026-10-19",targetWeekEnd:"2026-10-23",
    generatedAt:"2026-10-18T00:00:00Z",sourceUpdatedAt:null,poolSize:7,groupCount:2,
    eligibleCount:5,modelPeriod:"test",marketCapMethods:{},rows,universeRows:rows,universeCount:7 };
}
test("market-cap pool is applied before score sorting, and missing image ranks are not backfilled", () => {
  const view=selectSnapshot(fixture(),5,3);
  assert.equal(view.rows.length,4);
  assert(!view.rows.some(row=>row.ticker==="3008"));
  assert.deepEqual(view.rows.map(row=>row.ticker),["1101","2330","2454","8299"]);
  assert.deepEqual(view.rows.map(row=>row.probabilityGroup),[1,1,2,3]);
});
test("expanding the pool includes new stocks and reranks within the new pool", () => {
  const view=selectSnapshot(fixture(),7,2);
  assert.equal(view.rows[0].ticker,"3008");
  assert.equal(view.rows[0].returnRank,1);
  assert.equal(view.rows.filter(row=>row.probabilityGroup===1).length,3);
});
test("all legal group sizes have balanced nonempty groups and never mutate source scores", () => {
  const source=fixture(),before=structuredClone(source);
  for(let groups=1;groups<=5;groups++) {
    const view=selectSnapshot(source,7,groups);
    for(const field of ["probabilityGroup","returnGroup"]) {
      const sizes=Array.from({length:groups},(_,i)=>view.rows.filter(row=>row[field]===i+1).length);
      assert(Math.max(...sizes)-Math.min(...sizes)<=1);
      assert(sizes.every(size=>size>0));
    }
  }
  assert.deepEqual(source,before);
});
test("invalid settings are rejected instead of producing misleading empty candidates", () => {
  for(const args of [[0,2],[8,2],[2.5,2],[5,0],[5,1.5],[5,5]]) assert.throws(()=>selectSnapshot(fixture(),...args));
});
test("old snapshots cannot invent scores for stocks outside their saved pool", () => {
  const old=fixture();delete old.universeRows;delete old.universeCount;old.poolSize=5;
  assert.equal(maximumPoolSize(old),5);
  assert.throws(()=>selectSnapshot(old,7,2));
});
test("fixed 2025 year-end pool retains its basis and cannot expand past the saved ceiling", () => {
  const source={...fixture(),poolMode:"fixed",marketCapBasisDate:"2025-12-31"};
  const view=selectSnapshot(source,5,3);
  assert.equal(view.marketCapBasisDate,"2025-12-31");
  assert.equal(view.poolMode,"fixed");
  assert.throws(()=>selectSnapshot(source,1001,10));
});
test("Yahoo URLs preserve listed/OTC suffixes and reject unsafe or mismatched symbols", () => {
  assert.equal(yahooQuoteUrl({ticker:"2330",market:"TWSE"}),"https://tw.stock.yahoo.com/quote/2330.TW");
  assert.equal(yahooQuoteUrl({ticker:"8299",market:"TPEX",yahooSymbol:"8299.TWO"}),"https://tw.stock.yahoo.com/quote/8299.TWO");
  assert.equal(yahooQuoteUrl({ticker:"2330",market:"OTHER"}),null);
  assert.equal(yahooQuoteUrl({ticker:"2330",market:"TWSE",yahooSymbol:"javascript:alert(1)"}),null);
  assert.equal(yahooQuoteUrl({ticker:"2330",market:"TWSE",yahooSymbol:"8299.TWO"}),null);
});
