import { useState } from "react";
import { Focusable, Navigation } from "@decky/ui";
import { getLibraryGames } from "./steam";
import {
  collectLibraryDiagnostics,formatLibraryDiagnostics,
  type LibraryDiagnostic,
} from "./libraryDiagnostics";

const DASHBOARD_ROUTE="/game-library/dashboard";

/** Run in the same Steam Game Mode document as the dashboard, not the
 * potentially separate QAM overlay. No network access and no data upload. */
function snapshot():LibraryDiagnostic {
  const steam=window as any;
  return collectLibraryDiagnostics(
    steam.collectionStore,steam.appStore,getLibraryGames(),
  );
}

const DIAGNOSTICS_CSS=String.raw`
.gl-library-diag {
  position:absolute;inset:0;width:100%;height:100vh;
  background:#071426;color:#edf7ff;box-sizing:border-box;
  font-family:"Noto Sans","Inter",sans-serif;overflow-y:auto;
  padding:24px clamp(22px,4vw,60px) 38px;
}
.gl-library-diag * {box-sizing:border-box;}
.gl-library-diag .ld-title {font-size:27px;font-weight:800;margin:0 0 6px;}
.gl-library-diag .ld-help {font-size:14px;color:#b8d2e9;margin:0 0 16px;line-height:1.5;}
.gl-library-diag .ld-toolbar {display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;}
.gl-library-diag .ld-button {
  background:#123452;color:#f1f9ff;border:1px solid #388cc6;
  border-radius:10px;padding:12px 20px;font-size:16px;font-weight:700;
  min-width:120px;cursor:pointer;
}
.gl-library-diag .ld-button:is(.ld-focused,.gpfocus,:focus-visible) {
  background:#245c8d;outline:3px solid #fff;outline-offset:2px;
  box-shadow:0 0 0 6px #159cec;
}
.gl-library-diag .ld-grid {
  display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);
  gap:14px;align-items:start;
}
.gl-library-diag .ld-panel {
  border-radius:12px;border:1px solid #274b69;background:#10253c;
  padding:16px;min-width:0;
}
.gl-library-diag .ld-panel h2 {font-size:17px;margin:0 0 11px;}
.gl-library-diag .ld-stat {
  display:flex;justify-content:space-between;gap:12px;
  padding:6px 0;border-bottom:1px solid #27415a;font-size:14px;
}
.gl-library-diag .ld-stat strong {font-size:18px;color:#8edbff;}
.gl-library-diag .ld-note {font-size:13px;line-height:1.5;color:#d5e6f6;margin:14px 0 0;}
.gl-library-diag .ld-report {
  white-space:pre-wrap;overflow-wrap:anywhere;
  font:12.5px/1.65 ui-monospace,monospace;margin:0;
}
.gl-library-diag .ld-error {color:#ffc1c8;font-size:14px;margin:8px 0;}
@media(max-width:880px) {
 .gl-library-diag {padding:17px 18px 32px;}
 .gl-library-diag .ld-title {font-size:22px;}
 .gl-library-diag .ld-grid {grid-template-columns:1fr;}
 .gl-library-diag .ld-report {font-size:12px;}
}
`;

export function LibraryDiagnostics(){
  const [report,setReport]=useState<LibraryDiagnostic|null>(()=>{
    try{return snapshot();}catch{return null;}
  });
  const [message,setMessage]=useState("");
  const refresh=()=>{
    try{setReport(snapshot());setMessage("Steam library sources refreshed.");}
    catch(error){setMessage("Steam inspection unavailable: "+String(error));}
  };
  const copy=()=>{
    if(!report)return;
    const text=formatLibraryDiagnostics(report);
    if(!navigator.clipboard?.writeText){
      setMessage("Clipboard unavailable in Steam Game Mode. Photograph both report sections instead.");
      return;
    }
    void navigator.clipboard.writeText(text).then(()=>{
      setMessage("Aggregate report copied. No game titles or app IDs included.");
    }).catch(()=>{
      setMessage("Clipboard access denied. Photograph the source counts instead.");
    });
  };
  const back=()=>Navigation.Navigate(DASHBOARD_ROUTE);
  return <div className="gl-library-diag">
    <style>{DIAGNOSTICS_CSS}</style>
    <h1 className="ld-title">Library data diagnostics</h1>
    <p className="ld-help">
      Read-only inspection of what SteamOS makes available to Game Library
      in this exact window. No data is uploaded or saved. Only aggregate counts
      are included in the report.
    </p>
    <div className="ld-toolbar">
      <Focusable className="ld-button" focusClassName="ld-focused"
        preferredFocus noFocusRing onActivate={refresh}
        onOKActionDescription="Refresh Steam library diagnostics">Refresh</Focusable>
      <Focusable className="ld-button" focusClassName="ld-focused"
        noFocusRing onActivate={copy}
        onOKActionDescription="Copy aggregate diagnostic report">Copy report</Focusable>
      <Focusable className="ld-button" focusClassName="ld-focused"
        noFocusRing onActivate={back}
        onOKActionDescription="Back to Game Library">Back</Focusable>
    </div>
    {message&&<p className="ld-error">{message}</p>}
    {report ? <div className="ld-grid">
      <section className="ld-panel">
        <h2>What Game Library actually sees</h2>
        <div className="ld-stat"><span>Candidate IDs</span><strong>{report.candidateRows}</strong></div>
        <div className="ld-stat"><span>Displayed games</span><strong>{report.displayedGames}</strong></div>
        <div className="ld-stat"><span>Installed</span><strong>{report.installed}</strong></div>
        <div className="ld-stat"><span>Favorites</span><strong>{report.favorites}</strong></div>
        <div className="ld-stat"><span>Non-Steam</span><strong>{report.nonSteam}</strong></div>
        <div className="ld-stat"><span>Steam collectionStore</span><strong>{report.collectionsAvailable?"Yes":"No"}</strong></div>
        <div className="ld-stat"><span>Steam appStore</span><strong>{report.appStoreAvailable?"Yes":"No"}</strong></div>
        <div className="ld-stat"><span>Unresolved title samples</span><strong>{report.sampledUnresolved} / {report.sampled}</strong></div>
        <p className="ld-note"><strong>Observation:</strong> {report.issue}</p>
        <p className="ld-note">Compare Installed and Favorites with the original
          Steam Library. If the counts differ, photograph this overview
          and the source report alongside it.</p>
      </section>
      <section className="ld-panel">
        <h2>Native Steam sources (counts only)</h2>
        <pre className="ld-report">{formatLibraryDiagnostics(report)}</pre>
      </section>
    </div>:<p className="ld-error">Could not inspect the Steam library.
      Choose Refresh when Steam Game Mode has finished loading.</p>}
  </div>;
}
