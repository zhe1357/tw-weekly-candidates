"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronRight, RefreshCw } from "lucide-react";
import FixedPoolList from "@/components/fixed-pool-list";
import SiteSidebar from "@/components/site-sidebar";
import type { Snapshot } from "@/lib/public-data";
import { fetchRun, fetchWeeks, homeUrl } from "@/lib/paths";

export default function FixedPoolPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetchWeeks(controller.signal)
      .then(weeks => fetchRun<Snapshot>(weeks, null, controller.signal))
      .catch(reason => { if (reason.name === "AbortError") throw reason; throw new Error("暫時無法取得最近一期模型輸入狀態，完整固定名單仍可查看與下載。"); })
      .then(setSnapshot)
      .catch(reason => { if (reason.name !== "AbortError") setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  return <div className="site-shell">
    <a className="skip-link" href="#fixed-pool">跳至固定股票池名單</a>
    <SiteSidebar active="fixed-pool"/>
    <div className="main-shell">
      <header className="topbar"><span>研究工作台 <ChevronRight size={13}/><strong>固定股票池</strong></span>
        <div><span className="public-badge"><span className="tiny-dot"/>公開研究資料</span><button className="icon-button" aria-label="重新載入模型輸入狀態" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} className={loading ? "spinning" : ""}/></button></div>
      </header>
      <main>
        <section className="page-heading"><div><div className="eyebrow">TAIWAN EQUITY / FIXED UNIVERSE</div><h1>固定股票池<span>2025 年底市值前 1,000 大。</span></h1><p>查看固定名單、年底市值順位與 Yahoo 行情連結；模型輸入狀態參考最近一期已發布快照。</p></div><a className="method-link" href={homeUrl()}>返回候選名單 <ArrowUpRight size={16}/></a></section>
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setRefresh(value => value + 1)}>重試</button></div>}
        {loading && <p className="pool-status-note" role="status">正在載入最近一期模型輸入狀態…</p>}
        <FixedPoolList snapshot={snapshot}/>
        <footer><span>© {new Date().getFullYear()} 週線研究室 · 僅供研究觀察，不構成投資建議。</span><a href={homeUrl()}>返回每週候選名單</a></footer>
      </main>
    </div>
  </div>;
}
