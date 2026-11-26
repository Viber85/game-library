import {useEffect,useState} from "react";
import {Focusable,ModalRoot,Navigation} from "@decky/ui";
import {toaster} from "@decky/api";
import {
  MdArrowBack,MdDownload,MdPlayArrow,MdFolder,MdSportsEsports,MdImage,
  MdSettings,MdCheck,MdChevronRight,
} from "react-icons/md";
import {canonicalSteamAppId} from "./launchGame";
import {
  listGameCollections,changeGameCollection,type CollectionChoice,
} from "./gameCollectionsActions";

type Props={
  title:string;
  store:"steam"|"gog";
  appId?:number;
  primaryLabel:string;
  onPrimary:()=>void;
  onController:()=>void;
  onArtwork?:()=>void;
  onProperties?:()=>void;
  closeModal?:()=>void;
};
type Apps={OpenAppSettingsDialog?:(appId:number,section:string)=>void};
const canonical=(id:number|undefined):number|null=>
  typeof id==="number"?canonicalSteamAppId(id):null;

export function openNativeGameProperties(id:number):boolean{
  const actual=canonical(id);
  const apps=(window as Window&{SteamClient?:{Apps?:Apps}}).SteamClient?.Apps;
  if(actual===null||typeof apps?.OpenAppSettingsDialog!=="function")return false;
  try{
    // The Steam client owns all tabs: General (launch options), Compatibility,
    // Updates, Controller etc. No attempt to duplicate Steam settings.
    apps.OpenAppSettingsDialog(actual,"general");
    return true;
  }catch(error){
    console.warn("[game-library] Steam app properties unavailable",error);
    return false;
  }
}
export function openSteamGridDbArtwork(id:number):boolean{
  const actual=canonical(id);
  if(actual===null)return false;
  try{
    // SteamGridDB registers /steamgriddb/:appid/:assetType? on mount.
    // Steam indexes non-Steam shortcuts as signed int32; the SGDB page
    // calls window.appStore.GetAppOverviewByAppID with this route ID.
    const routeId=actual>=0x80000000?actual|0:actual;
    Navigation.Navigate("/steamgriddb/"+routeId);
    return true;
  }catch(error){
    console.warn("[game-library] SteamGridDB plugin route unavailable",error);
    return false;
  }
}
const missingShortcut=(name:string)=>toaster.toast({
  title:name,
  body:"For GOG games, complete Install and Set up Play first to register the Steam shortcut.",
});

