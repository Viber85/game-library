import { useEffect, useState } from "react";
import { PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import {
  subscribeThemeStatus, themeRuntimeStatus, type ThemeStatus,
} from "./builtinThemeRuntime";
import { selectBuiltinTheme } from "./themeController";

/** Future themes will be added to the built-in theme registry, not CSS Loader. */
export function BuiltinThemePanel(){
  const [current,setCurrent]=useState<ThemeStatus>(themeRuntimeStatus);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>subscribeThemeStatus(setCurrent),[]);
  const change=(enabled:boolean)=>{
    if(busy)return;
    setError("");
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
    {error&&<PanelSectionRow><div style={{fontSize:12,color:"#ffb1b9"}}>{error}</div></PanelSectionRow>}
  </PanelSection>;
}
