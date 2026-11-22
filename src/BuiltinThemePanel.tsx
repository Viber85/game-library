import { useEffect, useState } from "react";
import { ButtonItem, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import {
  subscribeThemeStatus, themeRuntimeStatus, runThemeDiagnostics,
  type ThemeDiagnostics, type ThemeStatus,
} from "./builtinThemeRuntime";
import { selectBuiltinTheme,selectCompactDetails } from "./themeController";

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
  const changeCompact=(next:boolean)=>{
    if(busy||current.selected!=="midnight")return;
    setError("");setDiagnostics(null);setBusy(true);
    void selectCompactDetails(next)
      .catch(e=>setError("Unable to update Compact Game Details: "+String(e)))
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
      <ToggleField label="Compact Game Details · Test"
        description="Steam's native Game Details in a tighter layout inspired by Game Library. Keeps Install/Play, controller settings, activity, your stuff and the Game Info tabs. Switch off to restore the original layout. Requires Midnight."
        checked={current.compactDetails} disabled={busy||!enabled}
        onChange={changeCompact}/>
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
      <div style={{fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap",overflowWrap:"anywhere",
        padding:10,border:"1px solid #397397",borderRadius:9,background:"#071b2c"}}>
        <strong>Compact Game Details — Quick check</strong>
        <div>Native game evidence: {diagnostics.nativeEvidenceSource==="live"
          ?"LIVE ORIGINAL STEAM DETAILS":diagnostics.nativeEvidenceSource==="before-qam"
          ?"CAPTURED BEFORE DECKY · "+diagnostics.nativeEvidenceAgeSeconds+"s ago"
          :"NOT VERIFIED · Open original Steam Details before Decky"}</div>
        <div>Option enabled: {diagnostics.compactEnabled?"YES":"NO"}</div>
        <div>Midnight CSS verified: {diagnostics.applied?"YES":"NO"}</div>
        <div>Compact stylesheet present: {diagnostics.compactCssLoaded?"YES":"NOT CONFIRMED"}</div>
        <div>Native Steam hero: {diagnostics.nativeHeroFound?"FOUND":"NOT FOUND"}
          {" · "}{diagnostics.nativeHeroStyled?"STYLE APPLIED":"Style not confirmed"}
          {diagnostics.nativeHeroHeight>0?" · "+diagnostics.nativeHeroHeight+" px":""}</div>
        <div>Native Steam Play/Install: {diagnostics.nativePlayBarFound?"FOUND":"NOT FOUND"}
          {diagnostics.nativePlayBarSource?" ("+diagnostics.nativePlayBarSource+")":""}
          {" · "}{diagnostics.nativePlayBarStyled?"STYLE APPLIED":"Style not confirmed"}
          {diagnostics.nativePlayBarHeight>0?" · "+diagnostics.nativePlayBarHeight+" px":""}</div>
        <div>Native style directly verified recently: {diagnostics.nativeStyledRecently?
          "YES · "+diagnostics.nativeStyleAgeSeconds+"s ago":"NOT CONFIRMED"}</div>
        <div>Verified native Play panel surfaces: {diagnostics.nativePlaySurfaceCount}</div>
        <div>Visible blue panels found: {diagnostics.nativePaintCount}</div>
        <div>Panels confirmed dark by actual computed paint: {diagnostics.nativeEvidenceSource==="unverified"
          ?"NOT VERIFIED":diagnostics.nativePaintNeutralized}</div>
        <div>HLTB in original Steam Details: {diagnostics.nativeEvidenceSource==="unverified"
          ?"NOT VERIFIED":diagnostics.hltbFound?"FOUND":"NOT FOUND"}
          {" · "}{diagnostics.nativeEvidenceSource==="unverified"?"No game-only sample":
          diagnostics.hltbStyled?"STYLE APPLIED":"Style not confirmed"}</div>
        <div>Current Steam CSS-module aliases resolved: {diagnostics.nativeAliasesResolved}/6</div>
        <div>Global compact CSS selector (not proof of a changed element):
          {" "}{diagnostics.compactMatchedRecently
          ?"Matched "+diagnostics.compactMatchAgeSeconds+"s ago":"Not confirmed"}</div>
        <div>Native Steam game header: {diagnostics.nativeHeaderCount} readable-class matches</div>
        <div>Native Steam Play bar: {diagnostics.nativePlayBarCount} readable-class matches</div>
        <div>Game Library UI currently visible: {diagnostics.libraryUIVisible?"YES":"NO"}</div>
        <div style={{opacity:.78,fontSize:11,marginTop:5}}>
          A verified Midnight stylesheet or root selector does NOT prove that
          native hero/Play controls changed. The verified per-element native
          style and pixel heights above are the actual test. If they are
          missing, we need the Steam class mapping, not another blind CSS edit.
          A computed dark color on two DOM elements does not prove the large
          visible Steam bars are both dark. The measurements above must come
          from one native-game-only snapshot. If the evidence is unverified,
          close this panel, open the original Steam Details page, then return.
          Steam may use hashed class names, so zero readable-class matches alone
          are not a failure. The verified layout-match status is authoritative.
        </div>
      </div>
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
        <div><strong>Compact Details requested:</strong> {diagnostics.compactEnabled?"Yes":"No"}</div>
        {diagnostics.compactEnabled&&<>
          <div>Compact CSS injected: {diagnostics.compactCssLoaded?"Yes":"Not confirmed"}</div>
          <div>Compact CSS matching native game now:
            {" "}{diagnostics.compactStyleActive?"YES — active":"Not confirmed (QAM can hide game page)"}
          </div>
          <div>Last actual game match: {diagnostics.compactMatchedRecently
            ?"Confirmed "+diagnostics.compactMatchAgeSeconds+"s ago":
            "Never confirmed in the last 3 minutes"}</div>
          <div>Decorative cover loaded: {diagnostics.compactPosterShown?"Yes":"No / unavailable"}</div>
          <div style={{opacity:.75,fontSize:11}}>
            For an accurate result, visit a Steam game's native Details page,
            then immediately open Decky and press Read CEF diagnostics.
            A saved Game Details snapshot is used when QAM hides the page.
          </div>
        </>}
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
