import {useEffect,useRef,useState} from "react";
import {callable} from "@decky/api";
import {Focusable,GamepadButton,Navigation,type GamepadEvent} from "@decky/ui";
import {MdArrowBack,MdChevronRight,MdHome,MdStorage,MdImage,MdSystemUpdate,
  MdToggleOff,MdToggleOn,MdViewList,MdStorefront} from "react-icons/md";
import {SystemStatusBar} from "./SystemStatusBar";
import {notifyHomeSetting} from "./pluginSettingsEvents";
import {SteamGridDBPanel} from "./SteamGridDBPanel";
import {UpdatesPanel} from "./UpdatesPanel";
import {GogIntegrationPanel} from "./GogIntegrationPanel";

const getSettings=callable<[],{default_home:boolean}>("get_dashboard_settings");
const setSettings=callable<[boolean],boolean>("set_dashboard_settings");
type SettingsTool="steamgriddb"|"updates"|"gog";
type Props={
  firstRef:{current:HTMLDivElement|null};
  onFocusRail:()=>void;
  onBack:()=>void;
};
const stop=(e:GamepadEvent)=>{e.preventDefault();e.stopPropagation();};
let restoreTabManagerFocus=false;

const GENERAL_ROWS=6;
const TOOL_INDEX:{[K in SettingsTool]:number}={gog:2,steamgriddb:3,updates:4};
/** General plugin settings, integrations and updates. Visual themes stay in Appearance. */
export function PluginSettingsPage({firstRef,onFocusRail,onBack}:Props){
  const [home,setHome]=useState(true);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [activeTool,setActiveTool]=useState<SettingsTool|null>(null);
  const [toolLastIndex,setToolLastIndex]=useState(2);
  const statusRef=useRef<HTMLDivElement>(null);
  const actions=useRef<Array<HTMLDivElement|null>>([]);
  const toolBackRef=useRef<HTMLDivElement>(null);
  const toolContentRef=useRef<HTMLDivElement>(null);
  const initialIndex=useRef(restoreTabManagerFocus?1:0);

  useEffect(()=>{
    restoreTabManagerFocus=false;
    let active=true;
    void getSettings().then(value=>{
      if(active){setHome(value.default_home!==false);setLoaded(true);}
    }).catch(e=>{
      if(active){setError("Unable to load settings: "+String(e));setLoaded(false);}
    });
    const frame=window.requestAnimationFrame(()=>actions.current[initialIndex.current]?.focus());
    return ()=>{active=false;window.cancelAnimationFrame(frame);firstRef.current=null;};
  },[]);
  useEffect(()=>{
    if(!activeTool)return;
    const frame=window.requestAnimationFrame(()=>toolBackRef.current?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[activeTool]);

  const focus=(index:number)=>{
    const target=actions.current[Math.max(0,Math.min(GENERAL_ROWS-1,index))];
    target?.focus();target?.scrollIntoView({block:"nearest"});
  };
  const direction=(e:GamepadEvent,index:number)=>{
    const b=e.detail?.button;
    if(b===GamepadButton.DIR_LEFT){stop(e);onFocusRail();}
    else if(b===GamepadButton.DIR_UP){stop(e);index===0?statusRef.current?.focus():focus(index-1);}
    else if(b===GamepadButton.DIR_DOWN){stop(e);focus(index+1);}
    else if(b===GamepadButton.DIR_RIGHT&&index>0){
      stop(e);
      if(index===1)openTabs();
      else if(index===2)openTool("gog");
      else if(index===3)openTool("steamgriddb");
      else if(index===4)openTool("updates");
      else Navigation.Navigate("/game-library/library-diagnostics");
    }
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
  const openTool=(tool:SettingsTool)=>{
    setToolLastIndex(TOOL_INDEX[tool]);
    setActiveTool(tool);
  };
  const closeTool=()=>{
    setActiveTool(null);
    const frame=window.requestAnimationFrame(()=>focus(toolLastIndex));
    // The page remains mounted; React handles focus on the next animation frame.
    void frame;
  };
  return <div className="gl-plugin-settings">
    <header className="gl-header gl-library-topbar">
      <div className="gl-topbar-titles"><span className="gl-topbar-current">
        {activeTool==="updates"?"Plugin Updates":
          activeTool==="steamgriddb"?"SteamGridDB Integration":
          activeTool==="gog"?"GOG Integration":"Plugin Settings"}
      </span></div>
      <SystemStatusBar statusRef={statusRef} onStatusButtonDown={(e:GamepadEvent)=>{
        if(e.detail?.button===GamepadButton.DIR_DOWN){
          stop(e);
          activeTool?toolBackRef.current?.focus():focus(0);
        }
      }}/>
    </header>
    {activeTool?
      <section className="gl-plugin-settings-body gl-plugin-settings-tool" aria-label={
        activeTool==="updates"?"Plugin Updates":
          activeTool==="gog"?"GOG Integration":"SteamGridDB Integration"}>
        <div className="gl-settings-title">
          <Focusable ref={el=>{toolBackRef.current=el;firstRef.current=el;}}
            className="gl-tab-manager-action" focusClassName="gl-focused" noFocusRing
            onActivate={closeTool} onCancelButton={closeTool}
            onButtonDown={(e:GamepadEvent)=>{
              if(e.detail?.button===GamepadButton.DIR_LEFT){stop(e);onFocusRail();}
              else if(e.detail?.button===GamepadButton.DIR_UP){
                stop(e);statusRef.current?.focus();
              }
              else if(e.detail?.button===GamepadButton.DIR_DOWN||
                e.detail?.button===GamepadButton.DIR_RIGHT){
                const target=toolContentRef.current?.querySelector<HTMLElement>(
                  "button, input, [tabindex='0']");
                if(target){stop(e);target.focus();}
              }
            }}>
            <MdArrowBack/> Back to Settings
          </Focusable>
          <h2>{activeTool==="updates"?"Plugin Updates":
            activeTool==="gog"?"GOG Integration":"SteamGridDB Integration"}</h2>
          <p>{activeTool==="updates"?
            "Check for Game Library releases and install verified updates.":
            activeTool==="gog"?"Connect your GOG account and sync your purchased games.":
            "Configure missing cover and hero artwork with your personal API key."}</p>
        </div>
        <Focusable className="gl-plugin-settings-tool-content" ref={toolContentRef}
          flow-children="column" onCancelButton={closeTool}
          onButtonDown={(e:GamepadEvent)=>{
            if(e.detail?.button===GamepadButton.DIR_LEFT &&
              !(e.target instanceof HTMLInputElement)){
              stop(e);toolBackRef.current?.focus();
            }
          }}>
          {activeTool==="updates"?<UpdatesPanel/>:
            activeTool==="gog"?<GogIntegrationPanel/>:<SteamGridDBPanel/>}
        </Focusable>
      </section>
      :
      <section className="gl-plugin-settings-body">
        <div className="gl-settings-title">
          <Focusable className="gl-tab-manager-action" focusClassName="gl-focused" noFocusRing
            onActivate={onBack} onCancelButton={onBack}
            onButtonDown={(e:GamepadEvent)=>direction(e,0)}>
            <MdArrowBack/> Back
          </Focusable>
          <h2>Game Library Settings</h2>
          <p>Plugin configuration, tab management and integrations.</p>
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
        <span className="gl-tab-manager-caption">INTEGRATIONS</span>
        <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
          ref={el=>{actions.current[2]=el;}}
          onActivate={()=>openTool("gog")} onCancelButton={onBack}
          onButtonDown={(e:GamepadEvent)=>direction(e,2)}>
          <MdStorefront/><div><strong>GOG Integration</strong>
            <span>Connect GOG and synchronize purchased games</span></div>
          <MdChevronRight/>
        </Focusable>
        <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
          ref={el=>{actions.current[3]=el;}}
          onActivate={()=>openTool("steamgriddb")} onCancelButton={onBack}
          onButtonDown={(e:GamepadEvent)=>direction(e,3)}>
          <MdImage/><div><strong>SteamGridDB Integration</strong>
            <span>Missing Steam covers, hero artwork and API key</span></div>
          <MdChevronRight/>
        </Focusable>
        <span className="gl-tab-manager-caption">MAINTENANCE</span>
        <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
          ref={el=>{actions.current[4]=el;}}
          onActivate={()=>openTool("updates")} onCancelButton={onBack}
          onButtonDown={(e:GamepadEvent)=>direction(e,4)}>
          <MdSystemUpdate/><div><strong>Updates</strong>
            <span>Check for and install verified Game Library releases</span></div>
          <MdChevronRight/>
        </Focusable>
        <Focusable className="gl-plugin-setting-row" focusClassName="gl-focused" noFocusRing
          ref={el=>{actions.current[5]=el;}}
          onActivate={()=>Navigation.Navigate("/game-library/library-diagnostics")} onCancelButton={onBack}
          onButtonDown={(e:GamepadEvent)=>direction(e,5)}>
          <MdStorage/><div><strong>Library diagnostics</strong>
            <span>Inspect Steam library sources and available collections</span></div>
          <MdChevronRight/>
        </Focusable>
        {busy&&<p className="gl-tab-manager-note">Applying setting…</p>}
        {error&&<p role="alert" className="gl-tab-manager-error">{error}</p>}
        <p className="gl-tab-manager-note">
          Theme selection is available in Appearance on the left navigation.
          QAM settings remain available as a backup.
        </p>
      </section>}
  </div>;
}
