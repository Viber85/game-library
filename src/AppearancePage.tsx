import {useEffect,useRef,useState} from "react";
import {Focusable,GamepadButton,type GamepadEvent} from "@decky/ui";
import {MdCheckCircle,MdExpandLess,MdExpandMore,MdPalette,MdColorLens,MdViewCompact} from "react-icons/md";
import {subscribeThemeStatus,themeRuntimeStatus,type ThemeStatus} from "./builtinThemeRuntime";
import {selectBuiltinTheme,selectCompactDetails} from "./themeController";
import {SystemStatusBar} from "./SystemStatusBar";

type Props={
  firstRef:{current:HTMLDivElement|null};
  onFocusRail:()=>void;
  onBack:()=>void;
};

/** Theme Hub: only visual themes. Integrations and updates live in Plugin Settings. */
export function AppearancePage({firstRef,onFocusRail,onBack}:Props){
  const [status,setStatus]=useState<ThemeStatus>(themeRuntimeStatus);
  const [expanded,setExpanded]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const header=useRef<HTMLDivElement>(null);
  const options=useRef<Array<HTMLDivElement|null>>([]);
  const statusRef=useRef<HTMLDivElement>(null);
  useEffect(()=>subscribeThemeStatus(setStatus),[]);
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>header.current?.focus());
    return ()=>{window.cancelAnimationFrame(frame);firstRef.current=null;};
  },[]);
  const choose=(mode:"midnight"|"off")=>{
    if(busy||status.selected===mode)return;
    setBusy(true);setError("");setNotice("");
    void selectBuiltinTheme(mode).then(()=>{
      setNotice(mode==="midnight"?"Midnight theme applied.":"Original SteamOS colors restored.");
    }).catch(e=>setError("Unable to change theme: "+String(e)))
      .finally(()=>setBusy(false));
  };
  const toggleCompact=()=>{
    if(busy||status.selected!=="midnight")return;
    setBusy(true);setError("");setNotice("");
    const enabled=!status.compactDetails;
    void selectCompactDetails(enabled).then(()=>{
      setNotice(enabled?"Compact Game Details enabled. Open a Steam game's details to test.":
        "Original Steam details layout restored.");
    }).catch(e=>setError("Unable to change compact details: "+String(e)))
      .finally(()=>setBusy(false));
  };
  const onHeaderDirection=(e:GamepadEvent)=>{
    const b=e.detail?.button;
    if(b===GamepadButton.DIR_LEFT){
      e.preventDefault();e.stopPropagation();onFocusRail();
    }else if(b===GamepadButton.DIR_DOWN&&expanded){
      e.preventDefault();e.stopPropagation();options.current[0]?.focus();
    }else if(b===GamepadButton.DIR_RIGHT){
      e.preventDefault();e.stopPropagation();
      if(expanded)options.current[0]?.focus();
      else setExpanded(true);
    }else if(b===GamepadButton.DIR_UP){
      e.preventDefault();e.stopPropagation();statusRef.current?.focus();
    }
  };
  return <div className="gl-appearance" aria-label="Theme Hub">
    <header className="gl-header gl-library-topbar" aria-label="Appearance navigation">
      <div className="gl-topbar-titles"><span className="gl-topbar-current">Appearance</span></div>
      <SystemStatusBar statusRef={statusRef}
        onStatusButtonDown={(e:GamepadEvent)=>{
          if(e.detail?.button===GamepadButton.DIR_DOWN){
            e.preventDefault();e.stopPropagation();header.current?.focus();
          }
        }}/>
    </header>
    <div className="gl-appearance-scroll">
      <div className="gl-appearance-intro">
        <span className="gl-appearance-overline">GAME LIBRARY / CUSTOMIZATION</span>
        <h1>Theme Hub</h1>
        <p>System themes now. Custom color palettes in a future update.</p>
      </div>
      <div className="gl-appearance-cards">
        <section className={"gl-appearance-card"+(expanded?" gl-appearance-card-open":"")}>
          <Focusable
            ref={el=>{header.current=el;firstRef.current=el;}}
            className="gl-appearance-card-heading" focusClassName="gl-focused" noFocusRing
            onActivate={()=>setExpanded(previous=>!previous)}
            onCancelButton={onBack} onButtonDown={onHeaderDirection}
            onOKActionDescription={expanded?"Collapse Theme":"Expand Theme"}>
            <MdPalette className="gl-appearance-card-icon"/>
            <span className="gl-appearance-heading-copy"><strong>Theme</strong>
              <small>Choose Game Library and native SteamOS colors</small></span>
            {expanded?<MdExpandLess className="gl-appearance-chevron"/>:
              <MdExpandMore className="gl-appearance-chevron"/>}
          </Focusable>
          {expanded&&<div className="gl-appearance-card-body">
            <div className="gl-appearance-theme-options">
              {(["midnight","off"] as const).map((mode,optionIndex)=>{
                const selected=status.selected===mode;
                const title=mode==="midnight"?"Midnight":"Steam Default";
                return <Focusable key={mode}
                  ref={el=>{options.current[optionIndex]=el;}}
                  className={"gl-appearance-theme-option"+(selected?" gl-appearance-theme-selected":"")}
                  focusClassName="gl-focused" noFocusRing
                  onActivate={()=>choose(mode)} onCancelButton={onBack}
                  onButtonDown={(e:GamepadEvent)=>{
                    const b=e.detail?.button;
                    if(b===GamepadButton.DIR_LEFT){
                      e.preventDefault();e.stopPropagation();
                      optionIndex===0?onFocusRail():options.current[0]?.focus();
                    }else if(b===GamepadButton.DIR_RIGHT){
                      e.preventDefault();e.stopPropagation();
                      options.current[Math.min(optionIndex+1,1)]?.focus();
                    }else if(b===GamepadButton.DIR_UP){
                      e.preventDefault();e.stopPropagation();header.current?.focus();
                    }else if(b===GamepadButton.DIR_DOWN){
                      e.preventDefault();e.stopPropagation();
                      options.current[2]?.focus();
                    }
                  }}
                  onOKActionDescription={"Use "+title+" theme"}>
                  <span className={"gl-appearance-swatch"+(mode==="off"?" gl-appearance-swatch-steam":"")}/>
                  <span className="gl-appearance-choice-copy"><strong>{title}</strong>
                    <small>{mode==="midnight"?"Navy and cyan Game Mode theme":"Valve's original system colors"}</small></span>
                  {selected&&<MdCheckCircle className="gl-appearance-selected-check"/>}
                </Focusable>;
              })}
            </div>
            <Focusable
              ref={el=>{options.current[2]=el;}}
              className={"gl-appearance-theme-option gl-appearance-compact-option"+
                (status.compactDetails?" gl-appearance-theme-selected":"")}
              focusClassName="gl-focused" noFocusRing
              onActivate={toggleCompact} onCancelButton={onBack}
              onButtonDown={(e:GamepadEvent)=>{
                const b=e.detail?.button;
                if(b===GamepadButton.DIR_LEFT||b===GamepadButton.DIR_RIGHT){
                  e.preventDefault();e.stopPropagation();
                  options.current[b===GamepadButton.DIR_LEFT?0:1]?.focus();
                }else if(b===GamepadButton.DIR_UP){
                  e.preventDefault();e.stopPropagation();options.current[1]?.focus();
                }else if(b===GamepadButton.DIR_DOWN){
                  e.preventDefault();e.stopPropagation();options.current[2]?.focus();
                }
              }}
              onOKActionDescription="Toggle compact Steam game details">
              <MdViewCompact className="gl-appearance-card-icon"/>
              <span className="gl-appearance-choice-copy">
                <strong>Compact Game Details · Test</strong>
                <small>{status.selected!=="midnight"?"Enable Midnight first":
                  status.compactDetails?"Compact Steam game details active":
                  "Off by default · keeps Steam Install/Play and all tabs"}</small>
              </span>
              {status.compactDetails?<MdCheckCircle className="gl-appearance-selected-check"/>:
                <span className="gl-appearance-option-off">Off</span>}
            </Focusable>
            <p className="gl-appearance-note">{busy?"Applying theme…":
              status.selected==="midnight"
                ?"Midnight active · "+status.appliedTabs+" Steam UI windows verified"
                :"Steam Default active"}</p>
            {notice&&<p className="gl-appearance-success" role="status">{notice}</p>}
            {error&&<p className="gl-appearance-error" role="alert">{error}</p>}
          </div>}
        </section>
        <section className="gl-appearance-card gl-theme-hub-planned"
          aria-label="Color Editor planned">
          <div className="gl-appearance-card-heading">
            <MdColorLens className="gl-appearance-card-icon"/>
            <span className="gl-appearance-heading-copy"><strong>Color Editor</strong>
              <small>Custom color palettes · planned for a future version</small></span>
            <span className="gl-theme-hub-soon">Planned</span>
          </div>
        </section>
      </div>
    </div>
    <footer className="gl-footer"><span>GAME LIBRARY · Theme Hub</span>
      <span>A Select</span><span>B Home</span><span>← Navigation</span></footer>
  </div>;
}
