import {useEffect,useRef,useState,type ReactNode,type Ref} from "react";
import {Focusable,GamepadButton,type GamepadEvent} from "@decky/ui";
import {
  MdAccessTime,MdArrowBack,MdCheckCircle,MdDownload,
  MdEmojiEvents,MdShield,MdStorefront
} from "react-icons/md";
import type {UnifiedLibraryGame} from "./unifiedLibraryGame";
import {requestGogHltbTimes,requestProtonRating,type HltbReply,type ProtonRating} from "./metadataRequests";
import {SystemStatusBar} from "./SystemStatusBar";
import {lastPlayedLabel} from "./steam";
import {directionFromButton,focusNativeMenuControl} from "./nativeMenuGamepad";
import {nextGamepadControl} from "./nativeGamepadFocusCore";
import {getGogSteamGridFallback} from "./GogArtwork";
import {subscribeArtworkSettingsChanged} from "./steamGridArtwork";

const stop=(event:GamepadEvent)=>{
  event.preventDefault();
  event.stopPropagation();
};
const STORE_LABELS:Record<UnifiedLibraryGame["store"],string>={
  steam:"Steam",gog:"GOG",epic:"Epic Games",ubisoft:"Ubisoft Connect",
  ea:"EA app",amazon:"Amazon Games",other:"Other",
};
const hours=(value:number|null|undefined)=>
  typeof value==="number"&&Number.isFinite(value)&&value>0?
    value.toFixed(1)+" hours":"—";

