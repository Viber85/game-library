import { callable } from "@decky/api";
import { ButtonItem, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import { useEffect, useState } from "react";

type ThemeResult = {
  ok:boolean;
  installed:boolean;
  message?:string;
  error?:string;
  theme_name?:string;
  themes_dir?:string;
};

const status = callable<[],ThemeResult>("system_theme_status");
const install = callable<[],ThemeResult>("install_system_theme");
const remove = callable<[],ThemeResult>("remove_system_theme");

/** CSS Loader owns the overlay and Steam Menu rendering contexts. This control
 * installs/uninstalls only our CSS Loader theme files; it does NOT claim
 * to switch CSS Loader's separate active-theme state.
 */
export function SystemThemePanel(){
  const [installed,setInstalled]=useState(false);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("Checking CSS Loader theme files…");
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    void status().then(result=>{
      if(!active)return;
      setInstalled(result.installed===true);
      setMessage(result.installed?"Theme files installed.":"Theme files not installed.");
      setError(result.ok? "":result.error??"Unable to check theme status");
    }).catch(e=>{
      if(active)setError("Unable to check theme status: "+String(e));
    }).finally(()=>{
      if(active)setLoading(false);
    });
    return ()=>{active=false;};
  },[]);

  const apply = (enabled:boolean) => {
    if(loading)return;
    setLoading(true);
    setError("");
    void (enabled ? install():remove()).then(result=>{
      if(!result.ok){
        setError(result.error || "Unable to change CSS Loader theme.");
        return;
      }
      setInstalled(result.installed);
      setMessage(result.message??"Theme status changed.");
    }).catch(e=>setError(String(e))).finally(()=>setLoading(false));
  };

  return <PanelSection title="Game Library · System Colors">
    <PanelSectionRow>
      <ToggleField
        label="Install Midnight system theme"
        description="Adds matching navy/cyan styling for Steam Menu, QAM, Settings, Downloads, buttons and dialogs. Requires CSS Loader."
        checked={installed}
        disabled={loading}
        onChange={apply}
      />
    </PanelSectionRow>
    <PanelSectionRow>
      <div style={{fontSize:12,lineHeight:1.55,opacity:.88}}>
        {message}
        <div style={{marginTop:5}}>
          {installed
            ? "To apply: CSS Loader → Refresh → enable Game Library Midnight. To revert: disable it there, then turn this switch off."
            : "Install the theme, then enable Game Library Midnight in CSS Loader. Existing themes remain unchanged."}
        </div>
      </div>
    </PanelSectionRow>
    {installed && <PanelSectionRow>
      <ButtonItem layout="below" disabled={loading} onClick={()=>apply(true)}>
        Reinstall / Update Midnight Theme
      </ButtonItem>
    </PanelSectionRow>}
    {error && <PanelSectionRow>
      <div style={{color:"#f2a9b0",fontSize:12,lineHeight:1.4}}>{error}</div>
    </PanelSectionRow>}
    <PanelSectionRow>
      <div style={{fontSize:11,opacity:.7,lineHeight:1.4}}>
        The CSS Loader plugin handles Steam's separate QAM/Menu windows.
        Game Library never edits other CSS Loader themes or changes their settings.
      </div>
    </PanelSectionRow>
  </PanelSection>;
}
