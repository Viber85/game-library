import {useEffect,useRef,useState} from "react";
import {callable} from "@decky/api";
import {Focusable,GamepadButton,Navigation,type GamepadEvent} from "@decky/ui";
import {MdArrowBack,MdCheckCircle,MdChevronRight,MdHome,
  MdPalette,MdStorage,MdSystemUpdate,MdToggleOff,MdToggleOn} from "react-icons/md";
import {SystemStatusBar} from "./SystemStatusBar";
import {subscribeThemeStatus,themeRuntimeStatus} from "./builtinThemeRuntime";
import {selectBuiltinTheme} from "./themeController";
import {notifyHomeSetting} from "./pluginSettingsEvents";

const getSettings=callable<[],{default_home:boolean}>("get_dashboard_settings");
const setSettings=callable<[boolean],boolean>("set_dashboard_settings");
type Props={
  firstRef:{current:HTMLDivElement|null};
  onFocusRail:()=>void;
  onBack:()=>void;
};
const stop=(e:GamepadEvent)=>{e.preventDefault();e.stopPropagation();};
export function PluginSettingsPage({firstRef,onFocusRail,onBack}:Props){
  const [home,setHome]=useState(true);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [theme,setTheme]=useState(themeRuntimeStatus);
  const statusRef=useRef<HTMLDivElement>(null);
  const actions=useRef<Array<HTMLDivElement|null>>([]);
  useEffect(()=>subscribeThemeStatus(setTheme),[]);
  useEffect(()=>{
    let active=true;
    void getSettings().then(value=>{
      if(active){setHome(value.default_home!==false);setLoaded(true);}
    }).catch(e=>{
      if(active){setError("Unable to load settings: "+String(e));setLoaded(false);}
    });
    const frame=window.requestAnimationFrame(()=>actions.current[0]?.focus());
    return ()=>{active=false;window.cancelAnimationFrame(frame);firstRef.current=null;};
  },[]);
  const focus=(index:number)=>{
    const target=actions.current[Math.max(0,Math.min(4,index))];
    target?.focus();target?.scrollIntoView({block:"nearest"});
  };
  const direction=(e:GamepadEvent,index:number)=>{
    const b=e.detail?.button;
    if(b===GamepadButton.DIR_LEFT){stop(e);onFocusRail();}
    else if(b===GamepadButton.DIR_UP){stop(e);index===0?statusRef.current?.focus():focus(index-1);}
    else if(b===GamepadButton.DIR_DOWN){stop(e);focus(index+1);}
  };
  const toggleHome=()=>{
    if(busy||!loaded)return;
    setBusy(true);setError("");
    const value=!home;
    void setSettings(value).then(result=>{
      if(!result)throw new Error("Settings could not be saved");
      setHome(value);notifyHomeSetting(value);
    }).catch(e=>setError("Unable to change startup option: "+String(e)))
      .finally(()=>setBusy(false));
  };
  const toggleTheme=()=>{
    if(busy)return;
    setBusy(true);setError("");
    void selectBuiltinTheme(theme.selected==="midnight"?"off":"midnight")
      .catch(e=>setError("Unable to switch theme: "+String(e)))
      .finally(()=>setBusy(false));
  };
  return <div className="gl-plugin-settings">
    <header className="gl-header gl-library-topbar">
      <div className="gl-topbar-titles"><span className="gl-topbar-current">Plugin Settings</span></div>
      <SystemStatusBar statusRef={statusRef} onStatusButtonDown={(e:GamepadEvent)=>{
        if(e.detail?.button===GamepadButton.DIR_DOWN){stop(e);focus(0);}
      }}/>
    </header>
    <section className="gl-plugin-settings-body">
      <div className="gl-settings-title">
        <Focusable className="gl-tab-manager-action" focusClassName="gl-focused" noFocusRing
          onActivate={onBack} onCancelButton={onBack}
          onButtonDown={(e:GamepadEvent)=>direction(e,0)}>
          <MdArrowBack/> Back
        </Focusable>
        <h2>Game Library Settings</h2>
        <p>Configure startup, system appearance and maintenance.</p>
      </div>
      <span className="gl-tab-manager-caption">GENERAL</span>
      <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
        ref={el=>{actions.current[0]=el;firstRef.current=el;}}
        onActivate={toggleHome} onCancelButton={onBack}
        onButtonDown={(e:GamepadEvent)=>direction(e,0)}>
        <MdHome/><div><strong>Use as Steam Home</strong>
          <span>Launch Game Library instead of native Steam Home</span></div>
        {home?<MdToggleOn className="gl-setting-toggle-on"/>:<MdToggleOff/>}
      </Focusable>
      <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
        ref={el=>{actions.current[1]=el;}}
        onActivate={toggleTheme} onCancelButton={onBack}
        onButtonDown={(e:GamepadEvent)=>direction(e,1)}>
        <MdPalette/><div><strong>Midnight system theme</strong>
          <span>{theme.selected==="midnight"?"Enabled for SteamOS":"Steam default colors"}</span></div>
        {theme.selected==="midnight"?<MdToggleOn className="gl-setting-toggle-on"/>:<MdToggleOff/>}
      </Focusable>
      <span className="gl-tab-manager-caption">TOOLS</span>
      <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
        ref={el=>{actions.current[2]=el;}}
        onActivate={()=>Navigation.Navigate("/game-library/appearance")} onCancelButton={onBack}
        onButtonDown={(e:GamepadEvent)=>direction(e,2)}>
        <MdPalette/><div><strong>Appearance & artwork</strong>
          <span>Theme, SteamGridDB and related settings</span></div><MdChevronRight/>
      </Focusable>
      <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
        ref={el=>{actions.current[3]=el;}}
        onActivate={()=>Navigation.Navigate("/game-library/appearance")} onCancelButton={onBack}
        onButtonDown={(e:GamepadEvent)=>direction(e,3)}>
        <MdSystemUpdate/><div><strong>Plugin updates</strong>
          <span>Check for a new Game Library version in Appearance</span></div><MdChevronRight/>
      </Focusable>
      <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
        ref={el=>{actions.current[4]=el;}}
        onActivate={()=>Navigation.Navigate("/game-library/library-diagnostics")} onCancelButton={onBack}
        onButtonDown={(e:GamepadEvent)=>direction(e,4)}>
        <MdStorage/><div><strong>Library diagnostics</strong>
          <span>Inspect Steam library sources and available collections</span></div><MdChevronRight/>
      </Focusable>
      {busy&&<p className="gl-tab-manager-note">Applying setting…</p>}
      {error&&<p role="alert" className="gl-tab-manager-error">{error}</p>}
      <p className="gl-tab-manager-note">QAM settings remain available as a backup.</p>
    </section>
  </div>;
}
