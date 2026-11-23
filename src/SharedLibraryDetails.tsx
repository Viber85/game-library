import {useEffect,useRef,useState,type ReactNode,type Ref} from "react";
import {Focusable,GamepadButton,showModal,type GamepadEvent} from "@decky/ui";
import {
  MdAccessTime,MdArrowBack,MdCheckCircle,MdDownload,
  MdEmojiEvents,MdShield,MdStorefront,MdStorage,MdCancel,MdPause,MdPlayArrow
} from "react-icons/md";
import type {UnifiedLibraryGame} from "./unifiedLibraryGame";
import {requestGogHltbTimes,requestProtonRating,type HltbReply,type ProtonRating} from "./metadataRequests";
import {SystemStatusBar} from "./SystemStatusBar";
import {lastPlayedLabel} from "./steam";
import {directionFromButton,focusNativeMenuControl} from "./nativeMenuGamepad";
import {nextGamepadControl} from "./nativeGamepadFocusCore";
import {getGogSteamGridFallback} from "./GogArtwork";
import {subscribeArtworkSettingsChanged} from "./steamGridArtwork";
import {preflightGogInstall,startGogInstall,getGogInstallStatus,cancelGogInstall,
  pauseGogInstall,resumeGogInstall,
  type GogInstallMode,type GogInstallState} from "./gogInstallRequests";
