import {useEffect,useMemo,useRef,useState} from "react";
import {Focusable,GamepadButton,type GamepadEvent} from "@decky/ui";
import {MdAdd,MdArrowBack,MdCheck,MdClose,MdDeleteOutline,
  MdFilterAlt,MdSettingsSuggest} from "react-icons/md";
import type {LibraryGame} from "./steam";
import type {LibraryTab,SmartJoin,SmartRule,SmartRuleType} from "./libraryTabs";
import {SMART_RULES,gamesForLibraryTab,smartRulesForTab} from "./libraryTabs";
import {focusSpatially,type FocusDirection} from "./spatialFocus";

type Props={
  tab:LibraryTab;
  games:readonly LibraryGame[];
  onClose:()=>void;
  onSave:(rules:SmartRule[],join:SmartJoin)=>Promise<boolean>;
  onFocusRail:()=>void;
  firstRef:{current:HTMLDivElement|null};
};
const stop=(e:GamepadEvent)=>{e.preventDefault();e.stopPropagation();};
const label=(rule:SmartRuleType)=>SMART_RULES.find(x=>x.id===rule)?.title??rule;
export function SmartTabEditor({tab,games,onClose,onSave,onFocusRail,firstRef}:Props){
  const [rules,setRules]=useState<SmartRule[]>(()=>smartRulesForTab(tab));
  const [join,setJoin]=useState<SmartJoin>(tab.ruleJoin==="any"?"any":"all");
  const [busy,setBusy]=useState(false);
  const [choosingIndex,setChoosingIndex]=useState<number|null>(null);
  const [error,setError]=useState("");
  const backRef=useRef<HTMLDivElement>(null);
  const editorRoot=useRef<HTMLDivElement>(null);
  const rowRefs=useRef<Array<HTMLDivElement|null>>([]);
  const optionRefs=useRef<Array<HTMLDivElement|null>>([]);
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>backRef.current?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[]);
  useEffect(()=>{
    if(choosingIndex===null)return;
    const frame=window.requestAnimationFrame(()=>optionRefs.current[0]?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[choosingIndex]);
  // Explicit focus graph for buttons, AND/OR choices, condition selectors,
  // and the 2-column condition list. Only move to the rail at the left edge.
  const directional=(e:GamepadEvent)=>{
    const b=e.detail?.button;
    const direction:FocusDirection|undefined=
      b===GamepadButton.DIR_LEFT?"left":
      b===GamepadButton.DIR_RIGHT?"right":
      b===GamepadButton.DIR_UP?"up":
      b===GamepadButton.DIR_DOWN?"down":undefined;
    if(!direction)return;
    stop(e);
    const moved=focusSpatially(editorRoot.current,e.currentTarget as HTMLElement,
      direction,".gl-tab-manager-action,.gl-tab-smart-choice,.gl-tab-smart-rule-picker,.gl-tab-smart-option");
    if(!moved&&direction==="left")onFocusRail();
    else if(!moved&&direction==="up")backRef.current?.focus();
  };
  const available=SMART_RULES.filter(x=>!rules.some(rule=>rule.type===x.id));
  const count=useMemo(()=>gamesForLibraryTab({...tab,mode:"smart",rules,ruleJoin:join},games).games.length,
    [games,tab,rules,join]);
  const availableAt=(index:number)=>SMART_RULES.filter(x=>
    !rules.some((rule,i)=>i!==index&&rule.type===x.id));
  const select=(index:number,type:SmartRuleType)=>{
    setRules(prev=>prev.map((rule,i)=>i===index?{type}:rule));
    setChoosingIndex(null);
    window.requestAnimationFrame(()=>rowRefs.current[index]?.focus());
  };
  const closeChoices=(index:number)=>{
    setChoosingIndex(null);
    window.requestAnimationFrame(()=>rowRefs.current[index]?.focus());
  };
  const add=()=>{
    if(available.length>=1)setRules(prev=>[...prev,{type:available[0].id}]);
  };
  const save=async()=>{
    if(busy)return;
    setBusy(true);setError("");
    try{
      if(await onSave(rules,join))onClose();
    }catch(e){
      setError(e instanceof Error?e.message:"Unable to save rules");
    }finally{setBusy(false);}
  };
  return <div className="gl-tab-smart-editor" ref={editorRoot}>
    <div className="gl-tab-smart-heading">
      <Focusable ref={el=>{backRef.current=el;firstRef.current=el;}}
        className="gl-tab-manager-action" focusClassName="gl-focused" noFocusRing
        onActivate={onClose} onCancelButton={onClose}
        onButtonDown={directional}><MdArrowBack/> Back</Focusable>
      <div><h3>Smart Rules</h3><p>{tab.title}</p></div>
      <Focusable className="gl-tab-manager-action gl-tab-manager-primary"
        focusClassName="gl-focused" noFocusRing
        onActivate={()=>void save()} onCancelButton={onClose} onButtonDown={directional}>
        <MdCheck/> Save Rules
      </Focusable>
    </div>
    <div className="gl-tab-smart-body">
      <div className="gl-tab-smart-summary">
        <MdFilterAlt/>
        <div><strong>{count} matching games</strong>
          <span>Live preview from the current Game Library inventory</span></div>
      </div>
      <div className="gl-tab-smart-join">
        <span className="gl-tab-manager-caption">MATCH CONDITIONS</span>
        <Focusable className={"gl-tab-smart-choice"+(join==="all"?" gl-tab-smart-choice-active":"")}
          focusClassName="gl-focused" noFocusRing onActivate={()=>setJoin("all")}
          onCancelButton={onClose} onButtonDown={directional}>ALL · AND</Focusable>
        <Focusable className={"gl-tab-smart-choice"+(join==="any"?" gl-tab-smart-choice-active":"")}
          focusClassName="gl-focused" noFocusRing onActivate={()=>setJoin("any")}
          onCancelButton={onClose} onButtonDown={directional}>ANY · OR</Focusable>
      </div>
      <div className="gl-tab-smart-rules">
        {rules.map((rule,index)=>
          <div className="gl-tab-smart-rule" key={index}>
            <span className="gl-tab-smart-rule-number">{index+1}</span>
            <Focusable ref={el=>{rowRefs.current[index]=el;}}
              className="gl-tab-smart-rule-picker" focusClassName="gl-focused"
              noFocusRing onActivate={()=>setChoosingIndex(current=>current===index?null:index)}
              onCancelButton={choosingIndex===index?()=>closeChoices(index):onClose}
              onButtonDown={directional}>
              <strong>{label(rule.type)}</strong>
              <span>{choosingIndex===index?"Select below":"Change condition"}</span>
              <MdSettingsSuggest/>
            </Focusable>
            <Focusable className="gl-tab-manager-action gl-tab-manager-danger"
              focusClassName="gl-focused" noFocusRing
              onActivate={()=>{setChoosingIndex(null);setRules(current=>current.filter((_,i)=>i!==index));}}
              onCancelButton={onClose} onButtonDown={directional}
              onOKActionDescription={"Remove "+label(rule.type)}>
              <MdDeleteOutline/> Remove
            </Focusable>
            {choosingIndex===index&&<div className="gl-tab-smart-options"
              aria-label="Available Smart conditions">
              {availableAt(index).map((item,optionIndex)=>
                <Focusable key={item.id}
                  ref={el=>{optionRefs.current[optionIndex]=el;}}
                  className={"gl-tab-smart-option"+(item.id===rule.type?" gl-tab-smart-option-current":"")}
                  focusClassName="gl-focused" noFocusRing
                  onActivate={()=>select(index,item.id)}
                  onCancelButton={()=>closeChoices(index)}
                  onButtonDown={directional}>
                  {item.title}{item.id===rule.type?<MdCheck/>:null}
                </Focusable>)}
            </div>}
          </div>
        )}
        {!rules.length&&<div className="gl-tab-smart-empty">
          No conditions. This tab matches all games unless manually excluded.
        </div>}
      </div>
      <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
        noFocusRing onActivate={add} onCancelButton={onClose}
        onButtonDown={directional}>
        <MdAdd/> {available.length?"Add condition":"All conditions used"}
      </Focusable>
      <p className="gl-tab-manager-note">
        Select a condition to choose from the available rules.
        Repeated conditions are prevented. With AND, every condition
        must match; OR accepts any. Manual Include/Exclude overrides are
        configured in Tab Manager and always take priority.
      </p>
      {error&&<p role="alert" className="gl-tab-manager-error">{error}</p>}
      {busy&&<p className="gl-tab-manager-note">Saving rules…</p>}
      <Focusable className="gl-tab-manager-action" focusClassName="gl-focused"
        noFocusRing onActivate={onClose} onCancelButton={onClose}
        onButtonDown={directional}>
        <MdClose/> Cancel
      </Focusable>
    </div>
  </div>;
}