export function UnifiedGameContextMenu({
  title,store,appId,primaryLabel,onPrimary,onController,onArtwork,
  onProperties,closeModal,
}:Props){
  const [page,setPage]=useState<"main"|"collections">("main");
  const [choices,setChoices]=useState<CollectionChoice[]>([]);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const id=canonical(appId);
  const dismiss=()=>{if(!saving)closeModal?.();};
  const goBack=()=>{
    if(saving)return;
    if(page==="collections"){setPage("main");setError("");}
    else dismiss();
  };
  useEffect(()=>{
    if(page!=="collections"||id===null)return;
    let active=true;
    setLoading(true);setError("");
    void listGameCollections(id).then(items=>{if(active)setChoices(items);})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"Collections unavailable");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[page,id]);
  const choose=(callback:()=>void)=>{
    dismiss();
    callback();
  };
  const collections=()=>{
    if(id===null){missingShortcut("Add to Collections");return;}
    setPage("collections");
  };
  const controller=()=>{
    if(id===null){missingShortcut("Controller Settings");return;}
    choose(onController);
  };
  const artwork=()=>{
    if(id===null){missingShortcut("Change Artwork");return;}
    choose(()=>{
      if(onArtwork){onArtwork();return;}
      if(!openSteamGridDbArtwork(id))
        toaster.toast({title:"Change Artwork",body:"Install SteamGridDB for Decky Loader and retry."});
    });
  };
  const properties=()=>{
    if(id===null){missingShortcut("Game Properties");return;}
    choose(()=>{
      if(onProperties){onProperties();return;}
      if(!openNativeGameProperties(id))
        toaster.toast({title:"Game Properties",
          body:"Steam could not open this game's native Properties dialog."});
    });
  };
  const toggle=(choice:CollectionChoice)=>{
    if(saving||id===null)return;
    setSaving(true);setError("");
    void changeGameCollection(id,choice,!choice.selected).then(()=>{
      setChoices(items=>items.map(x=>x.key===choice.key?
        {...x,selected:!choice.selected}:x));
    }).catch(e=>setError(e instanceof Error?e.message:"Unable to save collection"))
      .finally(()=>setSaving(false));
  };
  const menuItems=[
    {key:"primary",label:primaryLabel,icon:primaryLabel==="Play"?MdPlayArrow:MdDownload,
      action:()=>choose(onPrimary)},
    {key:"collections",label:"Add to Collections",icon:MdFolder,action:collections,chevron:true},
    {key:"controller",label:"Controller Settings",icon:MdSportsEsports,action:controller},
    {key:"artwork",label:"Change Artwork",icon:MdImage,action:artwork},
    {key:"properties",label:"Game Properties",icon:MdSettings,action:properties},
  ];
  return <ModalRoot onCancel={goBack} className="gl-unified-context-modal">
    <div className="gl-unified-context" aria-label="Game context menu">
      <div className="gl-unified-context-heading">
        {page==="collections"&&
          <Focusable noFocusRing className="gl-unified-context-back"
            onActivate={goBack} onCancelButton={goBack}
            onOKActionDescription="Back to game options">
            <MdArrowBack/>
          </Focusable>}
        <div>
          <div className="gl-unified-context-eyebrow">
            {page==="main"?"Game options":"Collections"} · {store==="steam"?"Steam":"GOG"}
          </div>
          <strong>{page==="main"?title:"Add to Collections"}</strong>
        </div>
      </div>
      {page==="main"?<div className="gl-unified-context-items">
        {menuItems.map((item,index)=>
          <Focusable key={item.key} noFocusRing preferredFocus={index===0}
              className="gl-unified-context-item"
              onActivate={item.action} onCancelButton={goBack}
              onOKActionDescription={item.label}>
            <item.icon/>
            <span>{item.label}</span>
            {item.chevron&&<MdChevronRight className="gl-unified-context-more"/>}
          </Focusable>)}
      </div>:
      <div className="gl-unified-context-collections">
        {loading?<div className="gl-unified-context-empty">Loading collections…</div>:
          choices.length===0?
            <div className="gl-unified-context-empty">No editable collections found.</div>:
            <>
              {(["manual","tab","steam"] as const).map((kind)=>{
                const list=choices.filter(x=>x.kind===kind);
                if(!list.length)return null;
                return <section key={kind} className="gl-unified-context-section">
                  <div className="gl-unified-context-group">
                    {kind==="manual"?"Game Library lists":
                     kind==="tab"?"Our custom collections":"Steam collections"}
                  </div>
                  {list.map((choice,index)=>
                    <Focusable key={choice.key} noFocusRing preferredFocus={kind==="manual"&&index===0}
                      className="gl-unified-context-item"
                      onActivate={()=>toggle(choice)} onCancelButton={goBack}
                      onOKActionDescription={(choice.selected?"Remove from ":"Add to ")+choice.title}>
                      <MdFolder/><span>{choice.title}</span>
                      {choice.selected&&<MdCheck className="gl-unified-context-selected"/>}
                    </Focusable>)}
                </section>;
              })}
            </>}
      </div>}
      {error&&<div className="gl-unified-context-error" role="status">{error}</div>}
      {saving&&<div className="gl-unified-context-empty">Saving collection…</div>}
      <div className="gl-unified-context-hint">A Select · B {page==="main"?"Close":"Back"}</div>
    </div>
  </ModalRoot>;
}
