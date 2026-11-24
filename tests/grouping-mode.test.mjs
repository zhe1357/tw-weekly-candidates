import test from "node:test";
import assert from "node:assert/strict";
import { groupingView, groupingViews, presetAvailability } from "../src/lib/grouping-mode.ts";
import { selectSnapshot } from "../src/lib/selection.ts";

function snapshot(count=1000) {
  const rows=Array.from({length:count},(_,i)=>({ticker:String(1000+i),name:`Stock ${i}`,market:"TWSE",
    probability:(count-i)/count,predictedReturn:(i%19)/1000,marketCapMillion:count-i,
    marketCapRank:i+1,probabilityRank:i+1,returnRank:i+1,probabilityGroup:1,returnGroup:1,
    previousWeekReturn:.02,previousWeekStart:"2026-10-16",previousWeekEnd:"2026-10-22"}));
  return {signalDate:"2026-10-22",poolMode:"fixed",marketCapBasisDate:"2025-12-31",modelPeriod:"2000_2019",
    poolSize:500,groupCount:10,eligibleCount:500,rows:rows.slice(0,500),universeRows:rows,universeCount:1000};
}
const expected={50:[50,10,10],100:[40,10,10],200:[40,50,10],500:[50,50,50],1000:[40,50,50]};
test("all fifteen historical cumulative-return maxima are independently applied by strategy",()=>{
  const source=snapshot(),before=structuredClone(source);
  for(const [pool,groups] of Object.entries(expected)) {
    const views=groupingViews(source,Number(pool),7,"historical");
    for(const [i,tab] of ["classification","regression","intersection"].entries()) {
      const view=views[tab];assert.equal(view.error,null);assert.equal(view.groupCount,groups[i]);
      assert.deepEqual(view.snapshot,selectSnapshot(source,Number(pool),groups[i]));
      assert(view.snapshot.rows.every(row=>row.previousWeekReturn===.02));
    }
  }
  assert.deepEqual(source,before);
});
test("manual mode uses the entered count for all three strategies; full universe does not need groups",()=>{
  const views=groupingViews(snapshot(),300,7,"manual");
  for(const tab of ["classification","regression","intersection"]) {
    assert.equal(views[tab].groupCount,7);assert.equal(views[tab].preset,null);
  }
  assert.equal(views.all.snapshot.rows.length,300);
  assert.equal(groupingView(snapshot(),50,2000,"historical","all").snapshot.rows.length,50);
});
test("intersection uses one shared J for both legs, rather than the other tabs' best counts",()=>{
  const source=snapshot(),views=groupingViews(source,200,7,"historical");
  assert.equal(views.classification.groupCount,40);assert.equal(views.regression.groupCount,50);
  assert.equal(views.intersection.groupCount,10);
  const expected=selectSnapshot(source,200,10).rows.filter(r=>r.probabilityGroup===1&&r.returnGroup===1);
  assert.deepEqual(views.intersection.snapshot.rows.filter(r=>r.probabilityGroup===1&&r.returnGroup===1),expected);
});
test("unknown pools and incompatible models/bases fall back to explicit manual settings",()=>{
  const source=snapshot();
  for(const [data,n] of [[source,300],[{...source,poolMode:undefined},500],
    [{...source,modelPeriod:"custom"},500],[{...source,marketCapBasisDate:"2026-01-01"},500]]) {
    assert(presetAvailability(data,n));
    const view=groupingView(data,n,7,"historical","regression");
    assert.equal(view.groupCount,7);assert.equal(view.preset,null);assert(view.notice);
  }
});
test("presets chosen using Jan-Sep returns cannot be applied to snapshots from that comparison period",()=>{
  for(const date of ["2026-01-02","2026-09-25","2026-09-30"]) {
    const view=groupingView({...snapshot(),signalDate:date},500,7,"historical","intersection");
    assert.equal(view.preset,null);assert.equal(view.groupCount,7);assert(view.notice);
  }
});
test("ineligible historical J is rejected without silently reducing it or inventing missing stocks",()=>{
  const source=snapshot();source.universeRows=source.universeRows.filter(r=>r.marketCapRank!==1);
  const view=groupingView(source,50,10,"historical","classification");
  assert.equal(view.groupCount,50);assert.equal(view.snapshot,null);assert(view.error);
  assert(groupingView(source,50,10,"manual","classification").snapshot);
});