export function SharedLibraryDetails({
  game,cover,onBack,backRef,onFocusRail,actions,gogAccountId="",
}:{
  game:UnifiedLibraryGame;
  cover:(onImageLoaded:(url:string)=>void)=>ReactNode;
  onBack:()=>void;
  onFocusRail?:()=>void;
  backRef?:Ref<HTMLDivElement>;
  actions?:ReactNode;
  gogAccountId?:string;
}){
  const [hltb,setHltb]=useState<HltbReply|null>(null);
  const [proton,setProton]=useState<ProtonRating|null>(null);
  const [nativeHeroFailed,setNativeHeroFailed]=useState(false);
  const [remoteHero,setRemoteHero]=useState<string|null>(null);
  const [remoteHeroFailed,setRemoteHeroFailed]=useState(false);
  // Remember the image that ACTUALLY loaded on the game's card.
  // GOG/SGDB hero has priority; the card is the last visual fallback.
  const [loadedCardImage,setLoadedCardImage]=useState<{
    gameKey:string;url:string;
  }|null>(null);
  const [artworkRevision,setArtworkRevision]=useState(0);
  const rootRef=useRef<HTMLElement>(null);
  const focusRefs=useRef<Record<string,HTMLDivElement|null>>({});
  const changedFocus=useRef(false);
  const statusRef=useRef<HTMLDivElement>(null);
  const internalBackRef=useRef<HTMLDivElement|null>(null);
  const store=STORE_LABELS[game.store];
  const status=game.availability==="installed"?"Installed":
    game.availability==="not-installed"?"Not installed":"Owned";
  useEffect(()=>{
    changedFocus.current=false;
    setHltb(null);setProton(null);
    setNativeHeroFailed(false);setRemoteHero(null);setRemoteHeroFailed(false);
    // Steam's gamepad navigation tree is independent from browser focus.
    // Transfer native focus from the old GOG library card to this page,
    // retrying once after the new Focusable nodes register with Game Mode.
    const focusBack=()=>{
      const target=internalBackRef.current;
      if(target&&!changedFocus.current)
        focusNativeMenuControl(target,GamepadButton.DIR_DOWN);
    };
    const frame=window.requestAnimationFrame(focusBack);
    const retry=window.setTimeout(focusBack,140);
    return ()=>{
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  },[game.key]);
  useEffect(()=>{
    if(game.store!=="gog")return;
    let active=true;
    const timer=window.setTimeout(()=>{
      void requestGogHltbTimes(game.storeId,game.title).then(result=>{
        if(active)setHltb(result);
      }).catch(()=>{if(active)setHltb({status:"error",reason:"Unavailable"});});
      // For GOG the backend resolves a REAL Steam AppID by title before
      // reading ProtonDB; the GOG ID is never passed to Steam's app APIs.
      void requestProtonRating(0,game.title,true).then(result=>{
        if(active)setProton(result);
      }).catch(()=>{if(active)setProton({status:"error",tier:null});});
    },220);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[game.key,game.store,game.storeId,game.title]);
  const focusRef=(id:string)=>(node:HTMLDivElement|null)=>{
    focusRefs.current[id]=node;
    if(id==="back"){
      internalBackRef.current=node;
      if(typeof backRef==="function")backRef(node);
      else if(backRef&&"current" in backRef)backRef.current=node;
    }
  };
  const onMove=(id:string)=>(event:GamepadEvent)=>{
    const direction=directionFromButton(event.detail?.button);
    if(!direction)return;
    const current=focusRefs.current[id];
    const next=rootRef.current&&current?
      nextGamepadControl(rootRef.current,current,direction,
        ".gl-game-details .gl-details-focus"):null;
    // Keep the hidden Library grid from handling the same D-pad press.
    stop(event);
    if(next)focusNativeMenuControl(next,event.detail!.button!);
    else if(direction==="left")onFocusRail?.();
  };
  const onAction=(id:string)=>({
    ref:focusRef(id),
    onButtonDown:onMove(id),
    onCancelButton:onBack,
    onGamepadFocus:()=>{if(id!=="back")changedFocus.current=true;},
    onCancelActionDescription:"Back to previous Game Library screen",
  });

  const hltbData=hltb?.status==="ok"?hltb.data:null;
  const tier=proton?.status==="ok"?proton.tier:null;
  const tierLabel=tier?tier.charAt(0).toUpperCase()+tier.slice(1):"Not rated";
  // Prefer the original GOG background. Only query SteamGridDB for the
  // *opened* GOG title if its native hero is absent or fails to load.
  // Reuse the same account-verified, rate-limited backend/cache as GOG covers.
  const nativeHero=typeof game.hero==="string"&&game.hero.startsWith("https://")?
    game.hero:null;
  const hero=nativeHero&&!nativeHeroFailed?nativeHero:
    !remoteHeroFailed?remoteHero:null;
  const cardHero=loadedCardImage?.gameKey===game.key?
    loadedCardImage.url:null;
  const displayedHero=hero||cardHero;
  const onCardImageLoaded=(url:string)=>{
    if(!url.startsWith("https://"))return;
    setLoadedCardImage(previous=>
      previous?.gameKey===game.key&&previous.url===url?
        previous:{gameKey:game.key,url});
  };
  useEffect(()=>subscribeArtworkSettingsChanged(()=>{
    setRemoteHero(null);
    setRemoteHeroFailed(false);
    setArtworkRevision(n=>n+1);
  }),[game.key]);
  useEffect(()=>{
    if(game.store!=="gog"||!gogAccountId||
       (nativeHero&&!nativeHeroFailed)||remoteHero||remoteHeroFailed)return;
    let active=true;
    const timer=window.setTimeout(()=>{
      void getGogSteamGridFallback(gogAccountId,{
        id:game.storeId,title:game.title
      }).then(reply=>{
        if(active&&typeof reply.hero==="string"&&
           reply.hero.startsWith("https://"))setRemoteHero(reply.hero);
      }).catch(()=>{});
    },140);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[game.store,game.storeId,game.title,game.key,gogAccountId,
     nativeHero,nativeHeroFailed,remoteHero,remoteHeroFailed,artworkRevision]);

  return <section ref={rootRef} className="gl-game-details gl-gog-steam-details gl-unified-details"
      aria-label={game.title+" details"}>
    <div className="gl-details-scroller">
      <div className="gl-details-hero" aria-hidden="true">
        {displayedHero&&<img className={
            "gl-hero"+(!hero?" gl-hero-card-fallback":"")}
            src={displayedHero} alt=""
            onError={()=>{
              if(hero===nativeHero)setNativeHeroFailed(true);
              else if(hero)setRemoteHeroFailed(true);
              else setLoadedCardImage(null);
            }}/>} 
        <div className="gl-details-hero-shade"/>
      </div>
      <header className="gl-details-top">
        <Focusable {...onAction("back")}
            className="gl-details-focus gl-details-back"
            focusClassName="gl-focused" noFocusRing
            onActivate={onBack}
            onOKActionDescription="Return to previous screen">
          <MdArrowBack/> Back to Library
        </Focusable>
        <SystemStatusBar statusRef={statusRef} onStatusButtonDown={event=>{
          if(event.detail?.button===GamepadButton.DIR_DOWN){
            stop(event);
            if(internalBackRef.current)
              focusNativeMenuControl(internalBackRef.current,GamepadButton.DIR_DOWN);
          }
        }}/>
      </header>

      <div className="gl-details-intro">
        <div className="gl-details-poster gl-details-gog-poster">
          {cover(onCardImageLoaded)}
        </div>
        <div className="gl-details-intro-copy">
          <div className="gl-details-source">
            <span><MdStorefront/> {store.toUpperCase()}</span>
            {game.store==="gog"&&<div className="gl-proton-row">
              <div className={"gl-proton-badge "+(tier||"unknown")}
                  title={proton?.matched_title?
                    "Matched Steam title: "+proton.matched_title:
                    "Community compatibility from ProtonDB"}>
                <MdShield className="gl-proton-icon"/>
                <span className="gl-proton-source">ProtonDB</span>
                <strong>{proton?tierLabel:"Checking…"}</strong>
              </div>
            </div>}
          </div>
          <h1>{game.title}</h1>
          <div className="gl-details-ownership">
            <MdCheckCircle/> Owned on {store}
            <span className="gl-details-dot">·</span>
            <span>{status}</span>
          </div>
          <div className="gl-details-hltb gl-details-metrics" aria-label="HowLongToBeat, last played and achievements">
            <div className="gl-details-hltb-cell"><strong>{hours(hltbData?.main)}</strong>
              <span>MAIN STORY</span></div>
            <div className="gl-details-hltb-cell"><strong>{hours(hltbData?.extras)}</strong>
              <span>MAIN + EXTRAS</span></div>
            <div className="gl-details-hltb-cell"><strong>{hours(hltbData?.completionist)}</strong>
              <span>COMPLETIONIST</span></div>
            <div className="gl-details-hltb-cell">
              <strong>{typeof game.playtimeMinutes==="number"?
                (game.playtimeMinutes/60).toFixed(1)+" hours":"—"}</strong>
              <span>YOUR PLAYTIME</span>
            </div>
            <div className="gl-details-meta-cell">
              <MdAccessTime/><div><small>LAST PLAYED</small>
                <strong>{typeof game.lastPlayed==="number"&&game.lastPlayed>0?
                  lastPlayedLabel(game.lastPlayed):"—"}</strong>
              </div>
            </div>
            <div className="gl-details-meta-cell gl-details-meta-achievements">
              <MdEmojiEvents/><div><small>ACHIEVEMENTS</small>
                <strong>Unavailable</strong>
                <div className="gl-details-empty-progress" aria-hidden="true"/>
              </div>
            </div>
          </div>
        </div>
        <div className="gl-details-action-row">
            {actions ? <div className="gl-actions">{actions}</div>:
              <div className="gl-details-primary gl-gog-install-pending"
                  aria-disabled="true" title="GOG downloader integration in progress">
                <MdDownload/><strong>Install</strong>
              </div>}
            <div className="gl-details-space">
              <span>SPACE REQUIRED</span>
              <strong>—</strong>
            </div>
          </div>
          {!actions&&<div className="gl-details-install-help">
            GOG installation requires a separate gogdl downloader, a drive picker
            and Proton setup. These actions are not connected yet.
          </div>}
      </div>

      <footer className="gl-details-footer">
        A Select · B Back · GOG actions remain separate from Steam
      </footer>
    </div>
  </section>;
}
