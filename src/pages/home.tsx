"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, CalendarDays, ChartNoAxesCombined, Check, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, Layers, ListFilter, RefreshCw, Search, SlidersHorizontal, Sprout, TrendingUp } from "lucide-react";
import type { RunSummary, Snapshot, Stock } from "@/lib/public-data";
import { maximumPoolSize, yahooQuoteUrl } from "@/lib/selection";
import SiteSidebar from "@/components/site-sidebar";
import { fetchRun, fetchWeeks } from "@/lib/paths";
import { COMPARISON, STRATEGY_LABELS, groupingView, groupingViews, presetAvailability } from "@/lib/grouping-mode";
import type { GroupingMode } from "@/lib/grouping-mode";

type Published = Snapshot & { id: string; publishedAt: string };
type Tab = "intersection" | "classification" | "regression" | "all";
const number = new Intl.NumberFormat("zh-TW");
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const shortDate = (value: string) => value.slice(5).replace("-", "/");
const timestamp = (value: string) => new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
function download(rows: Stock[], snapshot: Snapshot, groupingLabel: string, strategyLabel: string) {
  const escape = (value: unknown) => { let text = String(value ?? "");
    if (/^\s*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text; return `"${text.replaceAll('"', '""')}"`; };
  const lines = [["訊號日期", "股票池前N大", "組數", "分組模式", "選股方式", "配置比較期間", "代碼", "名稱", "市場", "市值基準日", "市值(億元TWD)", "模型上漲分數", "預測報酬", "上週實際報酬", "上週報酬起日", "上週報酬迄日", "分類排名", "報酬排名", "Yahoo行情"],
    ...rows.map(row => [snapshot.signalDate, snapshot.poolSize ?? "全市場", snapshot.groupCount, groupingLabel, strategyLabel, groupingLabel === "歷史報酬最高" ? `${COMPARISON.start}～${COMPARISON.end}` : "", row.ticker, row.name, row.market === "TWSE" ? "上市" : row.market === "TPEX" ? "上櫃" : "其他", snapshot.marketCapBasisDate ?? snapshot.signalDate,
      row.marketCapMillion === null ? "" : (row.marketCapMillion / 100).toFixed(2), percent(row.probability),
      percent(row.predictedReturn), row.previousWeekReturn == null ? "" : percent(row.previousWeekReturn), row.previousWeekStart ?? "", row.previousWeekEnd ?? "", row.probabilityRank, row.returnRank, yahooQuoteUrl(row) ?? ""])];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.map(line => line.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `weekly-candidates-${snapshot.signalDate}-pool${snapshot.poolSize ?? "all"}-groups${snapshot.groupCount}.csv`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function StockIdentity({ stock }: { stock: Stock }) {
  const url = yahooQuoteUrl(stock);
  return <div><strong>{url ? <a className="stock-name-link" href={url} target="_blank" rel="noopener noreferrer"
    aria-label={`在 Yahoo Finance 查看 ${stock.name}（${stock.ticker}）行情，另開分頁`}>{stock.name}<ArrowUpRight size={13}/></a> : stock.name}</strong>
    <small>{stock.ticker}<span>{stock.market === "TWSE" ? "上市" : stock.market === "TPEX" ? "上櫃" : "其他"}</span>{url && <span className="yahoo-hint">Yahoo 行情</span>}</small></div>;
}
export default function Home() {
  const [source, setSource] = useState<Published | null>(null);
  const [selection, setSelection] = useState<{ poolSize: number; groupCount: number } | null>(null);
  const [mode, setMode] = useState<GroupingMode>("historical");
  const [poolDraft, setPoolDraft] = useState("");
  const [groupsDraft, setGroupsDraft] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [weeks, setWeeks] = useState<RunSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<Tab>("intersection");
  const appliedPool = selection?.poolSize ?? source?.poolSize ?? source?.universeCount ?? source?.rows.length ?? 0;
  const manualGroups = selection?.groupCount ?? source?.groupCount ?? 10;
  const views = useMemo(() => source ? groupingViews(source, appliedPool, manualGroups, mode) : null, [source, appliedPool, manualGroups, mode]);
  const activeView = views?.[tab];
  const data = activeView?.snapshot ?? null;
  const activePreset = activeView?.preset;

  const [search, setSearch] = useState(""); const [market, setMarket] = useState("all");
  const [sort, setSort] = useState("probability"); const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    fetchWeeks(controller.signal)
      .then(async runs => [await fetchRun<Published>(runs, selected, controller.signal), runs] as const)
      .then(([snapshot, runs]) => { setSource(snapshot); setWeeks(runs); setSelection(null); setSelectionError("");
        setPoolDraft(String(snapshot.poolSize ?? snapshot.universeCount ?? snapshot.rows.length)); setGroupsDraft(String(snapshot.groupCount));
        setMode(presetAvailability(snapshot, snapshot.poolSize ?? snapshot.universeCount ?? snapshot.rows.length) ? "manual" : "historical"); })
      .catch(reason => { if (reason.name !== "AbortError") setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected, refresh]);
  useEffect(() => { setPage(0); }, [search, tab, sort, market, selected, selection, mode]);
  const maxPool = source ? maximumPoolSize(source) : 0;
  const canAdjust = !!source && (source.universeRows ?? source.rows).every(row => row.marketCapRank !== null);
  function applySelection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source) return;
    try {
      const poolSize = Number(poolDraft), groupCount = Number(groupsDraft);
      const chosenMode = mode === "historical" && presetAvailability(source, poolSize) ? "manual" : mode;
      const view = groupingView(source, poolSize, groupCount, chosenMode, tab);
      if (view.error) throw new Error(view.error);
      setMode(chosenMode); setSelection({ poolSize, groupCount }); setSelectionError("");
    } catch (error) { setSelectionError(error instanceof Error ? error.message : "請檢查選股條件。"); }
  }
  const counts = useMemo(() => ({
    intersection: views?.intersection.snapshot?.rows.filter(row => row.probabilityGroup === 1 && row.returnGroup === 1).length ?? 0,
    classification: views?.classification.snapshot?.rows.filter(row => row.probabilityGroup === 1).length ?? 0,
    regression: views?.regression.snapshot?.rows.filter(row => row.returnGroup === 1).length ?? 0,
    all: views?.all.snapshot?.rows.length ?? 0,
  }), [views]);
  const rows = useMemo(() => (data?.rows ?? []).filter(row =>
    (tab === "all" || tab === "intersection" && row.probabilityGroup === 1 && row.returnGroup === 1 || tab === "classification" && row.probabilityGroup === 1 || tab === "regression" && row.returnGroup === 1)
    && (market === "all" || market === row.market) && `${row.ticker} ${row.name}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => sort === "return" ? b.predictedReturn - a.predictedReturn : sort === "cap" ? (b.marketCapMillion ?? 0) - (a.marketCapMillion ?? 0) : a.probabilityRank - b.probabilityRank), [data, tab, market, search, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / 20)); const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * 20, (current + 1) * 20);
  const fixedBasis = data?.poolMode === "fixed" ? data.marketCapBasisDate : null;
  const poolLabel = data?.poolSize ? `市值前 ${number.format(data.poolSize)} 檔` : "全市場";
  const tabs: [Tab, string][] = [["intersection", "雙模型交集"], ["classification", "分類模型"], ["regression", "報酬模型"], ["all", "全部有效標的"]];
  const fallback = Object.entries(data?.marketCapMethods ?? {}).filter(([key]) => key !== "yahoo_quote_marketCap").reduce((sum, [, count]) => sum + count, 0);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Taipei", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
  const curve = data ? [...data.rows].sort((a,b) => b.probability-a.probability).filter((_,i) => i % Math.max(1, Math.floor(data.rows.length/45)) === 0).slice(0,45) : [];
  const range = data ? [Math.min(...data.rows.map(row => row.probability)), Math.max(...data.rows.map(row => row.probability))] : [0,1];
  const metrics = [
    { label:"市值股票池", value:data?.poolSize ?? data?.eligibleCount, note:fixedBasis ? `${fixedBasis} 固定排名` : "先以規模建立研究範圍", icon:<ListFilter size={18}/> },
    { label:"有效模型輸入", value:data?.eligibleCount, note:"符合當週影像與資料條件", icon:<ChartNoAxesCombined size={18}/> },
    { label:"分類模型候選", value:views?.classification.snapshot ? counts.classification : null, note:`${views?.classification.groupCount ?? "—"} 組的最高分組`, icon:<TrendingUp size={18}/> },
    { label:"雙模型交集", value:views?.intersection.snapshot ? counts.intersection : null, note:`${views?.intersection.groupCount ?? "—"} 組的兩模型最高組交集`, icon:<Layers size={18}/> },
  ];
  return <div className="site-shell">
    <a className="skip-link" href="#candidates">跳至候選名單</a>
    <SiteSidebar active="candidates"/>
    <div className="main-shell"><header className="topbar"><span>研究工作台 <ChevronRight size={13}/><strong>每週候選標的</strong></span><div><span className="public-badge"><span className="tiny-dot"/>公開研究資料</span><button className="icon-button" aria-label="重新載入資料" disabled={loading} onClick={() => setRefresh(value => value+1)}><RefreshCw size={17} className={loading ? "spinning" : ""}/></button></div></header>
    <main><section className="page-heading"><div><div className="eyebrow">TAIWAN EQUITY / WEEKLY OUTLOOK</div><h1>下一週候選標的<span>從資料，找到觀察方向。</span></h1><p>先以市值建立股票池，再以兩個 CNN 模型，篩出值得進一步研究的名單。</p></div><a className="method-link" href="#method">了解選股方法 <ArrowUpRight size={16}/></a></section>
      <section className="outlook-card" aria-label="訊號週與觀察週"><div><span className="light-eyebrow"><span className="tiny-dot"/>{selected ? "研究快照" : "最近一期已發布訊號"}</span><h2>{data ? `${shortDate(data.targetWeekStart)} — ${shortDate(data.targetWeekEnd)}` : "每週更新的觀察名單"}<small>{data ? `${data.targetWeekStart.slice(0,4)} / 下一週觀察區間` : "等待資料載入"}</small></h2><div className="outlook-tags"><span><CalendarDays size={14}/>訊號日 {data?.signalDate ?? "—"}</span><span><SlidersHorizontal size={14}/>{poolLabel} · {tab === "all" ? "完整母體" : `${data?.groupCount ?? "—"} 組`}</span></div></div>
      <div className="outlook-chart"><div className="chart-label">本期模型分數分布 <span>由高至低</span></div><svg viewBox="0 0 300 90" role="img" aria-label="本期股票依分類模型上漲分數由高至低排列"><path d="M0 75H300 M0 40H300 M0 5H300" stroke="rgba(255,255,255,.1)" strokeDasharray="3 5"/>{curve.map((row,i) => {const h=15+60*(row.probability-range[0])/Math.max(.0001,range[1]-range[0]);return <rect key={row.ticker} x={i*300/Math.max(1,curve.length)} y={85-h} width={4} height={h} rx={1.5} fill={i<7 ? "#cfe7aa" : "#81aa99"}/>;})}</svg><div className="chart-foot"><span>較高分數</span><span>全股票池</span></div></div></section>
      {error && <div className="error-banner" role="alert">{error} {data && "目前保留上一份成功載入資料。"}<button onClick={() => setRefresh(value => value+1)}>重新載入</button></div>}
      {!selected && data && data.targetWeekEnd < today && <div className="error-banner" role="status">目前顯示最近一次成功發布的歷史名單（{data.signalDate}），尚未取得新一期結果，請勿視為下一週即時訊號。</div>}
      <form className="selection-controls" onSubmit={applySelection} aria-label="調整股票池與模型組數">
        <div className="selection-title"><SlidersHorizontal size={18}/><div><strong>調整本頁選股條件</strong><small>{fixedBasis ? `依 ${fixedBasis} 市值固定取前 N 大，再依當週模型分數分組` : "先取市值前 N 大，再依模型分數重新分組"}</small></div></div>
        <label htmlFor="pool-size">市值股票池：前 N 檔<input id="pool-size" list="preset-pools" name="pool" type="number" inputMode="numeric" min="1" max={maxPool || undefined} step="1" required disabled={loading || !canAdjust} value={poolDraft} onChange={event => setPoolDraft(event.target.value)}/></label>
        <datalist id="preset-pools">{[50,100,200,500,1000].map(size => <option key={size} value={size}/>)}</datalist>
        <label htmlFor="grouping-mode">分組模式<select id="grouping-mode" value={mode} disabled={loading || !canAdjust} onChange={event => {const requested = event.target.value as GroupingMode;setMode(requested === "historical" && source && presetAvailability(source, appliedPool) ? "manual" : requested);setSelectionError("");}}><option value="historical">歷史報酬最高</option><option value="manual">手動設定</option></select></label>
        <label htmlFor="group-count">{activePreset ? `${STRATEGY_LABELS[tab]}組數（自動）` : "模型組數"}<input id="group-count" name="groups" type="number" inputMode="numeric" min="1" step="1" required disabled={loading || !canAdjust || !!activePreset || tab === "all"} placeholder={tab === "all" ? "完整母體" : undefined} value={tab === "all" ? "" : activePreset?.groups ?? groupsDraft} onChange={event => setGroupsDraft(event.target.value)}/></label>
        <button type="submit" className="apply-selection" disabled={loading || !canAdjust}>套用條件 <ArrowUpRight size={14}/></button>
        <button type="button" className="reset-selection" disabled={loading || !source} onClick={() => {setSelection(null); setSelectionError(""); if(source){setPoolDraft(String(source.poolSize ?? maxPool));setGroupsDraft(String(source.groupCount));setMode(presetAvailability(source, source.poolSize ?? maxPool) ? "manual" : "historical");}}}>還原</button>
        <p className="selection-note" aria-live="polite">{data ? `目前套用：市值前 ${number.format(data.poolSize ?? maxPool)} 檔、${tab === "all" ? "完整母體" : `${data.groupCount} 組`}，共 ${number.format(data.eligibleCount)} 檔有效輸入。` : source ? "此配置無有效名單，請改用手動設定或調整組數。" : "載入選股資料中。"}{source && ` 股票池上限 ${number.format(maxPool)} 檔。`}{fixedBasis && ` 市值基準日 ${fixedBasis}，後續不重排、不加入池外標的。`} 調整只影響本頁，不改變每週排程。{source && !source.universeRows && " 此舊快照未保存全市場分數，股票池上限依當期資料。"}{source && !canAdjust && " 本期缺少完整市值順位，無法調整股票池。"}</p>
        {(selectionError || activeView?.error) && <p className="selection-error" role="alert">{selectionError || activeView?.error} 歷史配置不會自動降低組數。</p>}
        {source && presetAvailability(source, Number(poolDraft)) && <p className="selection-note">{presetAvailability(source, Number(poolDraft))}</p>}
        {mode === "historical" && activePreset && <div className="historical-preset" role="status"><strong>歷史報酬最高 · 前 {number.format(appliedPool)} 大 · {STRATEGY_LABELS[tab]} {activePreset.groups} 組</strong><span>歷史最高累積報酬 +{percent(activePreset.totalReturn)}</span><small>{COMPARISON.start}～{COMPARISON.end}，{COMPARISON.weeks} 個完整週期；2025/12/31 固定池，未扣交易成本。此為該期間事後挑選結果，不代表未來報酬。</small>{tab === "intersection" && <small>兩個模型同以 {activePreset.groups} 組分組，再取各自最高組交集。</small>}</div>}
        {tab === "all" && <p className="selection-note">全部有效標的僅檢視完整股票池；切換模型分頁時，歷史模式才會套用各自的組數。</p>}

      </form>
      <section className="metrics" aria-label="本期篩選統計">{metrics.map(metric => <article className="metric" key={metric.label}><div>{metric.label}<span>{metric.icon}</span></div><strong>{typeof metric.value === "number" ? number.format(metric.value) : "—"}<small>檔</small></strong><p>{metric.note}</p></article>)}</section>
      <section id="candidates" className="table-card"><div className="section-heading"><div><div className="section-kicker">THE WATCHLIST</div><h2>本期觀察名單</h2><p>候選名單供後續研究；模型分數與預測報酬不代表實際收益。</p></div><button className="export-button" disabled={!data || loading || !rows.length} onClick={() => data && download(rows,data, tab === "all" ? "完整母體" : activePreset ? "歷史報酬最高" : "手動設定", STRATEGY_LABELS[tab])}><ArrowDownToLine size={15}/>下載 CSV</button></div>
        <div className="tab-strip" role="tablist" aria-label="選擇模型名單">{tabs.map(([key,label]) => <button key={key} role="tab" aria-selected={tab===key} aria-controls="stock-panel" id={`tab-${key}`} className={tab===key ? "selected" : ""} onClick={() => {setTab(key);setSelectionError("");}}>{key==="intersection" && <Layers size={15}/>} {label}{source && key !== "all" && ` · ${views?.[key].groupCount ?? "—"} 組`}<span>{views?.[key].snapshot ? counts[key] : "—"}</span></button>)}</div>
        <div className="table-tools"><label className="search"><Search size={17}/><input aria-label="搜尋股票代碼或名稱" placeholder="搜尋股票代碼或名稱…" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button aria-label="清除搜尋" onClick={() => setSearch("")}>×</button>}</label><div><select aria-label="篩選市場" value={market} onChange={event => setMarket(event.target.value)}><option value="all">全部市場</option><option value="TWSE">上市</option><option value="TPEX">上櫃</option></select><select aria-label="名單排序" value={sort} onChange={event => setSort(event.target.value)}><option value="probability">分類模型排名</option><option value="return">預測報酬排序</option><option value="cap">{fixedBasis ? "基準日市值由大到小" : "市值由大到小"}</option></select></div></div>
        <p className="pool-status-note">上週實際報酬是截至訊號日最近完成的一週，從前週最後交易日收盤計算至該週最後交易日收盤，並標示實際區間。採每日調整報酬複利、未扣成本；「—」表示資料不足或舊快照未提供。</p>
        <div className="table-scroll" id="stock-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} aria-busy={loading}><table><thead><tr><th>股票 / 市場</th><th>模型上漲分數</th><th>預測週報酬</th><th>上週實際報酬<span>最近完成週 · 收盤至收盤</span></th><th>{fixedBasis ? "基準日市值" : "市值"}<span>{fixedBasis ? `${fixedBasis} · 億元 TWD` : "（億元 TWD）"}</span></th><th>分類 / 報酬排名</th><th>模型訊號</th></tr></thead><tbody>{visible.map(row => <tr key={row.ticker}><td><div className="stock-cell"><span className="stock-avatar">{row.ticker.slice(0,2)}</span><StockIdentity stock={row}/></div></td><td><div className="probability-value">{percent(row.probability)}<span className="score-bar"><span style={{width:`${row.probability*100}%`}}/></span></div></td><td className={row.predictedReturn>=0 ? "positive" : "negative"}>{row.predictedReturn>=0 ? "+" : ""}{percent(row.predictedReturn)}</td><td className={row.previousWeekReturn == null ? "numeric" : row.previousWeekReturn >= 0 ? "positive" : "negative"} title={row.previousWeekReturn == null ? "缺少完整週行情或此舊快照未提供歷史報酬" : "依每日調整報酬複利計算，未扣交易成本"}>{row.previousWeekReturn == null ? "—" : `${row.previousWeekReturn >= 0 ? "+" : ""}${percent(row.previousWeekReturn)}`}{row.previousWeekStart && row.previousWeekEnd && <small className="previous-return-period">{shortDate(row.previousWeekStart)} → {shortDate(row.previousWeekEnd)}</small>}</td><td className="numeric">{row.marketCapMillion===null ? "—" : number.format(Math.round(row.marketCapMillion/100))}</td><td className="ranks"><span>#{row.probabilityRank}</span><span>/</span><span>#{row.returnRank}</span></td><td><span className={`signal-tag ${row.probabilityGroup===1 && row.returnGroup===1 ? "consensus" : ""}`}>{row.probabilityGroup===1 && row.returnGroup===1 ? <><Check size={12}/>雙模型交集</> : row.probabilityGroup===1 ? "分類模型" : row.returnGroup===1 ? "報酬模型" : "股票池內"}</span></td></tr>)}</tbody></table>{!data && loading && <div className="table-empty"><RefreshCw size={20} className="spinning"/><p>正在載入本週研究資料…</p></div>}{!loading && !visible.length && <div className="table-empty"><Search size={24}/><p>{data ? "沒有符合條件的標的" : source ? "此分組設定無可用名單" : "本週名單尚未發布"}</p><small>{data ? "試試其他關鍵字、模型或市場。" : source ? "請切換手動設定或調整組數。" : "新一期資料通過檢查後，會在此顯示。"}</small></div>}</div>
        <div className="table-footer"><span>共 {number.format(rows.length)} 檔 · {rows.length ? current*20+1 : 0}–{Math.min((current+1)*20,rows.length)}</span><div><button aria-label="上一頁" disabled={current<=0} onClick={() => setPage(value => value-1)}><ChevronLeft size={16}/></button><span>{current+1} / {pages}</span><button aria-label="下一頁" disabled={current>=pages-1} onClick={() => setPage(value => value+1)}><ChevronRight size={16}/></button></div></div></section>
      <div className="bottom-grid"><section id="history" className="info-card"><span className="info-icon"><CalendarDays size={20}/></span><div><h3>每一週，都留下研究紀錄。</h3><p>切換已發布週次，查看當時的股票池與候選名單。</p><label className="history-label">選擇研究快照<select aria-label="選擇歷史研究週次" value={selected} onChange={event => setSelected(event.target.value)}><option value="">最近一期已發布</option>{weeks.map(week => <option key={week.id} value={week.id}>{week.signalDate} · {week.poolSize ? `市值前${week.poolSize}` : "全市場"} · {week.groupCount} 組 · {week.marketCapBasisDate ? `固定 ${week.marketCapBasisDate}` : "當期市值"}</option>)}</select></label></div></section>
      <section id="method" className="info-card"><span className="info-icon"><Sprout size={20}/></span><div><h3>規則透明，訊號有跡可循。</h3><p>{poolLabel} → 當週 OHLCV 影像 → 兩個 CNN 模型 → 各模型最高分組。市值池內不合格標的不以後順位遞補。</p><div className="model-pills"><span>分類：上漲分數</span><span>回歸：預測週報酬</span></div><details><summary>資料與模型說明</summary><p>模型版本：{data?.modelPeriod ?? "—"}。上漲分數為分類模型輸出，未宣稱是經校準的勝率。{fixedBasis ? `股票池依本機 ${fixedBasis} 歷史市值建立，固定保留當時前 1,000 大的名單與順位；表內市值也是基準日數值。每週只更新池內行情與模型分數，缺少行情或有效影像時不遞補，之後新上市公司不加入。歷史來源的原始發布時間未記錄。` : <>市值以當期 Yahoo 資料為主，缺值時以可得股數乘訊號日收盤價估計；該期全市場有 {fallback} 檔採備援估計。此舊快照保留當時規則。</>}</p><p>觀察區間為下一個日曆週，實際交易日依市場休市安排。收盤後訊號供之後可交易時點研究使用；來源取得時間與訊號日期不同。</p></details></div></section></div>
      {data && <div className="data-times">來源資料取得：{data.sourceUpdatedAt ? timestamp(data.sourceUpdatedAt) : "未記錄"} · 網站發布：{timestamp(data.publishedAt)}（台北時間）</div>}
      <footer><span>© {new Date().getFullYear()} 週線研究室<span className="footer-divider">/</span>僅供研究觀察，不構成投資建議。</span><span><Clock3 size={13}/>{data ? `資料產生 ${timestamp(data.generatedAt)} · 台北時間` : "每週五收盤後更新"}</span></footer>
    </main></div></div>;
}
