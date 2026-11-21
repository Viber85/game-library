import {useEffect,useRef,useState} from "react";
import {callable} from "@decky/api";
import {Focusable,GamepadButton,Navigation,type GamepadEvent} from "@decky/ui";
import {MdArrowBack,MdChevronRight,MdHome,MdStorage,
  MdToggleOff,MdToggleOn,MdViewList} from "react-icons/md";
import {SystemStatusBar} from "./SystemStatusBar";
import {notifyHomeSetting} from "./pluginSettingsEvents";

const getSettings=callable<[],{default_home:boolean}>("get_dashboard_settings");
const setSettings=callable<[boolean],boolean>("set_dashboard_settings");
type Props={
  firstRef:{current:HTMLDivElement|null};
  onFocusRail:()=>void;
  onBack:()=>void;
};
const stop=(e:GamepadEvent)=>{e.preventDefault();e.stopPropagation();};
let restoreTabManagerFocus=false;

/** General plugin settings; Appearance remains a dedicated left-rail page. */
export function PluginSettingsPage({firstRef,onFocusRail,onBack}:Props){
  const [home,setHome]=useState(true);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const statusRef=useRef<HTMLDivElement>(null);
  const actions=useRef<Array<HTMLDivElement|null>>([]);

  useEffect(()=>{
    let active=true;
    void getSettings().then(value=>{
      if(active){setHome(value.default_home!==false);setLoaded(true);}
    }).catch(e=>{
      if(active){setError("Unable to load settings: "+String(e));setLoaded(false);}
    });
    const initialIndex=restoreTabManagerFocus?1:0;
    restoreTabManagerFocus=false;
    const frame=window.requestAnimationFrame(()=>actions.current[initialIndex]?.focus());
    return ()=>{active=false;window.cancelAnimationFrame(frame);firstRef.current=null;};
  },[]);
  const focus=(index:number)=>{
    const target=actions.current[Math.max(0,Math.min(2,index))];
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
  const openTabs=()=>{
    restoreTabManagerFocus=true;
    Navigation.Navigate("/game-library/tabs");
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
        <p>Plugin configuration and library management.</p>
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
      <span className="gl-tab-manager-caption">LIBRARY</span>
      <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
        ref={el=>{actions.current[1]=el;}}
        onActivate={openTabs} onCancelButton={onBack}
        onButtonDown={(e:GamepadEvent)=>direction(e,1)}>
        <MdViewList/><div><strong>Tab Manager</strong>
          <span>Create and manage Smart and Manual tabs, rules and game selections</span></div>
        <MdChevronRight/>
      </Focusable>
      <span className="gl-tab-manager-caption">TOOLS</span>
      <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
        ref={el=>{actions.current[2]=el;}}
        onActivate={()=>Navigation.Navigate("/game-library/library-diagnostics")} onCancelButton={onBack}
        onButtonDown={(e:GamepadEvent)=>direction(e,2)}>
        <MdStorage/><div><strong>Library diagnostics</strong>
          <span>Inspect Steam library sources and available collections</span></div>
        <MdChevronRight/>
      </Focusable>
      {busy&&<p className="gl-tab-manager-note">Applying setting…</p>}
      {error&&<p role="alert" className="gl-tab-manager-error">{error}</p>}
      <p className="gl-tab-manager-note">
        Theme, artwork and updates are available in Appearance on the left navigation.
        QAM settings remain available as a backup.
      </p>
    </section>
  </div>;
}
