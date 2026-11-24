import { fixedPoolUrl, homeUrl } from "@/lib/paths";
import { ChartNoAxesCombined, Layers, ChevronRight, ListFilter, CalendarDays, CircleHelp, Sprout } from "lucide-react";

export default function SiteSidebar({ active }: { active: "candidates" | "fixed-pool" }) {
  return <aside className="sidebar"><a className="brand" href={homeUrl()}><span className="brand-icon"><ChartNoAxesCombined size={23}/></span><span>週線研究室<small>WEEKLY SIGNALS</small></span></a>
      <div className="workspace-label">台股研究工作台 <span>TW</span></div><nav aria-label="主要導覽"><a className={active === "candidates" ? "nav-active" : undefined} aria-current={active === "candidates" ? "page" : undefined} href={homeUrl("#candidates")}><Layers size={18}/>候選名單<ChevronRight size={15}/></a><a className={active === "fixed-pool" ? "nav-active" : undefined} aria-current={active === "fixed-pool" ? "page" : undefined} href={fixedPoolUrl}><ListFilter size={18}/>固定池 1,000 檔</a><a href={homeUrl("#history")}><CalendarDays size={18}/>歷史週次</a><a href={homeUrl("#method")}><CircleHelp size={18}/>研究方法</a></nav>
      <div className="sidebar-note"><span className="tiny-dot"/>每週五更新<small>收盤後完成資料檢查，再發布新一期候選名單。</small><span className="schedule">18:00 · ASIA / TAIPEI</span></div>
      <div className="sidebar-bottom"><Sprout size={19}/><span>讓研究，持續發生。<small>OHLCV · CNN · TAIWAN</small></span></div></aside>;
}
