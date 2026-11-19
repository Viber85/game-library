import {useEffect,useRef,useState} from "react";
import {Focusable,GamepadButton,type GamepadEvent,Navigation} from "@decky/ui";
import {MdCheckCircle,MdExpandLess,MdExpandMore,MdPalette,MdWallpaper,MdSystemUpdate} from "react-icons/md";
import {subscribeThemeStatus,themeRuntimeStatus,type ThemeStatus} from "./builtinThemeRuntime";
import {selectBuiltinTheme} from "./themeController";
import {SteamGridDBPanel} from "./SteamGridDBPanel";
import {UpdatesPanel} from "./UpdatesPanel";
import {SystemStatusBar} from "./SystemStatusBar";

type Section="theme"|"artwork"|"updates";
type Props={
  firstRef:{current:HTMLDivElement|null};
  onFocusRail:()=>void;
  onBack:()=>void;
};

/** Controller-first Game Mode appearance screen. Color Editor is postponed. */
export function AppearancePage({firstRef,onFocusRail,onBack}:Props){
  const [status,setStatus]=useState<ThemeStatus>(themeRuntimeStatus);
  const [expanded,setExpanded]=useState<Section|null>("theme");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const headers=useRef<Array<HTMLDivElement|null>>([]);
  const options=useRef<Array<HTMLDivElement|null>>([]);
  const searchRef=useRef<HTMLDivElement>(null);
  useEffect(()=>subscribeThemeStatus(setStatus),[]);
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>headers.current[0]?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[]);
  const choose=(mode:"midnight"|"off")=>{
    if(busy||status.selected===mode)return;
    setBusy(true);setError("");setNotice("");
    void selectBuiltinTheme(mode).then(()=>{
      setNotice(mode==="midnight"?"Midnight theme applied.":"Original SteamOS colors restored.");
    }).catch(e=>setError("Unable to change theme: "+String(e)))
      .finally(()=>setBusy(false));
  };
  const focusHeader=(index:number)=>headers.current[Math.max(0,Math.min(index,2))]?.focus();
  const headerDirection=(event:GamepadEvent,index:number,section:Section)=>{
    const button=event.detail?.button;
    if(button===GamepadButton.DIR_LEFT){
      event.preventDefault();event.stopPropagation();onFocusRail();
    }else if(button===GamepadButton.DIR_UP){
      event.preventDefault();event.stopPropagation();focusHeader(index-1);
    }else if(button===GamepadButton.DIR_DOWN){
      event.preventDefault();event.stopPropagation();
      if(expanded===section&&section==="theme")options.current[0]?.focus();
      else focusHeader(index+1);
    }else if(button===GamepadButton.DIR_RIGHT&&expanded!==section){
      event.preventDefault();event.stopPropagation();setExpanded(section);
    }
  };
  const cards:Array<{id:Section;title:string;description:string;icon:typeof MdPalette}>=[
    {id:"theme",title:"Theme",description:"Game Library and native SteamOS theme",icon:MdPalette},
    {id:"artwork",title:"Artwork",description:"SteamGridDB covers and hero images",icon:MdWallpaper},
    {id:"updates",title:"Updates",description:"Game Library releases and installation",icon:MdSystemUpdate},
  ];
  return <div className="gl-appearance" aria-label="Appearance settings">
    <header className="gl-header gl-library-topbar" aria-label="Appearance navigation">
      <div className="gl-topbar-titles"><span className="gl-topbar-current">Appearance</span></div>
      <SystemStatusBar searchRef={searchRef}
        onStatusButtonDown={(e:GamepadEvent)=>{
          if(e.detail?.button===GamepadButton.DIR_DOWN){
            e.preventDefault();e.stopPropagation();focusHeader(0);
          }
        }}/>
    </header>
    <div className="gl-appearance-scroll">
      <div className="gl-appearance-intro">
        <span className="gl-appearance-overline">GAME LIBRARY / CUSTOMIZATION</span>
        <h1>Appearance</h1>
        <p>Theme, artwork and updates in one place.</p>
      </div>
      <div className="gl-appearance-cards">
        {cards.map((section,index)=>{
          const opened=expanded===section.id;
          const Icon=section.icon;
          return <section className={"gl-appearance-card"+(opened?" gl-appearance-card-open":"")}
            key={section.id}>
            <Focusable
              ref={el=>{headers.current[index]=el;if(index===0)firstRef.current=el;}}
              className="gl-appearance-card-heading" focusClassName="gl-focused" noFocusRing
              onActivate={()=>setExpanded(previous=>previous===section.id?null:section.id)}
              onCancelButton={onBack}
              onButtonDown={(e:GamepadEvent)=>headerDirection(e,index,section.id)}
              onOKActionDescription={opened?"Collapse "+section.title:"Expand "+section.title}>
              <Icon className="gl-appearance-card-icon"/>
              <span className="gl-appearance-heading-copy"><strong>{section.title}</strong>
                <small>{section.description}</small></span>
              {opened?<MdExpandLess className="gl-appearance-chevron"/>:
                <MdExpandMore className="gl-appearance-chevron"/>}
            </Focusable>
            {opened&&<div className="gl-appearance-card-body">
              {section.id==="theme"&&<>
                <div className="gl-appearance-theme-options">
                  {(["midnight","off"] as const).map((mode,optionIndex)=>{
                    const selected=status.selected===mode;
                    const title=mode==="midnight"?"Midnight":"Steam Default";
                    return <Focusable key={mode}
                      ref={el=>{options.current[optionIndex]=el;}}
                      className={"gl-appearance-theme-option"+(selected?" gl-appearance-theme-selected":"")}
                      focusClassName="gl-focused" noFocusRing
                      onActivate={()=>choose(mode)}
                      onCancelButton={onBack}
                      onButtonDown={(e:GamepadEvent)=>{
                        const b=e.detail?.button;
                        if(b===GamepadButton.DIR_LEFT){
                          e.preventDefault();e.stopPropagation();onFocusRail();
                        }else if(b===GamepadButton.DIR_UP){
                          e.preventDefault();e.stopPropagation();
                          optionIndex===0?focusHeader(0):options.current[0]?.focus();
                        }else if(b===GamepadButton.DIR_DOWN){
                          e.preventDefault();e.stopPropagation();
                          optionIndex===0?options.current[1]?.focus():focusHeader(1);
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
                <p className="gl-appearance-note">{busy?"Applying theme…":
                  status.selected==="midnight"
                    ?"Midnight active · "+status.appliedTabs+" Steam UI windows verified"
                    :"Steam Default active"}</p>
                <p className="gl-appearance-note">Additional themes and Color Editor will be added later.</p>
                {notice&&<p className="gl-appearance-success" role="status">{notice}</p>}
                {error&&<p className="gl-appearance-error" role="alert">{error}</p>}
              </>}
              {section.id==="artwork"&&<SteamGridDBPanel/>}
              {section.id==="updates"&&<UpdatesPanel/>}
            </div>}
          </section>;
        })}
      </div>
    </div>
    <footer className="gl-footer"><span>GAME LIBRARY · Appearance</span>
      <span>A Select</span><span>B Home</span><span>← Navigation</span></footer>
  </div>;
}
