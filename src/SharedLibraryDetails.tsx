import type {ReactNode,Ref} from "react";
import {Focusable,GamepadButton,type GamepadEvent} from "@decky/ui";
import {MdArrowBack,MdCheckCircle,MdStorefront} from "react-icons/md";
import type {UnifiedLibraryGame} from "./unifiedLibraryGame";

const stop=(event:GamepadEvent)=>{
  event.preventDefault();
  event.stopPropagation();
};
const STORE_LABELS:Record<UnifiedLibraryGame["store"],string>={
  steam:"Steam",gog:"GOG",epic:"Epic Games",ubisoft:"Ubisoft Connect",
  ea:"EA app",amazon:"Amazon Games",other:"Other",
};

/** Provider-independent details shell. The store supplies artwork, factual
 * ownership/installed state, metadata and *implemented* actions. No button
 * is shown just because a game is owned.
 *
 * Steam native details remain available until the shared actions have parity.
 */
export function SharedLibraryDetails({
  game,cover,onBack,backRef,actions,
}:{
  game:UnifiedLibraryGame;
  cover:ReactNode;
  onBack:()=>void;
  backRef?:Ref<HTMLDivElement>;
  actions?:ReactNode;
}){
  const store=STORE_LABELS[game.store];
  const status=game.availability==="installed"?"Installed":
    game.availability==="not-installed"?"Not installed":"Owned";
  return <section className="gl-gog-detail-screen gl-unified-details"
      aria-label={game.title+" details"}>
    <div className="gl-gog-detail-top">
      <Focusable ref={backRef} className="gl-grid-back gl-gog-detail-back"
        focusClassName="gl-focused" noFocusRing
        onActivate={onBack} onCancelButton={onBack}
        onButtonDown={(event:GamepadEvent)=>{
          if(event.detail?.button===GamepadButton.DIR_LEFT||
             event.detail?.button===GamepadButton.DIR_UP){
            stop(event);onBack();
          }
        }}>
        <MdArrowBack/> Back to Library
      </Focusable>
      <span className="gl-gog-owned"><MdCheckCircle/> {status} · {store}</span>
    </div>
    <div className="gl-gog-detail-content">
      <div className="gl-gog-detail-cover">{cover}</div>
      <div className="gl-gog-detail-info">
        <div className="gl-gog-detail-store"><MdStorefront/> {store}</div>
        <h2>{game.title}</h2>
        <p>{status} {game.availability==="unknown"?"in "+store:""}</p>
        {actions ? <div className="gl-actions">{actions}</div>:
          <p className="gl-gog-detail-footnote">
            Installation and launching from {store} will become available when
            its dedicated installer and launcher are implemented.
          </p>}
      </div>
    </div>
    <div className="gl-grid-hint">A: Back to Library · B: Back to Library</div>
  </section>;
}
