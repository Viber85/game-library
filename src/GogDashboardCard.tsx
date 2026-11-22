import {Focusable,GamepadButton,type GamepadEvent} from "@decky/ui";
import {SharedLibraryCardFace} from "./SharedLibraryGrid";
import {GogArtwork} from "./GogArtwork";
import type {DashboardEntry} from "./dashboardCatalog";

/** GOG uses the same poster, Focusable class and controller directional
 * callbacks as Steam's Dashboard grid. Store-owned (uninstalled/unknown)
 * records have NO fake Steam game action or native Steam context menu. */
export function GogDashboardCard({
  entry,accountId,index,onSelect,onActivate,onSort,onMove,onCancel,cardRef,
}:{
  entry:Extract<DashboardEntry,{store:"gog"}>;
  accountId:string;
  index:number;
  onSelect:()=>void;
  onActivate:()=>void;
  onSort:()=>void;
  onMove:(button:GamepadButton)=>void;
  onCancel:()=>void;
  cardRef?:(el:HTMLDivElement|null)=>void;
}){
  const direction=(event:GamepadEvent)=>{
    const button=event.detail?.button;
    if(button===GamepadButton.DIR_LEFT||button===GamepadButton.DIR_RIGHT||
       button===GamepadButton.DIR_UP||button===GamepadButton.DIR_DOWN||
       button===GamepadButton.BUMPER_LEFT||button===GamepadButton.BUMPER_RIGHT){
      event.preventDefault();
      event.stopPropagation();
      onMove(button);
    }
  };
  return <Focusable ref={cardRef} key={entry.key}
    className="gl-game" focusClassName="gl-focused" noFocusRing
    preferredFocus={index===0}
    onActivate={onActivate}
    onCancelButton={onCancel}
    onOptionsButton={(event:GamepadEvent)=>{
      event.preventDefault();event.stopPropagation();onSort();
    }}
    onGamepadFocus={onSelect}
    onMouseEnter={onSelect}
    onButtonDown={direction}
    onOKActionDescription="GOG game details"
    onOptionsActionDescription="Sort games"
    aria-label={entry.title+" · GOG"}>
    <SharedLibraryCardFace title={entry.title}>
      <GogArtwork game={entry.gog} accountId={accountId}/>
      <span className="gl-gog-store-marker" aria-label="GOG">GOG</span>
    </SharedLibraryCardFace>
  </Focusable>;
}