import {GogInstallModal} from "./GogInstallModal";
import {GogLaunchModal} from "./GogLaunchModal";
import {inspectGogLaunch,type GogLaunchInfo} from "./gogLaunchRequests";
import {configureGogPlay,playGogShortcut} from "./gogSteamShortcut";

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
  const [installBusy,setInstallBusy]=useState(false);
  const [installSize,setInstallSize]=useState<number|null>(null);
  const [installSnapshot,setInstallSnapshot]=useState<GogInstallState>({status:"idle"});
  const [installError,setInstallError]=useState("");
  const [launchInfo,setLaunchInfo]=useState<GogLaunchInfo|null>(null);
  const [launchBusy,setLaunchBusy]=useState(false);
  const rootRef=useRef<HTMLElement>(null);
  const focusRefs=useRef<Record<string,HTMLDivElement|null>>({});
  const changedFocus=useRef(false);
  const statusRef=useRef<HTMLDivElement>(null);
  const internalBackRef=useRef<HTMLDivElement|null>(null);
  const store=STORE_LABELS[game.store];
  const gogReady=game.store==="gog"&&launchInfo?.status==="ready"&&
    launchInfo.shortcut?.ready===true;
  const gogDownloaded=game.store==="gog"&&(
    installSnapshot.status==="downloaded"||
    launchInfo?.status==="downloaded"||
    launchInfo?.status==="registered"||
    launchInfo?.status==="ready");
  const status=gogReady?"Installed · Proton ready":
    gogDownloaded?"Downloaded · setup pending":
    game.availability==="installed"?"Installed":
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


  // GOG downloads belong to our backend, never Steam's download queue.
  // Polling is read-only: jobs survive navigation away from Game Details.
  useEffect(()=>{
    if(game.store!=="gog"||!gogAccountId)return;
    let active=true;
    const refresh=()=>{void getGogInstallStatus(gogAccountId,game.storeId)
      .then(reply=>{if(active)setInstallSnapshot(reply);})
      .catch(()=>{if(active)setInstallError("Could not read GOG download status.");});};
    refresh();
    const timer=window.setInterval(refresh,1000);
    return ()=>{active=false;window.clearInterval(timer);};
  },[game.store,game.storeId,gogAccountId]);


  // Restore completed GOG installations and their Steam shortcuts after
  // plugin restarts, not just after a live in-memory download finishes.
  useEffect(()=>{
    if(game.store!=="gog"||!gogAccountId){
      setLaunchInfo(null);
      return;
    }
    let active=true;
    setLaunchInfo(null);
    void inspectGogLaunch(gogAccountId,game.storeId).then(info=>{
      if(active)setLaunchInfo(info);
    }).catch(()=>{if(active)setLaunchInfo(null);});
    return ()=>{active=false;};
  },[game.key,game.store,game.storeId,gogAccountId,
     installSnapshot.status==="downloaded"]);

  const openGogLaunchSetup=()=>{
    if(game.store!=="gog"||!gogAccountId||launchBusy)return;
    setLaunchBusy(true);setInstallError("");
    void inspectGogLaunch(gogAccountId,game.storeId).then(info=>{
      if(!info.ok||info.status==="not-installed")
        throw new Error(info.reason||"The GOG download is not complete.");
      setLaunchInfo(info);
      showModal(<GogLaunchModal title={game.title} info={info}
        onConfirm={async(relative:string)=>{
          const updated=await configureGogPlay(
            gogAccountId,game.storeId,game.title,relative);
          if(!updated.ok||updated.status!=="ready")
            throw new Error(updated.reason||"Proton configuration is not ready.");
          setLaunchInfo(updated);
          setInstallError("");
        }}/>);
    }).catch(error=>setInstallError(error instanceof Error?error.message:
      "Unable to configure GOG game launching.")).finally(()=>setLaunchBusy(false));
  };

  const playGogGame=()=>{
    if(!gogReady||!launchInfo?.shortcut?.app_id)return;
    try{
      if(!playGogShortcut(launchInfo.shortcut.app_id))
        setInstallError("Steam could not start the GOG shortcut. Check Steam Properties.");
    }catch(error){
      setInstallError(error instanceof Error?error.message:
        "Steam could not launch the GOG game.");
    }
  };

  const openInstall=()=>{
    if(game.store!=="gog"||!gogAccountId||installBusy)return;
    if(installSnapshot.status==="starting"||installSnapshot.status==="downloading"||
       installSnapshot.status==="paused")return;
    if(gogDownloaded){
      openGogLaunchSetup();
      return;
    }
    setInstallBusy(true);setInstallError("");
    void preflightGogInstall(gogAccountId,game.storeId).then(plan=>{
      if(!plan.ok)throw new Error(plan.reason||"GOG download unavailable.");
      if(!plan.locations?.length)throw new Error("No writable storage location is available.");
      setInstallSize(plan.size_bytes??null);
      // Steam's native InstallApp wizard requires a Steam AppID, so GOG uses
      // its own equivalent controller-accessible modal, not inline buttons.
      showModal(<GogInstallModal title={game.title} plan={plan}
        onConfirm={async(location:string,mode:GogInstallMode)=>{
          const reply=await startGogInstall(gogAccountId,game.storeId,location,mode);
          if(!reply.ok)throw new Error(reply.reason||"GOG download could not start.");
          setInstallSnapshot({status:"starting",percent:0});
          setInstallError("");
        }}/>);
    }).catch(error=>setInstallError(error instanceof Error?error.message:
      "GOG install preflight failed.")).finally(()=>setInstallBusy(false));
  };
  const stopInstall=()=>{
    if(!gogAccountId||installBusy)return;
    setInstallBusy(true);setInstallError("");
    void cancelGogInstall(gogAccountId,game.storeId).then(reply=>{
      if(!reply.ok)throw new Error(reply.reason||"Could not cancel GOG download.");
      setInstallSnapshot(previous=>({...previous,cancel_requested:true}));
    }).catch(error=>setInstallError(error instanceof Error?error.message:
      "Could not cancel GOG download.")).finally(()=>setInstallBusy(false));
  };
  const togglePause=()=>{
    if(!gogAccountId||installBusy)return;
    const paused=installSnapshot.status==="paused";
    if(!paused&&installSnapshot.status!=="downloading")return;
    setInstallBusy(true);setInstallError("");
    const action=paused?resumeGogInstall:pauseGogInstall;
    void action(gogAccountId,game.storeId).then(reply=>{
      if(!reply.ok)throw new Error(reply.reason||"Could not change GOG download status.");
      setInstallSnapshot(previous=>({...previous,
        status:paused?"downloading":"paused",
        speed_mib:null,reason:paused?"":"Download paused."}));
    }).catch(error=>setInstallError(error instanceof Error?error.message:
      "Could not change GOG download status.")).finally(()=>setInstallBusy(false));
  };
  const isDownloading=installSnapshot.status==="starting"||
    installSnapshot.status==="downloading"||
    installSnapshot.status==="paused";
  const isPaused=installSnapshot.status==="paused";
  const gogInstallLabel=launchBusy?"Preparing…":installBusy?"Working…":
    isDownloading?(isPaused?"Paused":"Downloading")+
      (typeof installSnapshot.percent==="number"?
        " "+installSnapshot.percent.toFixed(0)+"%":""):
    gogReady?"Play":gogDownloaded?"Set up Play":"Install";
  const sizeLabel=(bytes:number|null|undefined)=>{
    if(typeof bytes!=="number"||!Number.isFinite(bytes)||bytes<0)return "—";
    return (bytes/(1024**3)).toFixed(1)+" GB";
  };

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

      <div className="gl-details-content-block">
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
          <div className="gl-details-summary" aria-label="Game installation and progress summary">
            <div className="gl-details-meta-cell gl-details-meta-space">
              <MdStorage aria-hidden="true"/><div><small>SPACE REQUIRED</small>
                <strong>{game.store==="gog"?sizeLabel(installSize):"—"}</strong>
              </div>
            </div>
            <div className="gl-details-meta-cell">
              <MdAccessTime aria-hidden="true"/><div><small>LAST PLAYED</small>
                <strong>{typeof game.lastPlayed==="number"&&game.lastPlayed>0?
                  lastPlayedLabel(game.lastPlayed):"—"}</strong>
              </div>
            </div>
            <div className="gl-details-meta-cell gl-details-meta-achievements">
              <MdEmojiEvents aria-hidden="true"/><div><small>ACHIEVEMENTS</small>
                <strong>Unavailable</strong>
                <div className="gl-details-empty-progress" aria-hidden="true"/>
              </div>
            </div>
          </div>
        <div className="gl-details-action-row">
            {actions ? <div className="gl-actions">{actions}</div>:
              game.store==="gog"?
              <Focusable {...onAction("install")}
                  className="gl-details-focus gl-details-primary"
                  onOKActionDescription={gogReady?"Play GOG game":
                    gogDownloaded?"Configure GOG game with Proton":
                    "Choose GOG installation location"}
                  onActivate={gogReady?playGogGame:
                    gogDownloaded?openGogLaunchSetup:openInstall}>
                {gogReady?<MdPlayArrow/>:
                  gogDownloaded?<MdStorage/>:<MdDownload/>}
                <strong>{gogInstallLabel}</strong>
              </Focusable>:
              <div className="gl-details-primary gl-gog-install-pending"
                   aria-disabled="true">
                <MdDownload/><strong>Install unavailable</strong>
              </div>}
          </div>
          <div className="gl-details-progress-slot" aria-label="Download status and controls">
          {game.store==="gog"&&isDownloading&&
            <div className="gl-details-download gl-gog-install-progress"
                aria-label="GOG installation progress">
              <div className="gl-details-download-header">
                <div className="gl-details-download-caption">
                  <span>GOG DOWNLOAD</span>
                  <strong>{typeof installSnapshot.percent==="number"?
                    installSnapshot.percent.toFixed(1)+"%":"Preparing"}</strong>
                </div>
              </div>
              <div className="gl-details-download-main">
                <div className="gl-details-download-track" role="progressbar"
                    aria-label="GOG download progress" aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={installSnapshot.percent??undefined}>
                  <div className="gl-details-download-fill"
                    style={{width:(installSnapshot.percent??0)+"%"}}/>
                </div>
                <div className="gl-details-download-controls">
                  {installSnapshot.status!=="starting"&&
                    <Focusable {...onAction("install-toggle")}
                        className="gl-details-focus gl-details-download-control"
                        onActivate={togglePause}
                        onOKActionDescription={isPaused?"Resume GOG download":"Pause GOG download"}>
                      {isPaused?<MdPlayArrow/>:<MdPause/>}
                      <span>{isPaused?"Resume":"Pause"}</span>
                    </Focusable>}
                  <Focusable {...onAction("install-cancel")}
                      className="gl-details-focus gl-details-download-control gl-details-download-cancel"
                      onActivate={stopInstall}
                      onOKActionDescription="Cancel GOG download and keep partial files">
                    <MdCancel/> Cancel download
                  </Focusable>
                </div>
              </div>
              <div className="gl-details-download-metrics"
                  aria-label="GOG download bytes and speed">
                <span><b>Downloaded</b> {sizeLabel(installSnapshot.written_bytes)}
                  {" / "}{sizeLabel(installSnapshot.total_bytes)}</span>
                <span><b>Speed</b> {!isPaused&&typeof installSnapshot.speed_mib==="number"?
                  installSnapshot.speed_mib.toFixed(1)+" MB/s":"—"}</span>
              </div>
            </div>}
          {game.store==="gog"&&!isDownloading&&
            <div className="gl-details-install-help">
              {installSnapshot.reason||
                "GOG installs use the bundled downloader. Choose Install and a storage location."}
            </div>}
          {game.store==="gog"&&installError&&<div role="status"
              className="gl-details-download-feedback">{installError}</div>}
          {game.store!=="gog"&&!actions&&<div className="gl-details-install-help">
            Installation is not available for this store yet.
          </div>}
          </div>
        </div>
      </div>

      <div className="gl-details-hltb gl-details-hltb-strip" aria-label="HowLongToBeat times and local playtime">
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
      </div>

      </div>

      <footer className="gl-details-footer">
        A Select · B Back · GOG actions remain separate from Steam
      </footer>
    </div>
  </section>;
}
