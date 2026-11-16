import { useEffect, useState } from "react";
import { ButtonItem, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import {
  subscribeThemeStatus, themeRuntimeStatus, runThemeDiagnostics,
  refreshBuiltinTheme, type ThemeDiagnostics, type ThemeStatus,
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
        void refreshBuiltinTheme().then(()=>runThemeDiagnostics())
          .then(result=>setDiagnostics(result))
          .catch(err=>setError("Steam CSS diagnostics failed: "+String(err)))
          .finally(()=>setChecking(false));
      }}>
        {checking?"Inspecting Steam UI…":"Reapply theme & diagnose"}
      </ButtonItem>
    </PanelSectionRow>}
    {diagnostics&&<PanelSectionRow>
      <div style={{fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>
        <strong>Actual Steam CSS check</strong>
        <div>CEF tab: {diagnostics.target}</div>
        <div>Visible Steam UI: {diagnostics.detectedVisibleUI?"Yes":"No"}</div>
        <div>CSS in Steam document: {diagnostics.applied?"Verified":"Not verified"} · stylesheets: {diagnostics.cssSheets}</div>
        <div>Page inspection: {diagnostics.captureSource==="before-qam"
          ?"Captured before QAM · "+diagnostics.capturedPage+" · "+diagnostics.captureAgeSeconds+"s ago"
          :diagnostics.captureSource==="live"?"Live "+diagnostics.capturedPage
          :"No active page snapshot"}</div>
        <div>Settings page / rows: {diagnostics.settingsRoots} / {diagnostics.settingsFields}</div>
        <div>Network entries: {diagnostics.networkRows}</div>
        <div>Game page / sections: {diagnostics.gameRoots} / {diagnostics.gameSections}</div>
        {diagnostics.computedFieldColor&&
          <div>Actual row background: {diagnostics.computedFieldColor}</div>}
        {diagnostics.sampleClasses.length>0&&
          <div>Detected Steam classes: {diagnostics.sampleClasses.slice(0,4).join(", ")}</div>}
        <div style={{marginTop:4,color:diagnostics.applied?"#c5e7f7":"#ffb1b9"}}>{diagnostics.details}</div>
        <div style={{opacity:.7,marginTop:4}}>
          To capture the previous screen: close QAM, open System/Internet
          Settings or Game Details for at least two seconds, then reopen QAM
          and run this check. Only CSS classes, counts and colors are shown —
          no Wi-Fi names or game titles.
        </div>
      </div>
    </PanelSectionRow>}
    {error&&<PanelSectionRow><div style={{fontSize:12,color:"#ffb1b9"}}>{error}</div></PanelSectionRow>}
  </PanelSection>;
}
