import {useEffect,useRef,useState} from "react";
import {Focusable,GamepadButton,TextField,type GamepadEvent} from "@decky/ui";
import {MdAdd,MdArrowBack,MdArrowDownward,MdArrowUpward,MdDeleteOutline,
  MdEdit,MdVisibility,MdVisibilityOff,MdTune} from "react-icons/md";
import type {LibraryTab,TabFilter} from "./libraryTabs";
import {OWN_FILTERS,changeLibraryTab,moveLibraryTab,newLibraryTab,
  normalizeLibraryTabs} from "./libraryTabs";
import {saveOwnTabs} from "./autoTabSource";

type Props={tabs:LibraryTab[];onClose:()=>void};
const stop=(e:GamepadEvent)=>{e.preventDefault();e.stopPropagation();};
export function TabManager({tabs,onClose}:Props){
  const [items,setItems]=useState(()=>normalizeLibraryTabs(tabs));
  const [selectedId,setSelectedId]=useState(tabs[0]?.id??"AllGames");
  const [draft,setDraft]=useState("");
  const [filter,setFilter]=useState<TabFilter>("all");
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const rowRefs=useRef<Array<HTMLDivElement|null>>([]);
  const backRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLDivElement>(null);
  const selected=items.find(t=>t.id===selectedId)??items[0];
  const selectedIndex=items.findIndex(t=>t.id===selected?.id);
  useEffect(()=>{setItems(normalizeLibraryTabs(tabs));},[tabs]);
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>backRef.current?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[]);
  const focusRow=(index:number)=>{
    const row=rowRefs.current[Math.max(0,Math.min(items.length-1,index))];
    row?.focus();row?.scrollIntoView({block:"nearest"});
  };
  const commit=async(next:LibraryTab[])=>{
    if(busy)return;
    if(next.filter(t=>t.visible).length===0){setError("At least one tab must remain visible");return;}
    setBusy(true);setError("");
    try {
      await saveOwnTabs(next);
      setItems(normalizeLibraryTabs(next));
    } catch(error){
      setError(error instanceof Error?error.message:"Unable to save tabs");
    } finally {setBusy(false);}
  };
  const changeName=()=>{
    const title=draft.trim();
    if(!title||title.length>45){setError("Name must be between 1 and 45 characters");return;}
    if(editing&&selected){
      void commit(changeLibraryTab(items,selected.id,{title}));
      setEditing(false);setDraft("");
    }else{
      const id="custom-"+Date.now().toString(36)+Math.random().toString(36).slice(2,9);
      void commit(newLibraryTab(items,title,filter,id));
      setSelectedId(id);setDraft("");
    }
  };
  const cycleFilter=()=>{
    const current=OWN_FILTERS.findIndex(f=>f.id===filter);
    setFilter(OWN_FILTERS[(current+1)%OWN_FILTERS.length].id);
  };
  const rename=()=>{
    if(!selected)return;
    setDraft(selected.title);setEditing(true);setError("");
    window.requestAnimationFrame(()=>inputRef.current?.querySelector("input")?.focus());
  };
  const remove=()=>{
    if(!selected||selected.kind!=="custom")return;
    setSelectedId(items.find(t=>t.id!==selected.id)?.id??"AllGames");
    void commit(items.filter(t=>t.id!==selected.id).map((t,i)=>({...t,position:i})));
  };
  const rowButton=(e:GamepadEvent,index:number)=>{
    const b=e.detail?.button;
    if(b===GamepadButton.DIR_UP){stop(e);index===0?backRef.current?.focus():focusRow(index-1);}
    else if(b===GamepadButton.DIR_DOWN){stop(e);focusRow(Math.min(items.length-1,index+1));}
  };
  return <div className="gl-tab-manager" role="dialog" aria-label="Manage Library tabs">
    <div className="gl-tab-manager-shell">
      <header className="gl-tab-manager-header">
        <Focusable ref={backRef} className="gl-tab-manager-action"
          focusClassName="gl-focused" noFocusRing
          onActivate={onClose} onCancelButton={onClose}
          onOKActionDescription="Return to Library"><MdArrowBack/> Back</Focusable>
        <div><h2>Manage Tabs</h2><p>Game Library · Own tab engine</p></div>
      </header>
      <div className="gl-tab-manager-layout">
        <div className="gl-tab-manager-list">
          <span className="gl-tab-manager-caption">TABS · {items.length}</span>
          {items.map((tab,index)=><Focusable
            key={tab.id} ref={el=>{rowRefs.current[index]=el;}}
            className={"gl-tab-manager-row"+(tab.id===selected?.id?" gl-tab-manager-selected":"")}
            focusClassName="gl-focused" noFocusRing
            onActivate={()=>{setSelectedId(tab.id);setEditing(false);setDraft("");}}
            onCancelButton={onClose}
            onButtonDown={(e:GamepadEvent)=>rowButton(e,index)}
            onOKActionDescription={"Edit "+tab.title}>
            <strong>{tab.title}</strong>
            <span>{tab.kind==="custom"?
              OWN_FILTERS.find(f=>f.id===tab.filter)?.title:tab.kind}
              {!tab.visible?" · Hidden":""}</span>
          </Focusable>)}
        </div>
        <div className="gl-tab-manager-editor">
          <span className="gl-tab-manager-caption">SELECTED TAB</span>
          <h3>{selected?.title??"No tab selected"}</h3>
          <p>{selected?.kind==="custom"?"Custom filter":"Built-in tab"}
            {" · "+(selected?.visible?"Visible":"Hidden")}</p>
          <div className="gl-tab-manager-actions">
            <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
              noFocusRing onActivate={()=>selected&&void commit(moveLibraryTab(items,selected.id,-1))}
              onCancelButton={onClose}><MdArrowUpward/> Move up</Focusable>
            <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
              noFocusRing onActivate={()=>selected&&void commit(moveLibraryTab(items,selected.id,1))}
              onCancelButton={onClose}><MdArrowDownward/> Move down</Focusable>
            <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
              noFocusRing onActivate={()=>selected&&void commit(changeLibraryTab(items,selected.id,{visible:!selected.visible}))}
              onCancelButton={onClose}>
              {selected?.visible?<MdVisibilityOff/>:<MdVisibility/>}
              {selected?.visible?"Hide":"Show"}
            </Focusable>
            <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
              noFocusRing onActivate={rename} onCancelButton={onClose}>
              <MdEdit/> Rename
            </Focusable>
            {selected?.kind==="custom"&&<Focusable className="gl-tab-manager-action"
              focusClassName="gl-focused" noFocusRing
              onActivate={()=>void commit(changeLibraryTab(items,selected.id,{
                filter:OWN_FILTERS[(OWN_FILTERS.findIndex(f=>f.id===selected.filter)+1)%OWN_FILTERS.length].id
              }))} onCancelButton={onClose}>
              <MdTune/> Filter: {OWN_FILTERS.find(f=>f.id===selected.filter)?.title}
            </Focusable>}
            {selected?.kind==="custom"&&<Focusable className="gl-tab-manager-action gl-tab-manager-danger"
              focusClassName="gl-focused" noFocusRing onActivate={remove} onCancelButton={onClose}>
              <MdDeleteOutline/> Delete
            </Focusable>}
          </div>
          <div className="gl-tab-manager-create">
            <span className="gl-tab-manager-caption">{editing?"RENAME TAB":"CREATE CUSTOM TAB"}</span>
            <div ref={inputRef}>
              <TextField aria-label="Tab name" value={draft} placeholder="Tab name"
                style={{width:"100%"}} onChange={e=>setDraft(e.target.value)}/>
            </div>
            {!editing&&<Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
              noFocusRing onActivate={cycleFilter} onCancelButton={onClose}>
              <MdTune/> Filter: {OWN_FILTERS.find(f=>f.id===filter)?.title}
            </Focusable>}
            <Focusable className="gl-tab-manager-action gl-tab-manager-primary"
              focusClassName="gl-focused" noFocusRing onActivate={changeName}
              onCancelButton={onClose}><MdAdd/>{editing?"Save name":"Add tab"}</Focusable>
            {editing&&<Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
              noFocusRing onActivate={()=>{setEditing(false);setDraft("");}}
              onCancelButton={onClose}>Cancel rename</Focusable>}
          </div>
          {busy&&<p className="gl-tab-manager-note">Saving tabs…</p>}
          {error&&<p className="gl-tab-manager-error" role="alert">{error}</p>}
          <p className="gl-tab-manager-note">Settings are stored per Steam account.
            L1/R1 follows the visible tab order. Epic/GOG account linking comes later.</p>
        </div>
      </div>
    </div>
  </div>;
}
