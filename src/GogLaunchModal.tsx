import {useState} from "react";
import {Focusable,ModalRoot} from "@decky/ui";
import {MdPlayArrow,MdSettings} from "react-icons/md";
import type {GogLaunchInfo} from "./gogLaunchRequests";

export function GogLaunchModal({title,info,onConfirm,closeModal}:{
  title:string;info:GogLaunchInfo;
  onConfirm:(relative:string)=>Promise<void>;
  closeModal?:()=>void;
}){
  const options=info.candidates||[];
  const [selected,setSelected]=useState(info.shortcut?.relative||
    options.find(c=>c.recommended)?.relative||options[0]?.relative||"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const start=()=>{
    if(!selected||busy)return;
    setBusy(true);setError("");
    void onConfirm(selected).then(()=>closeModal?.())
      .catch(e=>setError(e instanceof Error?e.message:"Could not set up GOG launching."))
      .finally(()=>setBusy(false));
  };
  return <ModalRoot onCancel={()=>{if(!busy)closeModal?.();}}
      className="gl-gog-install-modal">
    <div className="gl-gog-install-dialog gl-gog-launch-dialog">
      <h2>Set up Play · {title}</h2>
      <p className="gl-gog-dialog-lead">
        Select the game's Windows executable. We will add it to Steam and
        enable an available Proton compatibility tool.
      </p>
      {options.length===0&&<div className="gl-gog-dialog-error" role="status">
        No Windows executables were found in this completed download.
        Check that the GOG installation contains the game files.
      </div>}
      {options.length>0&&<>
        <h3>Game executable</h3>
        <div className="gl-gog-dialog-drives">
          {options.map((item,index)=>
            <Focusable key={item.relative} noFocusRing
                preferredFocus={index===0}
                className={"gl-gog-dialog-drive"+
                  (selected===item.relative?" is-selected":"")}
                onActivate={()=>{setSelected(item.relative);setError("");}}
                onCancelButton={closeModal}
                onOKActionDescription={"Select "+item.relative}>
              <MdSettings/><div><strong>{item.label}</strong>
                <span>{item.recommended?"Possible game executable":
                  "Utility or launcher — verify before selecting"}</span>
              </div>
            </Focusable>)}
        </div>
      </>}
      {info.shortcut&&<p className="gl-gog-dialog-note">
        Steam shortcut already registered. Setup will reuse it rather than
        create another entry.
      </p>}
      {error&&<div className="gl-gog-dialog-error" role="status">{error}</div>}
      <div className="gl-gog-dialog-actions">
        {options.length>0&&<Focusable noFocusRing
            className="gl-gog-dialog-confirm" onActivate={start}
            onOKActionDescription="Configure GOG game with Proton">
          <MdPlayArrow/>{busy?"Configuring…":"Configure with Proton"}
        </Focusable>}
        <Focusable noFocusRing className="gl-gog-dialog-cancel"
            onActivate={()=>{if(!busy)closeModal?.();}}
            onOKActionDescription="Cancel GOG launch setup">Cancel</Focusable>
      </div>
    </div>
  </ModalRoot>;
}
