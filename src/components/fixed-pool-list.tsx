"use client";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import pool from "@/data/fixed-pool.json";
import type { Snapshot } from "@/lib/public-data";
import { yahooQuoteUrl } from "@/lib/selection";
import { assetUrl } from "@/lib/paths";

const number = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 });
const pageSize = 50;

export default function FixedPoolList({ snapshot }: { snapshot: Snapshot | null }) {
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("all");
  const [page, setPage] = useState(0);
  // Compare against the saved maximum universe, never the visitor's top-N view.
  const comparable = snapshot?.poolMode === "fixed" && snapshot.marketCapBasisDate === pool.basisDate && !!snapshot.universeRows;
  const eligible = useMemo(() => new Set(comparable ? snapshot!.universeRows!.map(row => row.ticker) : []), [snapshot, comparable]);
  const rows = useMemo(() => pool.rows.filter(row => (market === "all" || row.market === market)
    && `${row.ticker} ${row.name}`.toLowerCase().includes(search.trim().toLowerCase())), [search, market]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * pageSize, (current + 1) * pageSize);

  return <section id="fixed-pool" className="table-card fixed-pool-card" aria-labelledby="fixed-pool-title">
    <div className="section-heading"><div><div className="section-kicker">THE FIXED UNIVERSE</div>
      <h2 id="fixed-pool-title">固定股票池完整名單 · 1,000 檔</h2>
      <p>依 {pool.basisDate} 市值順位排列，完整名單不受候選頁面的前 N 大及組數設定影響。缺少當週預測的標的仍保留。</p>
    </div><a className="export-button" href={assetUrl("fixed-pool-2025-12-31-top1000.csv")} download><ArrowDownToLine size={15}/>下載完整 1,000 檔 CSV</a></div>
    <div className="table-tools"><label className="search"><Search size={17}/><input aria-label="搜尋固定股票池代碼或名稱" placeholder="搜尋 1,000 檔代碼或名稱…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }}/>{search && <button aria-label="清除固定池搜尋" onClick={() => { setSearch(""); setPage(0); }}>×</button>}</label>
      <div><select aria-label="篩選固定股票池市場" value={market} onChange={event => { setMarket(event.target.value); setPage(0); }}><option value="all">全部市場</option><option value="TWSE">上市</option><option value="TPEX">上櫃</option></select></div></div>
    <p className="pool-status-note">{comparable ? `快照訊號日 ${snapshot!.signalDate}：${number.format(eligible.size)} 檔有有效模型輸入，${number.format(pool.count - eligible.size)} 檔未取得有效輸入。狀態依完整固定池判定，不受候選頁面篩選影響。` : "固定名單與每週預測分開保存；目前快照未提供可比對的完整固定池分數，當週狀態暫不判定。"}</p>
    <div className="table-scroll"><table><thead><tr><th scope="col">年底市值順位</th><th scope="col">股票 / 市場</th><th scope="col">基準日市值<span>{pool.basisDate} · 億元 TWD</span></th><th scope="col">快照模型輸入狀態</th></tr></thead>
      <tbody>{visible.map(row => { const url = yahooQuoteUrl({ ...row, market: row.market === "TPEX" ? "TPEX" : "TWSE" }); return <tr key={row.ticker}><td className="numeric">#{row.marketCapRank}</td><td><div className="stock-cell"><span className="stock-avatar">{row.ticker.slice(0,2)}</span><div><strong><a className="stock-name-link" href={url ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={`在 Yahoo Finance 查看 ${row.name}（${row.ticker}）行情，另開分頁`}>{row.name}<ArrowUpRight size={13}/></a></strong><small>{row.ticker}<span>{row.market === "TWSE" ? "上市" : "上櫃"}</span><span className="yahoo-hint">Yahoo 行情</span></small></div></div></td><td className="numeric">{number.format(row.marketCapMillion / 100)}</td><td><span className={`signal-tag ${comparable && eligible.has(row.ticker) ? "consensus" : ""}`}>{!comparable ? "尚未比對" : eligible.has(row.ticker) ? "有效模型輸入" : "未取得有效輸入"}</span></td></tr>; })}</tbody></table>
      {!rows.length && <div className="table-empty"><Search size={24}/><p>沒有符合條件的固定池標的</p><small>請調整搜尋字詞或市場。</small></div>}</div>
    <div className="table-footer"><span aria-live="polite">符合 {number.format(rows.length)} / 1,000 檔 · {rows.length ? current * pageSize + 1 : 0}–{Math.min((current + 1) * pageSize, rows.length)}</span><div><button aria-label="固定股票池上一頁" disabled={current <= 0} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/></button><span>{current + 1} / {pages}</span><button aria-label="固定股票池下一頁" disabled={current >= pages - 1} onClick={() => setPage(value => value + 1)}><ChevronRight size={16}/></button></div></div>
  </section>;
}
