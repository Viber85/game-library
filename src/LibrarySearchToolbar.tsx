import {useEffect,useRef, type RefObject} from "react";
import {Focusable,GamepadButton,TextField,type GamepadEvent} from "@decky/ui";
import {MdClose,MdSearch} from "react-icons/md";
import type {SearchSource,SearchInstall} from "./librarySearch";

type Props={
  query:string;
  source:SearchSource;
  installed:SearchInstall;
  onQuery:(value:string)=>void;
  onSource:(value:SearchSource)=>void;
  onInstalled:(value:SearchInstall)=>void;
  onFocusRail:()=>void;
  onFocusResults:()=>void;
  onBack:()=>void;
  inputRef:RefObject<HTMLDivElement|null>;
  firstFilterRef:RefObject<HTMLDivElement|null>;
  autoFocus:boolean;
};

const SOURCES:Array<{id:SearchSource;label:string}>=[
  {id:"all",label:"All"},
  {id:"steam",label:"Steam"},
  {id:"epic",label:"Epic"},
  {id:"gog",label:"GOG"},
  {id:"other",label:"Other"},
];
const INSTALLED:Array<{id:SearchInstall;label:string}>=[
  {id:"all",label:"Any"},
  {id:"installed",label:"Installed"},
  {id:"not-installed",label:"Not installed"},
];

export function LibrarySearchToolbar({query,source,installed,onQuery,onSource,
  onInstalled,onFocusRail,onFocusResults,onBack,inputRef,firstFilterRef,autoFocus}:Props){
  const sources=useRef<Array<HTMLDivElement|null>>([]);
  const availability=useRef<Array<HTMLDivElement|null>>([]);
  const focusInput=()=>inputRef.current?.querySelector("input")?.focus();
  useEffect(()=>{
    if(!autoFocus)return;
    const frame=window.requestAnimationFrame(()=>focusInput());
    return ()=>window.cancelAnimationFrame(frame);
  },[]);
  const handleSource=(event:GamepadEvent,index:number)=>{
    const key=event.detail?.button;
    const stop=()=>{event.preventDefault();event.stopPropagation();};
    if(key===GamepadButton.DIR_LEFT){stop();index===0?onFocusRail():sources.current[index-1]?.focus();}
    else if(key===GamepadButton.DIR_RIGHT){stop();sources.current[Math.min(index+1,SOURCES.length-1)]?.focus();}
    else if(key===GamepadButton.DIR_UP){stop();focusInput();}
    else if(key===GamepadButton.DIR_DOWN){stop();availability.current[Math.min(index,INSTALLED.length-1)]?.focus();}
  };
  const handleInstalled=(event:GamepadEvent,index:number)=>{
    const key=event.detail?.button;
    const stop=()=>{event.preventDefault();event.stopPropagation();};
    if(key===GamepadButton.DIR_LEFT){stop();index===0?onFocusRail():availability.current[index-1]?.focus();}
    else if(key===GamepadButton.DIR_RIGHT){stop();availability.current[Math.min(index+1,INSTALLED.length-1)]?.focus();}
    else if(key===GamepadButton.DIR_UP){stop();sources.current[Math.min(index,SOURCES.length-1)]?.focus();}
    else if(key===GamepadButton.DIR_DOWN){stop();onFocusResults();}
  };
  return <div className="gl-library-search-controls" aria-label="Search filters">
    <div className="gl-library-search-field-row">
      <div ref={inputRef} className="gl-library-search-field">
        <MdSearch aria-hidden="true"/>
        <div className="gl-library-search-native">
          <TextField aria-label="Search game titles"
            style={{width:"100%",minWidth:0}} value={query}
            placeholder="Search Steam, Epic, GOG..."
            onChange={event=>onQuery(event.target.value)} />
        </div>
      </div>
      {query&&<Focusable className="gl-library-search-clear" focusClassName="gl-focused"
        noFocusRing onActivate={()=>{onQuery("");focusInput();}} onCancelButton={onBack}
        onOKActionDescription="Clear search"><MdClose/> Clear</Focusable>}
    </div>
    <div className="gl-library-search-filter-row">
      <strong>Source</strong>
      <Focusable className="gl-library-search-chips" flow-children="row">
        {SOURCES.map((option,index)=><Focusable key={option.id}
          ref={el=>{sources.current[index]=el;if(index===0)firstFilterRef.current=el;}}
          className={"gl-library-search-chip"+(source===option.id?" gl-search-active":"")}
          focusClassName="gl-focused" noFocusRing onActivate={()=>onSource(option.id)}
          onCancelButton={onBack} onButtonDown={(e:GamepadEvent)=>handleSource(e,index)}
          onOKActionDescription={"Filter "+option.label}>{option.label}</Focusable>)}
      </Focusable>
    </div>
    <div className="gl-library-search-filter-row">
      <strong>Availability</strong>
      <Focusable className="gl-library-search-chips" flow-children="row">
        {INSTALLED.map((option,index)=><Focusable key={option.id}
          ref={el=>{availability.current[index]=el;}}
          className={"gl-library-search-chip"+(installed===option.id?" gl-search-active":"")}
          focusClassName="gl-focused" noFocusRing onActivate={()=>onInstalled(option.id)}
          onCancelButton={onBack} onButtonDown={(e:GamepadEvent)=>handleInstalled(e,index)}
          onOKActionDescription={"Filter "+option.label}>{option.label}</Focusable>)}
      </Focusable>
    </div>
  </div>;
}
