import { useRef, useState } from "react";
import {useNativeMenuGamepad,focusNativeMenuControl} from "./nativeMenuGamepad";
import { Focusable, Navigation, GamepadButton, type GamepadEvent } from "@decky/ui";
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
.gl-library-diag .ld-panel-focus {
  cursor:default;min-height:150px;max-height:65vh;overflow-y:auto;
  scrollbar-color:#4e86b0 transparent;
}
.gl-library-diag .ld-panel-focus:is(.ld-focused,.gpfocus,:focus-visible) {
  outline:3px solid #fff;outline-offset:2px;
  box-shadow:0 0 0 5px #159cec;
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
  const menuRoot=useRef<HTMLDivElement>(null);
  const buttonRefs=useRef<Array<HTMLDivElement|null>>([]);
  const panelRefs=useRef<Array<HTMLDivElement|null>>([]);
  useNativeMenuGamepad("diagnostics",menuRoot);
  const focusButton=(index:number,button:GamepadButton)=>
    focusNativeMenuControl(buttonRefs.current[index],button);
  const focusPanel=(index:number,button:GamepadButton)=>
    focusNativeMenuControl(panelRefs.current[index],button);
  const moveToolbar=(index:number,button:GamepadButton)=>{
    if(button===GamepadButton.DIR_LEFT&&index>0)
      focusButton(index-1,button);
    else if(button===GamepadButton.DIR_RIGHT&&index<2)
      focusButton(index+1,button);
    else if(button===GamepadButton.DIR_DOWN)
      focusPanel(index===2?1:0,button);
    // At the toolbar's edges, leave navigation to Steam.
  };
  const movePanel=(index:number,button:GamepadButton)=>{
    if(button===GamepadButton.DIR_LEFT&&index===1)
      focusPanel(0,button);
    else if(button===GamepadButton.DIR_RIGHT&&index===0)
      focusPanel(1,button);
    else if(button===GamepadButton.DIR_UP){
      const panel=panelRefs.current[index];
      if(panel&&panel.scrollTop>1)panel.scrollBy({top:-120});
      else focusButton(index===0?0:2,button);
    }else if(button===GamepadButton.DIR_DOWN){
      panelRefs.current[index]?.scrollBy({top:120});
    }
  };
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
  // Focusable has onButtonDown (not onMove). Use the actual GamepadEvent
  // for all four directions so D-pad and analog dispatch identically.
  const onToolbarButton=(index:number)=>(event:GamepadEvent)=>{
    const button=event.detail?.button;
    if(button===GamepadButton.DIR_LEFT||button===GamepadButton.DIR_RIGHT||
       button===GamepadButton.DIR_UP||button===GamepadButton.DIR_DOWN){
      event.preventDefault();event.stopPropagation();
      moveToolbar(index,button);
    }
  };
  const onPanelButton=(index:number)=>(event:GamepadEvent)=>{
    const button=event.detail?.button;
    if(button===GamepadButton.DIR_LEFT||button===GamepadButton.DIR_RIGHT||
       button===GamepadButton.DIR_UP||button===GamepadButton.DIR_DOWN){
      event.preventDefault();event.stopPropagation();
      movePanel(index,button);
    }
  };
  return <div className="gl-library-diag" ref={menuRoot}>
    <style>{DIAGNOSTICS_CSS}</style>
    <h1 className="ld-title">Library data diagnostics</h1>
    <p className="ld-help">
      Read-only inspection of what SteamOS makes available to Game Library
      in this exact window. No data is uploaded or saved. Only aggregate counts
      are included in the report.
    </p>
    <div className="ld-toolbar">
      <Focusable ref={el=>{buttonRefs.current[0]=el;}}
        className="ld-button" focusClassName="ld-focused"
        preferredFocus noFocusRing onActivate={refresh} onCancelButton={back}
        onButtonDown={onToolbarButton(0)}
        onOKActionDescription="Refresh Steam library diagnostics">Refresh</Focusable>
      <Focusable ref={el=>{buttonRefs.current[1]=el;}}
        className="ld-button" focusClassName="ld-focused"
        noFocusRing onActivate={copy} onCancelButton={back}
        onButtonDown={onToolbarButton(1)}
        onOKActionDescription="Copy aggregate diagnostic report">Copy report</Focusable>
      <Focusable ref={el=>{buttonRefs.current[2]=el;}}
        className="ld-button" focusClassName="ld-focused"
        noFocusRing onActivate={back} onCancelButton={back}
        onButtonDown={onToolbarButton(2)}
        onOKActionDescription="Back to Game Library">Back</Focusable>
    </div>
    {message&&<p className="ld-error">{message}</p>}
    {report ? <div className="ld-grid">
      <Focusable ref={el=>{panelRefs.current[0]=el;}} 
        className="ld-panel ld-panel-focus" focusClassName="ld-focused" noFocusRing
        onButtonDown={onPanelButton(0)} onCancelButton={back}>
        <h2>What Game Library actually sees</h2>
        <div className="ld-stat"><span>Candidate IDs</span><strong>{report.candidateRows}</strong></div>
        <div className="ld-stat"><span>Displayed games</span><strong>{report.displayedGames}</strong></div>
        <div className="ld-stat"><span>Steam All Games tab</span>
          <strong>{report.collectionSources.find(s=>s.name==="all-games")?.merged ?? "—"}</strong></div>
        <div className="ld-stat"><span>Steam Installed tab</span>
          <strong>{report.collectionSources.find(s=>s.name==="local-install")?.merged ?? "—"}</strong></div>
        <div className="ld-stat"><span>Installed flags (including shortcuts)</span><strong>{report.installed}</strong></div>
        <div className="ld-stat"><span>Favorites</span><strong>{report.favorites}</strong></div>
        <div className="ld-stat"><span>Non-Steam</span><strong>{report.nonSteam}</strong></div>
        <div className="ld-stat"><span>Steam collectionStore</span><strong>{report.collectionsAvailable?"Yes":"No"}</strong></div>
        <div className="ld-stat"><span>Steam appStore</span><strong>{report.appStoreAvailable?"Yes":"No"}</strong></div>
        <div className="ld-stat"><span>Unresolved title samples</span><strong>{report.sampledUnresolved} / {report.sampled}</strong></div>
        <p className="ld-note"><strong>Observation:</strong> {report.issue}</p>
        <p className="ld-note">Compare Installed and Favorites with the original
          Steam Library. If the counts differ, photograph this overview
          and the source report alongside it.</p>
      </Focusable>
      <Focusable ref={el=>{panelRefs.current[1]=el;}}
        className="ld-panel ld-panel-focus" focusClassName="ld-focused" noFocusRing
        onButtonDown={onPanelButton(1)} onCancelButton={back}>
        <h2>Native Steam sources (counts only)</h2>
        <pre className="ld-report">{formatLibraryDiagnostics(report)}</pre>
      </Focusable>
    </div>:<p className="ld-error">Could not inspect the Steam library.
      Choose Refresh when Steam Game Mode has finished loading.</p>}
  </div>;
}
