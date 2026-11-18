import { useEffect, useState } from "react";
import { ButtonItem, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import {
  subscribeThemeStatus, themeRuntimeStatus, runThemeDiagnostics,
  type ThemeDiagnostics, type ThemeStatus,
} from "./builtinThemeRuntime";
import { selectBuiltinTheme } from "./themeController";

/** Future themes will be added to the built-in theme registry, not CSS Loader. */
export function BuiltinThemePanel(){
  const [current,setCurrent]=useState<ThemeStatus>(themeRuntimeStatus);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [diagnostics,setDiagnostics]=useState<ThemeDiagnostics|null>(null);
  const [checking,setChecking]=useState(false);
  useEffect(()=>subscribeThemeStatus(setCurrent),[]);
  const change=(enabled:boolean)=>{
    if(busy)return;
    setError("");
    setDiagnostics(null);
    setBusy(true);
    void selectBuiltinTheme(enabled?"midnight":"off")
      .catch(e=>setError("Unable to change system theme: "+String(e)))
      .finally(()=>setBusy(false));
  };
  const enabled=current.selected==="midnight";
  const applied=current.appliedTabs;
  return <PanelSection title="Game Library · Appearance">
    <PanelSectionRow>
      <ToggleField
        label="Midnight — Default Theme"
        description="Built into Game Library. Navy/cyan colors for Steam Menu, QAM, Settings, Downloads, buttons and dialogs. Automatically restored after reboot. Switch off to use original Steam colors."
        checked={enabled}
        disabled={busy}
        onChange={change}
      />
    </PanelSectionRow>
    <PanelSectionRow>
      <div style={{fontSize:12,opacity:.86,lineHeight:1.5}}>
        <strong>Current theme:</strong> {enabled?"Midnight":"Steam default"}
        {enabled&&<div style={{marginTop:4}}>
          {applied>0
            ? "Applied to "+applied+" Steam UI window"+(applied===1?"":"s")+
              (current.hasQAM?" · QAM":"")+(current.hasMenu?" · Steam Menu":"")
            : "Waiting for Steam Game Mode UI…"}
        </div>}
        {enabled&&current.issue&&<div>{current.issue}</div>}
        <div style={{marginTop:5}}>
          No CSS Loader required. Additional Game Library themes can be added in future updates.
        </div>
      </div>
    </PanelSectionRow>
    {enabled&&<PanelSectionRow>
      <ButtonItem layout="below" disabled={busy||checking} onClick={()=>{
        setChecking(true);
        setError("");
        void runThemeDiagnostics()
          .then(result=>setDiagnostics(result))
          .catch(err=>setError("Steam CSS diagnostics failed: "+String(err)))
          .finally(()=>setChecking(false));
      }}>
        {checking?"Inspecting Steam UI…":"Read CEF diagnostics (no reload)"}
      </ButtonItem>
    </PanelSectionRow>}
    {diagnostics&&<PanelSectionRow>
      <div style={{fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>
        <strong>Actual Steam CSS check</strong>
        <div>CEF tab: {diagnostics.target}</div>
        <div>Visible Steam UI: {diagnostics.detectedVisibleUI?"Yes":"No"}</div>
        <div>CSS in Steam document: {diagnostics.applied?"Verified":"Not verified"} · stylesheets: {diagnostics.cssSheets}</div>
        <div>Steam CSS watcher: {diagnostics.watcherRunning
          ?"Active · "+diagnostics.watcherTicks+" scans · "+diagnostics.watcherAgeSeconds+"s since last scan"
          :"Not active"}</div>
        <div>Detected page route: {diagnostics.detectedRoute}</div>
        <div>Page inspection: {diagnostics.captureSource==="before-qam"
          ?"Captured before QAM · "+diagnostics.capturedPage+" · "+diagnostics.captureAgeSeconds+"s ago"
          :diagnostics.captureSource==="live"?"Live "+diagnostics.capturedPage
          :"No active page snapshot"}</div>
        <div>Settings page / rows: {diagnostics.settingsRoots} / {diagnostics.settingsFields}</div>
        <div>Network entries: {diagnostics.networkRows}</div>
        <div>Midnight special Settings rows: {diagnostics.specialSettingsRows}</div>
        <div>Decky Settings: {diagnostics.deckySettingsActive?"Detected":"Not detected"} (route or live DOM)</div>
        <div>Live Decky PageListColumn/Field layout: {diagnostics.deckyObservedDom?"Detected":"Not detected"}</div>
        <div>Direct Midnight CSS rule: {diagnostics.deckyLiveCssMatched?"Matched":"Not matched"}</div>
        <div>Decky native Field matches: {diagnostics.deckyFieldRows}</div>
        <div>Real CEF snapshots: {diagnostics.domEvidence.length}</div>
        <div>Controller focus transition frames: {diagnostics.focusTrace.length}</div>
        <div>Preserved brighter-blue gamepad paint: {diagnostics.focusAnomalies.length} event(s)</div>
        {diagnostics.focusAnomalies.slice(0,5).map((frame,i)=>
          <div key={"flash-"+i} style={{marginTop:6,padding:7,border:"1px solid #526b86",borderRadius:5}}>
            <strong>Bright focus paint {i+1}</strong> · {frame.reason} · {Math.max(0,Math.round((Date.now()-frame.at)/1000))}s ago
            {frame.items.filter(item=>{
              const n=(item.bg.match(/[0-9.]+/g)||[]).map(Number);
              return n.length>=3&&n[2]>=112&&n[2]>n[0]+48&&n[1]>n[0]+18;
            }).slice(0,4).map((item,k)=>
              <div key={k} style={{fontSize:11,overflowWrap:"anywhere"}}>
                {item.role}/{item.layer} · .{item.cls||"(none)"} · {item.bg}
                {item.animation!=="none"?" · animation "+item.animation:""}
                {item.transition&&item.transition!=="0s"?" · transition "+item.transition:""}
              </div>)}
          </div>)}
        {diagnostics.focusAnomalies.length>0&&
          <ButtonItem layout="below" onClick={()=>{
            void navigator.clipboard?.writeText(
              JSON.stringify(diagnostics.focusAnomalies,null,2)
            )?.catch(()=>setError("Copy unavailable; send screenshots of the bright focus paint entries."));
          }}>Copy preserved bright-blue focus evidence</ButtonItem>}
        {diagnostics.focusTrace.slice(0,5).map((frame,i)=>
          <div key={i} style={{marginTop:6,paddingTop:5,borderTop:"1px solid #345"}}>
            <strong>Focus frame {i+1}</strong> · {frame.reason} · {Math.max(0,Math.round((Date.now()-frame.at)/1000))}s ago
            {frame.items.filter(item=>item.bg||item.image!=="none"||item.shadow==="present")
              .slice(0,8).map((item,k)=>
                <div key={k} style={{fontSize:11,overflowWrap:"anywhere"}}>
                  {item.role}/{item.layer} · .{item.cls||"(none)"} · {item.bg||"(transparent)"}
                  {item.image!=="none"?" · "+item.image:""}
                  {item.shadow==="present"?" · shadow":""}
                  {item.animation&&item.animation!=="none"?" · animation "+item.animation:""}
                </div>)}
          </div>)}
        {diagnostics.focusTrace.length>0&&
          <ButtonItem layout="below" onClick={()=>{
            void navigator.clipboard?.writeText(
              JSON.stringify(diagnostics.focusTrace,null,2)
            )?.catch(()=>setError("Copy unavailable; send screenshots of the focus frames."));
          }}>Copy gamepad focus transition trace</ButtonItem>}
        {diagnostics.domEvidence.slice(0,4).map((capture,i)=>
          <div key={i} style={{marginTop:8,borderTop:"1px solid #345",paddingTop:5}}>
            <strong>CEF snapshot {i+1}</strong> · {Math.max(0,Math.round((Date.now()-capture.at)/1000))}s ago
            {capture.items.slice(0,8).map((item,k)=>
              <div key={k} style={{fontSize:11,overflowWrap:"anywhere"}}>
                {item.zone} · .{item.classes||"(none)"} · {item.color}
                {item.parent?" · parent ."+item.parent:""}
              </div>)}
          </div>)}
        {diagnostics.domEvidence.length>0&&
          <ButtonItem layout="below" onClick={()=>{
            void navigator.clipboard?.writeText(
              JSON.stringify(diagnostics.domEvidence,null,2)
            )?.catch(()=>setError("Copy unavailable; send a screenshot."));
          }}>Copy CEF class/color evidence</ButtonItem>}
        {diagnostics.deckyFieldColor&&
          <div>Decky actual Field color: {diagnostics.deckyFieldColor}</div>}
        {diagnostics.specialSettingsRowColor&&
          <div>Special row actual fill: {diagnostics.specialSettingsRowColor}</div>}
        <div>Game page / sections: {diagnostics.gameRoots} / {diagnostics.gameSections}</div>
        {diagnostics.computedFieldColor&&
          <div>Actual row background: {diagnostics.computedFieldColor}</div>}
        {diagnostics.sampleClasses.length>0&&
          <div>Detected Steam classes: {diagnostics.sampleClasses.slice(0,4).join(", ")}</div>}
        <div>Blue surface elements sampled: {diagnostics.surfaceElements}</div>
        {diagnostics.colorSamples.slice(0,3).map((item,i)=>
          <div key={i} style={{fontSize:11,opacity:.85}}>
            {item.color} · {item.count} elements · .{item.className}
          </div>)}
        <div style={{marginTop:4,color:diagnostics.applied?"#c5e7f7":"#ffb1b9"}}>{diagnostics.details}</div>
        <div style={{opacity:.7,marginTop:4}}>
          Close QAM and move 5–10 rows using D-pad or left analog in
          Steam Settings and Decky Settings. When the blue flash appears,
          return here and choose Read CEF diagnostics. Photograph the
          preserved brighter-blue focus entries (if any), or copy their
          evidence. These are retained even when normal frames replace the
          rolling trace. No text, names, URLs or input values are collected.
          Do not toggle Midnight before copying.
        </div>
      </div>
    </PanelSectionRow>}
    {error&&<PanelSectionRow><div style={{fontSize:12,color:"#ffb1b9"}}>{error}</div></PanelSectionRow>}
  </PanelSection>;
}
