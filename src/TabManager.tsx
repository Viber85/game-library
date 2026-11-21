import {useEffect,useMemo,useRef,useState} from "react";
import {Focusable,GamepadButton,TextField,type GamepadEvent} from "@decky/ui";
import {MdAdd,MdArrowBack,MdArrowDownward,MdArrowUpward,MdCheckBox,
  MdCheckBoxOutlineBlank,MdDeleteOutline,MdEdit,MdVisibility,MdVisibilityOff,
  MdTune,MdSearch,MdDone,MdClose,MdListAlt} from "react-icons/md";
import type {LibraryGame} from "./steam";
import {posterCandidates} from "./steam";
import {normalizeSearchText} from "./librarySearch";
import type {LibraryTab,TabFilter,TabMode,SmartJoin,SmartRule} from "./libraryTabs";
import {SmartTabEditor} from "./SmartTabEditor";
import {OWN_FILTERS,changeLibraryTab,moveLibraryTab,newLibraryTab,
  normalizeLibraryTabs,assignManualGames,assignSmartExceptions,
  gamesForLibraryTab,smartRulesForTab} from "./libraryTabs";
import {saveOwnTabs} from "./autoTabSource";

type Props={
  tabs:LibraryTab[];
  games:LibraryGame[];
  firstRef:{current:HTMLDivElement|null};
  onFocusRail:()=>void;
  onClose:()=>void;
};
const stop=(e:GamepadEvent)=>{e.preventDefault();e.stopPropagation();};
const label=(tab:LibraryTab)=>tab.kind==="custom"?
  tab.mode==="manual"?"Manual · "+(tab.members?.length??0)+" games":
  "Smart · "+smartRulesForTab(tab).length+" rules · "+
    (tab.ruleJoin==="any"?"OR":"AND"):
  tab.kind==="all"?"All games":tab.kind;
