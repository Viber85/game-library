import {useState} from "react";
import {Focusable,ModalRoot} from "@decky/ui";
import {MdCheckCircle,MdDownload,MdStorage,MdWarningAmber} from "react-icons/md";
import type {GogInstallPreflight,GogInstallMode} from "./gogInstallRequests";

const sizeLabel=(bytes:number|null|undefined)=>{
  if(typeof bytes!=="number"||!Number.isFinite(bytes)||bytes<=0)return "Unknown";
  return (bytes/(1024**3)).toFixed(1)+" GB";
};
export function GogInstallModal({title,plan,onConfirm,closeModal}:{
  title:string;
  plan:GogInstallPreflight;
  onConfirm:(location:string,mode:GogInstallMode)=>Promise<void>;
  closeModal?:()=>void;
}){
  const locations=plan.locations||[];
  const [selected,setSelected]=useState(locations[0]?.key||"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const choice=locations.find(location=>location.key===selected);
  const hasExisting=!!choice&&choice.existing!=="empty";
  const resumable=choice?.existing==="resumable"||
    choice?.existing==="untracked";
  const start=(mode:GogInstallMode)=>{
    if(!choice||busy)return;
    setBusy(true);setError("");
    // Existing-folder actions are actual commands, not radio-style selections.
    void onConfirm(choice.key,mode).then(()=>closeModal?.())
      .catch(error=>setError(error instanceof Error?error.message:
        "Could not start the GOG download."))
      .finally(()=>setBusy(false));
  };
  const dismiss=()=>{if(!busy)closeModal?.();};
  return <ModalRoot onCancel={dismiss} className="gl-gog-install-modal">
    <div className="gl-gog-install-dialog">
      <h2>Install {title}</h2>
      <p className="gl-gog-dialog-lead">Choose where to install this GOG game.</p>
      <div className="gl-gog-dialog-size">
        <span>Required space</span><strong>{sizeLabel(plan.size_bytes)}</strong>
        <span>Platform</span><strong>Windows (Proton setup later)</strong>
      </div>
      <h3>Storage location</h3>
      <div className="gl-gog-dialog-drives">
        {locations.map((location,index)=>
          <Focusable key={location.key} noFocusRing preferredFocus={index===0}
              className={"gl-gog-dialog-drive"+(selected===location.key?" is-selected":"")}
              onActivate={()=>{
                setSelected(location.key);
                setError("");
              }} onCancelButton={dismiss}
              onOKActionDescription={"Select "+location.label}>
            <MdStorage/><div>
              <strong>{location.label}</strong>
              <span>{sizeLabel(location.free_bytes)} available</span>
            </div>
            {selected===location.key&&<MdCheckCircle className="gl-gog-drive-selected"/>}
          </Focusable>)}
      </div>
      {choice&&hasExisting&&
        <div className="gl-gog-dialog-existing">
          <div className="gl-gog-dialog-existing-title">
            <MdWarningAmber/> Previous files detected
          </div>
          <p>{resumable?
            (choice.existing==="untracked"?
              "This folder was not recorded by the new installer. Choose Continue only if it contains this game's previous GOG download.":
              "This folder belongs to a previous Game Library GOG download."):
            "This folder contains another or completed installation. It cannot be overwritten."}</p>
          {resumable&&<Focusable noFocusRing className="gl-gog-dialog-strategy"
              onActivate={()=>start(choice.existing==="untracked"?"adopt":"resume")}
              onCancelButton={dismiss}
              onOKActionDescription="Immediately continue the existing GOG download">
            <MdCheckCircle/> {busy?"Starting…":"Continue existing download"}
          </Focusable>}
          <Focusable noFocusRing className="gl-gog-dialog-strategy"
              onActivate={()=>start("fresh")} onCancelButton={dismiss}
              onOKActionDescription="Start a new download in a separate folder, keeping old files">
            <MdDownload/> {busy?"Starting…":"Start fresh — keep previous files"}
          </Focusable>
          <p className="gl-gog-dialog-note">
            Start fresh installs to a separate folder. Existing files are kept.
          </p>
        </div>}
      {error&&<div className="gl-gog-dialog-error" role="status">{error}</div>}
      <div className="gl-gog-dialog-actions">
        {!hasExisting&&<Focusable noFocusRing className="gl-gog-dialog-confirm"
            onActivate={()=>start("new")} onCancelButton={dismiss}
            onOKActionDescription="Start a new GOG download">
          <MdDownload/> {busy?"Starting…":"Install"}
        </Focusable>}
        <Focusable noFocusRing className="gl-gog-dialog-cancel"
            onActivate={dismiss} onCancelButton={dismiss}
            onOKActionDescription="Cancel GOG storage selection">Cancel</Focusable>
      </div>
    </div>
  </ModalRoot>;
}