export function TabManager({tabs,games,firstRef,onFocusRail,onClose}:Props){
  const [items,setItems]=useState(()=>normalizeLibraryTabs(tabs));
  const [selectedId,setSelectedId]=useState(tabs[0]?.id??"AllGames");
  const [draft,setDraft]=useState("");
  const [filter,setFilter]=useState<TabFilter>("all");
  const [createMode,setCreateMode]=useState<TabMode>("smart");
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [picker,setPicker]=useState(false);
  const [pickerTarget,setPickerTarget]=useState<"manual"|"include"|"exclude">("manual");
  const [smartEditor,setSmartEditor]=useState(false);
  const [pickerQuery,setPickerQuery]=useState("");
  const [pickerSelected,setPickerSelected]=useState<number[]>([]);
  const [pickerShowSelected,setPickerShowSelected]=useState(false);
  const [pickerLimit,setPickerLimit]=useState(80);
  const rowRefs=useRef<Array<HTMLDivElement|null>>([]);
  const editorRef=useRef<HTMLDivElement>(null);
  const editorRegionRef=useRef<HTMLDivElement>(null);
  const backRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLDivElement>(null);
  const pickerBackRef=useRef<HTMLDivElement>(null);
  const pickerSearchRef=useRef<HTMLDivElement>(null);
  const pickerRows=useRef<Array<HTMLDivElement|null>>([]);
  const selected=items.find(t=>t.id===selectedId)??items[0];

  useEffect(()=>{setItems(normalizeLibraryTabs(tabs));},[tabs]);
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>backRef.current?.focus());
    return ()=>{window.cancelAnimationFrame(frame);firstRef.current=null;};
  },[]);
  // The parent sidebar's Right/B action targets the currently visible page.
  useEffect(()=>{
    if(!smartEditor)firstRef.current=picker?pickerBackRef.current:backRef.current;
  },[picker,smartEditor]);

  const focusRow=(index:number)=>{
    const row=rowRefs.current[Math.max(0,Math.min(items.length-1,index))];
    row?.focus();row?.scrollIntoView({block:"nearest"});
  };
  const commit=async(next:LibraryTab[]):Promise<boolean>=>{
    if(busy)return false;
    if(next.filter(t=>t.visible).length===0){
      setError("At least one tab must remain visible");
      return false;
    }
    setBusy(true);setError("");
    try{
      await saveOwnTabs(next);
      setItems(normalizeLibraryTabs(next));
      return true;
    }catch(e){
      setError(e instanceof Error?e.message:"Unable to save tabs");
      return false;
    }finally{setBusy(false);}
  };
  const changeName=()=>{
    const title=draft.trim();
    if(!title||title.length>45){
      setError("Name must be between 1 and 45 characters");
      return;
    }
    if(editing&&selected){
      void commit(changeLibraryTab(items,selected.id,{title}));
      setEditing(false);setDraft("");
    }else{
      const id="custom-"+Date.now().toString(36)+Math.random().toString(36).slice(2,9);
      void commit(newLibraryTab(items,title,filter,id,createMode));
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
  /** Navigate the wrapping editor controls in two dimensions, using their
   * real layout coordinates rather than assuming one fixed-width button row. */
  const focusEditorDirection=(current:HTMLElement,direction:1|-1)=>{
    const candidates=[...editorRegionRef.current?.querySelectorAll<HTMLElement>(
      ".gl-tab-manager-action, input"
    )??[]].filter(el=>el.getClientRects().length>0&&
      !el.hasAttribute("disabled")&&
      el.getAttribute("aria-disabled")!=="true");
    const target=candidates.find(el=>el===current||el.contains(current))??current;
    const at=candidates.indexOf(target);
    const from=target.getBoundingClientRect();
    const centerX=(from.left+from.right)/2;
    const centerY=(from.top+from.bottom)/2;
    const other=candidates.filter(el=>el!==target).map(el=>{
      const rect=el.getBoundingClientRect();
      return {el,x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2};
    }).filter(item=>(item.y-centerY)*direction>8)
      .sort((a,b)=>{
        // Prefer the nearest row; within it prefer the closest column.
        const rowA=Math.abs(a.y-centerY),rowB=Math.abs(b.y-centerY);
        return Math.abs(rowA-rowB)>12?
          rowA-rowB:Math.abs(a.x-centerX)-Math.abs(b.x-centerX);
      });
    const next=other[0]?.el??candidates[at+direction];
    if(next){next.focus();next.scrollIntoView({block:"nearest"});}
    else if(direction<0){focusRow(items.findIndex(tab=>tab.id===selected?.id));}
  };
  const editorDpad=(e:GamepadEvent)=>{
    const b=e.detail?.button;
    if(b!==GamepadButton.DIR_UP&&b!==GamepadButton.DIR_DOWN)return;
    const current=e.currentTarget as HTMLElement;
    if(!current)return;
    stop(e);
    focusEditorDirection(current,b===GamepadButton.DIR_DOWN?1:-1);
  };
  const editorTextKeyDown=(event:React.KeyboardEvent<HTMLDivElement>)=>{
    // Steam sometimes forwards analogue/D-pad input to TextField as arrow keys.
    if(event.key!=="ArrowUp"&&event.key!=="ArrowDown")return;
    if(!(event.target instanceof HTMLInputElement))return;
    event.preventDefault();event.stopPropagation();
    focusEditorDirection(event.target,event.key==="ArrowDown"?1:-1);
  };
  const rowButton=(e:GamepadEvent,index:number)=>{
    const b=e.detail?.button;
    if(b===GamepadButton.DIR_UP){stop(e);index===0?backRef.current?.focus():focusRow(index-1);}
    else if(b===GamepadButton.DIR_DOWN){stop(e);focusRow(Math.min(items.length-1,index+1));}
    else if(b===GamepadButton.DIR_LEFT){stop(e);onFocusRail();}
    else if(b===GamepadButton.DIR_RIGHT){stop(e);editorRef.current?.focus();}
  };
  const openPicker=(target:"manual"|"include"|"exclude")=>{
    if(!selected||selected.kind!=="custom")return;
    if(target==="manual"&&selected.mode!=="manual")return;
    if(target!=="manual"&&selected.mode==="manual")return;
    setPickerTarget(target);
    setPickerQuery("");
    setPickerSelected(target==="manual"?selected.members??[]:
      target==="include"?selected.forceInclude??[]:selected.forceExclude??[]);
    setPickerShowSelected(false);setPickerLimit(80);setPicker(true);setError("");
    window.requestAnimationFrame(()=>pickerBackRef.current?.focus());
  };
  const leavePicker=()=>{
    setPicker(false);setPickerQuery("");setPickerShowSelected(false);
    window.requestAnimationFrame(()=>editorRef.current?.focus());
  };
  const applyPicker=async()=>{
    if(!selected||selected.kind!=="custom")return;
    const next=pickerTarget==="manual"?
      assignManualGames(items,selected.id,pickerSelected):
      assignSmartExceptions(items,selected.id,pickerTarget,pickerSelected);
    const saved=await commit(next);
    if(saved)leavePicker();
  };
  const openSmartEditor=()=>{
    if(!selected||selected.kind!=="custom"||selected.mode==="manual")return;
    setError("");setSmartEditor(true);
  };
  const closeSmartEditor=()=>{
    setSmartEditor(false);
    window.requestAnimationFrame(()=>editorRef.current?.focus());
  };
  const saveSmartRules=(rules:SmartRule[],ruleJoin:SmartJoin):Promise<boolean>=>{
    if(!selected||selected.kind!=="custom")return Promise.resolve(false);
    return commit(changeLibraryTab(items,selected.id,{rules,ruleJoin}));
  };
  const selectedSet=useMemo(()=>new Set(pickerSelected),[pickerSelected]);
  const results=useMemo(()=>{
    const q=normalizeSearchText(pickerQuery);
    return games.filter(game=>(!pickerShowSelected||selectedSet.has(game.id))&&
      (!q||normalizeSearchText(game.title).startsWith(q)))
      .sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:"base"}));
  },[games,pickerQuery,pickerShowSelected,selectedSet]);
  const shown=results.slice(0,pickerLimit);
  const toggleGame=(id:number)=>{
    setPickerSelected(previous=>previous.includes(id)?
      previous.filter(item=>item!==id):[...previous,id]);
  };
  const pickerDirection=(e:GamepadEvent,index:number)=>{
    const b=e.detail?.button;
    if(b===GamepadButton.DIR_UP){stop(e);
      index===0?pickerSearchRef.current?.querySelector("input")?.focus():
      pickerRows.current[index-1]?.focus();
    }else if(b===GamepadButton.DIR_DOWN){stop(e);
      pickerRows.current[Math.min(index+1,shown.length-1)]?.focus();
    }else if(b===GamepadButton.DIR_LEFT){stop(e);onFocusRail();}
  };

  return <div className="gl-tab-manager gl-tab-manager-page" aria-label="Manage Library tabs">
    <div className="gl-tab-manager-shell">
      {smartEditor&&selected?.kind==="custom"?
        <SmartTabEditor tab={selected} games={games} onSave={saveSmartRules}
          onClose={closeSmartEditor} onFocusRail={onFocusRail} firstRef={firstRef}/>:
      <>
      <header className="gl-tab-manager-header">
        <Focusable ref={el=>{backRef.current=el;if(!picker)firstRef.current=el;}}
          className="gl-tab-manager-action" focusClassName="gl-focused" noFocusRing
          onActivate={picker?leavePicker:onClose} onCancelButton={picker?leavePicker:onClose}
          onButtonDown={(e:GamepadEvent)=>{
            if(e.detail?.button===GamepadButton.DIR_LEFT){stop(e);onFocusRail();}
            else if(e.detail?.button===GamepadButton.DIR_DOWN){stop(e);
              picker?pickerBackRef.current?.focus():focusRow(0);}
          }}
          onOKActionDescription="Return to Plugin Settings"><MdArrowBack/> Back</Focusable>
        <div><h2>{picker?"Select Games":"Manage Tabs"}</h2>
          <p>Game Library · {picker?pickerTarget==="manual"?"Manual membership":
            pickerTarget==="include"?"Smart · Always include":"Smart · Always exclude":
            "Own tab engine"}</p></div>
      </header>
      {picker?
        <div className="gl-tab-game-picker">
          <div className="gl-tab-picker-toolbar">
            <Focusable ref={pickerBackRef} className="gl-tab-manager-action"
              focusClassName="gl-focused" noFocusRing onActivate={leavePicker}
              onCancelButton={leavePicker}><MdClose/> Cancel</Focusable>
            <Focusable className="gl-tab-manager-action gl-tab-manager-primary"
              focusClassName="gl-focused" noFocusRing onActivate={()=>void applyPicker()}
              onCancelButton={leavePicker}><MdDone/> Save selection · {pickerSelected.length}</Focusable>
            <span className="gl-tab-manager-note">{pickerTarget==="manual"?
              "Manual game membership":pickerTarget==="include"?
              "Games always included, regardless of rules":
              "Games always excluded, regardless of rules"}. Save to confirm.</span>
          </div>
          <div className="gl-tab-picker-search">
            <MdSearch/>
            <div ref={pickerSearchRef}>
              <TextField aria-label="Find games for manual tab" value={pickerQuery}
                placeholder="Search all games…" style={{width:"100%"}}
                onChange={e=>{setPickerQuery(e.target.value);setPickerLimit(80);}}/>
            </div>
            <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
              noFocusRing onActivate={()=>{setPickerShowSelected(v=>!v);setPickerLimit(80);}}
              onCancelButton={leavePicker}>
              {pickerShowSelected?"Show all":"Selected only"} ({pickerSelected.length})
            </Focusable>
          </div>
          <div className="gl-tab-picker-list">
            {shown.map((game,index)=>{
              const checked=selectedSet.has(game.id);
              const cover=posterCandidates(game)[0];
              return <Focusable key={game.id}
                ref={el=>{pickerRows.current[index]=el;}}
                className={"gl-tab-picker-game"+(checked?" gl-tab-picker-checked":"")}
                focusClassName="gl-focused" noFocusRing
                onActivate={()=>toggleGame(game.id)}
                onCancelButton={leavePicker}
                onButtonDown={(e:GamepadEvent)=>pickerDirection(e,index)}
                onOKActionDescription={(checked?"Remove ":"Add ")+game.title}>
                {cover?<img src={cover} alt="" loading="lazy"
                  onError={e=>{e.currentTarget.style.visibility="hidden";}}/>:
                  <span className="gl-tab-picker-no-cover"><MdListAlt/></span>}
                <div className="gl-tab-picker-game-text"><strong>{game.title}</strong>
                  <span>{game.nonSteam?"Non-Steam":"Steam"} · {game.installed?"Installed":"Not installed"}</span>
                </div>
                {checked?<MdCheckBox className="gl-tab-picker-check"/>:
                  <MdCheckBoxOutlineBlank className="gl-tab-picker-check"/>}
              </Focusable>;
            })}
            {!results.length&&<div className="gl-tab-picker-empty">
              {pickerShowSelected?"No selected games match this search":"No matching games"}
            </div>}
            {results.length>pickerLimit&&<Focusable
              className="gl-tab-manager-action gl-tab-picker-more"
              focusClassName="gl-focused" noFocusRing
              onActivate={()=>setPickerLimit(n=>n+80)}
              onCancelButton={leavePicker}>
              Show more games ({results.length-pickerLimit} remaining)
            </Focusable>}
          </div>
          <div className="gl-tab-picker-footer">
            {results.length} matches · {pickerSelected.length} selected · A Select · B Cancel
          </div>
        </div>
        :
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
              <span>{label(tab)}{!tab.visible?" · Hidden":""}</span>
            </Focusable>)}
          </div>
          <div className="gl-tab-manager-editor" ref={editorRegionRef}
            onKeyDownCapture={editorTextKeyDown}>
            <span className="gl-tab-manager-caption">SELECTED TAB</span>
            <h3>{selected?.title??"No tab selected"}</h3>
            <p>{selected?.kind==="custom"?(selected.mode==="manual"?"Manual Tab":"Smart Tab"):"Built-in tab"}
              {" · "+(selected?.visible?"Visible":"Hidden")}</p>
            <div className="gl-tab-manager-actions">
              <Focusable ref={editorRef} className="gl-tab-manager-action"
                focusClassName="gl-focused" noFocusRing
                onActivate={()=>selected&&void commit(moveLibraryTab(items,selected.id,-1))}
                onCancelButton={onClose} onButtonDown={editorDpad}><MdArrowUpward/> Move up</Focusable>
              <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
                noFocusRing onActivate={()=>selected&&void commit(moveLibraryTab(items,selected.id,1))}
                onCancelButton={onClose} onButtonDown={editorDpad}><MdArrowDownward/> Move down</Focusable>
              <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
                noFocusRing onActivate={()=>selected&&void commit(changeLibraryTab(items,selected.id,{visible:!selected.visible}))}
                onCancelButton={onClose} onButtonDown={editorDpad}>
                {selected?.visible?<MdVisibilityOff/>:<MdVisibility/>}
                {selected?.visible?"Hide":"Show"}
              </Focusable>
              <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
                noFocusRing onActivate={rename} onCancelButton={onClose} onButtonDown={editorDpad}>
                <MdEdit/> Rename
              </Focusable>
              {selected?.kind==="custom"&&<Focusable className="gl-tab-manager-action"
                focusClassName="gl-focused" noFocusRing
                onActivate={()=>void commit(changeLibraryTab(items,selected.id,{
                  mode:selected.mode==="manual"?"smart":"manual"
                }))} onCancelButton={onClose} onButtonDown={editorDpad}>
                <MdTune/> Switch to {selected.mode==="manual"?"Smart":"Manual"}
              </Focusable>}
              {selected?.kind==="custom"&&selected.mode==="manual"&&
                <Focusable className="gl-tab-manager-action gl-tab-manager-primary"
                  focusClassName="gl-focused" noFocusRing onActivate={()=>openPicker("manual")}
                  onCancelButton={onClose} onButtonDown={editorDpad}>
                  <MdListAlt/> Add / Remove Games ({selected.members?.length??0})
                </Focusable>}
              {selected?.kind==="custom"&&selected.mode!=="manual"&&<>
                <Focusable className="gl-tab-manager-action gl-tab-manager-primary"
                  focusClassName="gl-focused" noFocusRing onActivate={openSmartEditor}
                  onCancelButton={onClose} onButtonDown={editorDpad}>
                  <MdTune/> Edit Smart Rules ({smartRulesForTab(selected).length})
                </Focusable>
                <Focusable className="gl-tab-manager-action"
                  focusClassName="gl-focused" noFocusRing
                  onActivate={()=>openPicker("include")} onCancelButton={onClose} onButtonDown={editorDpad}>
                  <MdListAlt/> Always Include ({selected.forceInclude?.length??0})
                </Focusable>
                <Focusable className="gl-tab-manager-action"
                  focusClassName="gl-focused" noFocusRing
                  onActivate={()=>openPicker("exclude")} onCancelButton={onClose} onButtonDown={editorDpad}>
                  <MdListAlt/> Always Exclude ({selected.forceExclude?.length??0})
                </Focusable>
                <div className="gl-tab-manager-rule-preview">
                  {gamesForLibraryTab(selected,games).games.length} matching games ·
                  {smartRulesForTab(selected).length} rules ·
                  {selected.ruleJoin==="any"?" OR":" AND"}
                </div>
              </>}
              {selected?.kind==="custom"&&<Focusable className="gl-tab-manager-action gl-tab-manager-danger"
                focusClassName="gl-focused" noFocusRing onActivate={remove} onCancelButton={onClose} onButtonDown={editorDpad}>
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
                noFocusRing onActivate={()=>setCreateMode(v=>v==="manual"?"smart":"manual")}
                onCancelButton={onClose} onButtonDown={editorDpad}>
                <MdTune/> Type: {createMode==="manual"?"Manual":"Smart"}
              </Focusable>}
              {!editing&&createMode==="smart"&&
                <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
                  noFocusRing onActivate={cycleFilter} onCancelButton={onClose} onButtonDown={editorDpad}>
                  <MdTune/> Filter: {OWN_FILTERS.find(f=>f.id===filter)?.title}
                </Focusable>}
              <Focusable className="gl-tab-manager-action gl-tab-manager-primary"
                focusClassName="gl-focused" noFocusRing onActivate={changeName}
                onCancelButton={onClose} onButtonDown={editorDpad}><MdAdd/>{editing?"Save name":"Add tab"}</Focusable>
              {editing&&<Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
                noFocusRing onActivate={()=>{setEditing(false);setDraft("");}}
                onCancelButton={onClose} onButtonDown={editorDpad}>Cancel rename</Focusable>}
            </div>
            {busy&&<p className="gl-tab-manager-note">Saving tabs…</p>}
            {error&&<p className="gl-tab-manager-error" role="alert">{error}</p>}
            <p className="gl-tab-manager-note">Each Steam account has its own tabs.
              Manual tabs store exact game IDs without modifying Steam collections.</p>
          </div>
        </div>}
      </>}
    </div>
  </div>;
}
