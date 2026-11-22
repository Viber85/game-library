import {useEffect,useRef,useState} from "react";
import {Focusable,GamepadButton,Navigation,showModal,ConfirmModal,type GamepadEvent} from "@decky/ui";
import {
  MdArrowBack,MdCheckCircle,MdDownload,MdOpenInNew,MdPlayArrow,
  MdSettings,MdSportsEsports,MdStorefront,MdAccessTime,MdVideogameAsset,
  MdPause,MdDeleteOutline
} from "react-icons/md";
import type {LibraryGame} from "./steam";
import {
  getLibraryGames,gameActionLabel,lastPlayedLabel,play,
  playtimeLabel,posterCandidates
} from "./steam";
import {HeroBackdrop,GameLogo} from "./SelectedGameArtwork";
import {ProtonDBBadge} from "./ProtonDBBadge";
import {AchievementsCard} from "./AchievementsCard";
import {SystemStatusBar} from "./SystemStatusBar";
import {getMissingSteamArt} from "./steamGridArtwork";
import {requestHltbTimes,type HltbReply} from "./metadataRequests";
import {requestNativeRequiredInstallBytes,readNativeRequiredInstallBytes}
  from "./steamNativeRequiredSize";
import {type FocusDirection} from "./spatialFocus";
import {nextGamepadControl} from "./nativeGamepadFocusCore";
import {focusNativeMenuControl} from "./nativeMenuGamepad";
import {showNativeGameOptions} from "./nativeGameContextMenu";
import {toaster,callable} from "@decky/api";
import {openSteamInstallWizard} from "./steamInstallWizard";
import {useSteamGameDownload} from "./useSteamGameDownload";
import {resolveInstallMode,transferLabel} from "./steamDownloadProgressCore";
import {formatDownloadBytes,formatDownloadTime} from "./steamDownloadMetrics";
import {nativeDownloadAction} from "./steamDownloadActionsCore";
import {withRequestTimeout} from "./requestDeadline";

type CleanupReply={ok:boolean;status:string;removed?:string[];skipped?:string[]};
const cleanupCancelledSteamGame=callable<[number],CleanupReply>("cleanup_cancelled_steam_game");

type PageTab="activity"|"your-stuff"|"community"|"game-info";
const PAGE_TABS:readonly {id:PageTab;label:string}[]=[
  {id:"activity",label:"Activity"},
  {id:"your-stuff",label:"Your Stuff"},
  {id:"community",label:"Community"},
  {id:"game-info",label:"Game Info"},
];

const hours=(v:number|null|undefined)=>
  typeof v==="number"&&Number.isFinite(v)&&v>0?
    v.toFixed(1)+" hours":"—";

function handleDirection(value:GamepadButton|undefined):FocusDirection|null{
  switch(value){
    case GamepadButton.DIR_LEFT:return "left";
    case GamepadButton.DIR_RIGHT:return "right";
    case GamepadButton.DIR_UP:return "up";
    case GamepadButton.DIR_DOWN:return "down";
    default:return null;
  }
}

function formatSpace(bytes:number|null):string{
  return bytes!==null&&Number.isFinite(bytes)&&bytes>0?
    (bytes/(1024**3)).toFixed(1)+" GB":"—";
}

function DetailPoster({game}:{game:LibraryGame}){
  const [index,setIndex]=useState(0);
  const [remote,setRemote]=useState<string|null>(null);
  const [checked,setChecked]=useState(false);
  const candidates=[...posterCandidates(game),...(remote?[remote]:[])];
  const src=candidates[index];
  useEffect(()=>{setIndex(0);setRemote(null);setChecked(false);},[game.id]);
  useEffect(()=>{
    if(game.nonSteam||checked||index<candidates.length)return;
    let mounted=true;
    void getMissingSteamArt(game).then(art=>{
      if(mounted){setRemote(art.cover);setChecked(true);}
    }).catch(()=>{if(mounted)setChecked(true);});
    return ()=>{mounted=false;};
  },[game.id,game.title,game.nonSteam,index,candidates.length,checked]);
  return <div className="gl-details-poster">
    {src?<img src={src} alt={game.title+" cover"} key={src}
      onError={()=>setIndex(n=>n+1)}/>:
      <div className="gl-details-poster-fallback"><MdVideogameAsset/><span>{game.title}</span></div>}
  </div>;
}

/** Steam's own installation wizard remains authoritative, including the
 * installation location and final confirmation. Never fake download progress.
 */
export function SteamGameDetails({game,onBack,onNativeDetails,onFocusRail,onOpenControllerSettings,onOpenHltb,onOpenStore}:{
  game:LibraryGame;
  onBack:()=>void;
  onNativeDetails:()=>void;
  onFocusRail:()=>void;
  onOpenControllerSettings:()=>void;
  onOpenHltb:(url:string)=>void;
  onOpenStore:()=>void;
}){
  const [tab,setTab]=useState<PageTab>("activity");
  const [hltb,setHltb]=useState<HltbReply|null>(null);
  const [required,setRequired]=useState<number|null>(()=>
    typeof game.requiredBytes==="number"&&game.requiredBytes>0?
      game.requiredBytes:readNativeRequiredInstallBytes(game.id));
  const [installState,setInstallState]=useState(game.installed);
  const [wizardPending,setWizardPending]=useState(false);
  const [downloadBusy,setDownloadBusy]=useState(false);
  const [cancelRequested,setCancelRequested]=useState(false);
  const [awaitingSteamUninstall,setAwaitingSteamUninstall]=useState(false);
  const [cancelFeedback,setCancelFeedback]=useState<string|null>(null);
  const nativeDownload=useSteamGameDownload(game.id,game.nonSteam);
  const actualInstalled=nativeDownload.installed??installState;
  const installMode=resolveInstallMode(
    actualInstalled,nativeDownload.displayStatus,nativeDownload.transfer,wizardPending
  );
  const primaryLabel=installMode==="transfer"&&nativeDownload.transfer?
    transferLabel(nativeDownload.transfer):
    installMode==="preparing"?"Preparing...":
    gameActionLabel({...game,installed:installMode==="play"});
  const [playtime,setPlaytime]=useState(game.playtimeMinutes);
  const [lastPlayed,setLastPlayed]=useState(game.lastPlayed);
  const rootRef=useRef<HTMLElement>(null);
  const statusRef=useRef<HTMLDivElement>(null);
  const focusRefs=useRef<Record<string,HTMLDivElement|null>>({});
  const backRef=useRef<HTMLDivElement>(null);
  const userChangedFocus=useRef(false);
  const currentDownloadRef=useRef(nativeDownload);
  currentDownloadRef.current=nativeDownload;
  const busyRef=useRef(false);
  const cancelRequestedRef=useRef(false);
  const cleanupStartedRef=useRef(false);

  useEffect(()=>{
    userChangedFocus.current=false;
    setTab("activity");
    setHltb(null);
    setRequired(typeof game.requiredBytes==="number"&&game.requiredBytes>0?
      game.requiredBytes:readNativeRequiredInstallBytes(game.id));
    setInstallState(game.installed);
    setWizardPending(false);
    setDownloadBusy(false);
    busyRef.current=false;
    cancelRequestedRef.current=false;
    cleanupStartedRef.current=false;
    setCancelRequested(false);
    setAwaitingSteamUninstall(false);
    setCancelFeedback(null);
    setPlaytime(game.playtimeMinutes);
    setLastPlayed(game.lastPlayed);
    // Native Game Mode focus is separate from document.activeElement.
    // A DOM-only .focus() leaves Steam's controller attached to the old
    // Library card, so D-pad/B navigate the hidden grid instead of this page.
    const focusBack=()=>{
      const target=backRef.current;
      if(target)focusNativeMenuControl(target,GamepadButton.DIR_DOWN);
    };
    const frame=window.requestAnimationFrame(focusBack);
    // Steam may register the freshly mounted Focusable nodes after the first
    // frame. Re-take native focus unless the user already focused another
    // control on this page.
    const retry=window.setTimeout(()=>{
      // Even if document.activeElement is our Back button, Steam's *native*
      // gamepad focus may still point to the old Library grid. Retry BTakeFocus
      // after the new Focusable tree is registered, unless a user moved it.
      if(!userChangedFocus.current)focusBack();
    },140);
    return ()=>{
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  },[game.id]);

  // Reuse the existing read-only per-AppID HLTB service and 7-day cache.
  // Only fetch this one visible game, never all library titles.
  useEffect(()=>{
    let active=true;
    const timer=window.setTimeout(()=>{
      void requestHltbTimes(game.id,game.title).then(result=>{
        if(active)setHltb(result);
      }).catch(()=>{if(active)setHltb({status:"error",reason:"Unavailable"});});
    },200);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[game.id,game.title]);

  useEffect(()=>{
    if(game.nonSteam||game.installed)return;
    let active=true;
    const saved=readNativeRequiredInstallBytes(game.id);
    if(saved!==null)setRequired(saved);
    void requestNativeRequiredInstallBytes(game.id).then(bytes=>{
      if(active&&bytes!==null&&bytes>0)setRequired(bytes);
    }).catch(()=>{});
    return ()=>{active=false;};
  },[game.id,game.nonSteam,game.installed]);

  // Install status and playtime can change while the page is open. The
  // existing Steam library store is authoritative; never fake a progress %.
  useEffect(()=>{
    const refresh=()=>{
      const current=getLibraryGames().find(item=>item.id===game.id);
      if(!current)return;
      setInstallState(v=>v===current.installed?v:current.installed);
      setPlaytime(v=>v===current.playtimeMinutes?v:current.playtimeMinutes);
      setLastPlayed(v=>v===current.lastPlayed?v:current.lastPlayed);
    };
    const timer=window.setInterval(refresh,5000);
    return ()=>window.clearInterval(timer);
  },[game.id]);

  // Steam marks a new install "installed" before all of its content is
  // available. Keep "Preparing" during the wizard -> queue handoff, but
  // never leave the UI stuck if the user cancels Steam's install dialog.
  useEffect(()=>{
    if(!wizardPending)return;
    if(nativeDownload.transfer||nativeDownload.displayStatus===9){
      setWizardPending(false);
      return;
    }
    // A ReadyToLaunch flag alone is not enough: Steam often marks an app
    // installed while its download is still starting. Never show Play only
    // because a timer has elapsed without finding a download item.
    return;

  },[wizardPending,nativeDownload.transfer,nativeDownload.displayStatus]);

  const focusId=(id:string)=>focusRefs.current[id]?.focus();
  const focusRef=(id:string)=>(el:HTMLDivElement|null)=>{
    focusRefs.current[id]=el;
    if(id==="back")backRef.current=el;
  };
  const onMove=(id:string)=>(event:GamepadEvent)=>{
    const direction=handleDirection(event.detail?.button);
    if(!direction)return;
    const current=focusRefs.current[id];
    const next=rootRef.current&&current?
      nextGamepadControl(rootRef.current,current,direction,
        ".gl-game-details .gl-details-focus"):null;
    // Always consume so a still-mounted background route never receives the
    // same gamepad press. Take the Steam nav-tree focus, not DOM focus.
    event.preventDefault();event.stopPropagation();
    if(next)focusNativeMenuControl(next,event.detail!.button!);
    else if(direction==="left")onFocusRail();
  };
  const onAction=(id:string)=>({
    ref:focusRef(id),
    className:"gl-details-focus",
    focusClassName:"gl-focused",
    noFocusRing:true as const,
    onButtonDown:onMove(id),
    onCancelButton:onBack,
    onGamepadFocus:()=>{if(id!=="back")userChangedFocus.current=true;},
    onCancelActionDescription:"Back to previous Game Library screen",
  });

  const hltbData=hltb?.status==="ok"?hltb.data:null;
  const hltbLink=hltbData?.url&&
    /^https:\/\/howlongtobeat\.com\/game\/[0-9]+$/.test(hltbData.url)?
    hltbData.url:null;
  const isNativeSteam=!game.nonSteam&&game.id>0&&game.id<0x80000000;
  // Exactly the same native Steam game context menu used by Start/Menu on
  // Library cards. Keep both the gear's A action and physical Start on this
  // one handler so they never diverge.
  const openGameOptions=()=>{
    const anchor=focusRefs.current["settings"]??document.activeElement;
    if(showNativeGameOptions(game.id,anchor))return;
    toaster.toast({
      title:"Steam game options",
      body:"Steam's native game menu is unavailable here. Open Steam Details to access its options."
    });
  };
  // Dashboard owns native route handoff so it can restore this React
  // Game Details screen when Steam's B returns to the previous route.
  const openController=onOpenControllerSettings;
  const action=()=>{
    // A partly-installed game must never be sent to RunGame or Steam Details.
    // Show its REAL Steam queue position and progress until ReadyToLaunch.
    if(installMode==="transfer"){
      toaster.toast({
        title:"Steam download",
        body:"Steam is managing this transfer. Progress is shown below."
      });
      return;
    }
    if(installMode==="preparing")return;
    if(installMode==="play"){
      play({...game,installed:true});
      return;
    }
    // Open Steam's real location-picker without starting a second download.
    const result=openSteamInstallWizard(game.id,game.nonSteam);
    if(result.opened){setWizardPending(true);return;}
    const message=result.reason==="non-steam"
      ?"Non-Steam games must be installed through their original launcher."
      :result.reason==="unavailable"
        ?"Steam's installation wizard is not available in this Game Mode session."
        :"Steam could not open the installation wizard for this game.";
    toaster.toast({title:"Install unavailable",body:message});
  };
  // The native Uninstall dialog is a separate, user-confirmed Steam action.
  // Never assume that opening it means the user selected Uninstall.
  useEffect(()=>{
    if(!cancelRequested)return;
    if(!nativeDownload.transfer&&!awaitingSteamUninstall){
      cancelRequestedRef.current=false;
      setCancelRequested(false);
      return;
    }
    const timer=window.setTimeout(()=>{
      cancelRequestedRef.current=false;
      setCancelRequested(false);
      setAwaitingSteamUninstall(false);
      setCancelFeedback("Steam has not confirmed removal. Check Steam Downloads or try Cancel again.");
    },25000);
    return ()=>window.clearTimeout(timer);
  },[cancelRequested,Boolean(nativeDownload.transfer),awaitingSteamUninstall,game.id]);

  // Only start Proton-prefix cleanup once the native Steam *uninstall*
  // visibly completes. A dismissed uninstall dialog never authorizes cleanup.
  useEffect(()=>{
    if(!awaitingSteamUninstall||nativeDownload.transfer||
       (nativeDownload.installed!==false&&nativeDownload.displayStatus!==9))
      return;
    const timer=window.setTimeout(()=>{
      if(cleanupStartedRef.current)return;
      cleanupStartedRef.current=true;
      setAwaitingSteamUninstall(false);
      cancelRequestedRef.current=false;
      setCancelRequested(false);
      setCancelFeedback("Steam no longer reports this installation. Checking its Proton data...");
      inspectPrefixCleanup(game.id);
    },3500);
    return ()=>window.clearTimeout(timer);
  },[awaitingSteamUninstall,Boolean(nativeDownload.transfer),
     nativeDownload.installed,nativeDownload.displayStatus,game.id]);

  const downloadControls=()=>(
    window as unknown as {SteamClient?:{Downloads?:{
      PauseAppUpdate?:(id:number,clientId?:string)=>unknown;
      ResumeAppUpdate?:(id:number,clientId?:string)=>unknown;
      RemoveFromDownloadList?:(id:number,clientId?:string)=>unknown;
    };Installs?:{OpenUninstallWizard?:(ids:number[],dontPrompt:boolean)=>unknown}}}
  ).SteamClient;
  const toggleDownload=async()=>{
    const current=currentDownloadRef.current;
    if(busyRef.current||!current.transfer)return;
    const action=current.transfer.phase==="paused"||
      current.transfer.phase==="queued"?"resume":"pause";
    const client=downloadControls();
    busyRef.current=true;
    setDownloadBusy(true);
    try{
      const result=await nativeDownloadAction(action,game.id,game.nonSteam,
        current.downloadNature,client?.Downloads,client?.Installs);
      if(!result.ok)toaster.toast({title:"Steam download",
        body:"Steam could not "+action+" this download ("+result.reason+")."});
    }finally{busyRef.current=false;setDownloadBusy(false);}
  };
  const inspectPrefixCleanup=(appid:number)=>{
    // Only invoked after Steam has reported this app absent, not merely
    // because the native uninstall confirmation was opened.
    void withRequestTimeout(cleanupCancelledSteamGame(appid),38000)
      .then(cleanup=>{
        if(cleanup.ok){
          setCancelFeedback("Steam removed this installation. The game's Proton prefix and shader cache were cleaned where safe.");
        }else{
          setCancelFeedback(cleanup.status==="steam-busy"?
            "Steam still has installation data on disk; Proton files were preserved. Check Steam Storage.":
            "Steam removal was requested, but Proton cleanup is not confirmed ("+cleanup.status+").");
        }
      }).catch(error=>{
        console.warn("[game-library] Steam cancellation cleanup response unavailable",error);
        setCancelFeedback("Proton cleanup could not be verified. Some game data may remain on disk.");
      });
  };
  const cancelDownload=async(expectedNature:typeof nativeDownload.downloadNature)=>{
    const current=currentDownloadRef.current;
    if(busyRef.current||cancelRequestedRef.current||
       !current.transfer||current.downloadNature!==expectedNature){
      setCancelFeedback("Download state changed. Open Cancel again to review this game.");
      return;
    }
    const client=downloadControls();
    busyRef.current=true;
    setDownloadBusy(true);
    setCancelFeedback(null);
    try{
      const result=await nativeDownloadAction("cancel",game.id,game.nonSteam,
        current.downloadNature,client?.Downloads,client?.Installs);
      if(!result.ok){
        setCancelFeedback("Steam could not open the removal action ("+result.reason+").");
        return;
      }
      cancelRequestedRef.current=true;
      setCancelRequested(true);
      if(result.uninstallRequested){
        setAwaitingSteamUninstall(true);
        setCancelFeedback("Steam Uninstall confirmation requested. Confirm removal in Steam; declining keeps the game and its Proton data.");
      }else{
        setCancelFeedback("Requested removal from Steam's download queue. Existing game files and Proton data are preserved.");
      }
    }catch(error){
      console.warn("[game-library] Steam cancel action failed",error);
      setCancelFeedback("Steam could not accept the cancellation request.");
    }finally{
      busyRef.current=false;
      setDownloadBusy(false);
    }
  };
  const confirmCancelDownload=()=>{
    if(downloadBusy||busyRef.current||cancelRequestedRef.current||!nativeDownload.transfer)return;
    if(nativeDownload.downloadNature==="initial"){
      // Same native uninstall entry used in Steam's context menu, including
      // Steam's OWN confirmation; no prior RemoveFromDownloadList.
      void cancelDownload("initial");
      return;
    }
    showModal(<ConfirmModal
      strTitle="Remove Steam download from queue?"
      strDescription="This game is installed or its install type is unknown. Only its pending transfer is removed; the game, Proton prefix and local saves are kept."
      strOKButtonText="Remove from queue"
      strCancelButtonText="Keep downloading"
      onOK={()=>{void cancelDownload(nativeDownload.downloadNature);}}
    />);
  };

  const showCommunity=()=>{
    if(isNativeSteam)Navigation.NavigateToSteamWeb(
      "https://steamcommunity.com/app/"+game.id
    );
    else onNativeDetails();
  };

  return <section ref={rootRef} className="gl-game-details"
      aria-label={game.title+" details"}>
    <div className="gl-details-scroller">
      <div className="gl-details-hero" aria-hidden="true">
        <HeroBackdrop key={"details-hero-"+game.id} game={game}/>
        <div className="gl-details-hero-shade"/>
        <div className="gl-details-hero-logo">
          <GameLogo key={"details-logo-"+game.id} game={game}/>
        </div>
      </div>

      <header className="gl-details-top">
        <Focusable {...onAction("back")}
            className="gl-details-focus gl-details-back"
            onActivate={onBack}
            onOKActionDescription="Return to previous screen" >
          <MdArrowBack aria-hidden="true"/> Back to Library
        </Focusable>
        <SystemStatusBar statusRef={statusRef} onStatusButtonDown={event=>{
          if(event.detail?.button===GamepadButton.DIR_DOWN){
            event.preventDefault();event.stopPropagation();focusId("back");
          }
        }}/>
      </header>

      <div className="gl-details-intro">
        <DetailPoster key={"cover-"+game.id} game={game}/>
        <div className="gl-details-intro-copy">
          <div className="gl-details-source">
            <span><MdStorefront/> {game.nonSteam?"Non-Steam":"STEAM"}</span>
            <ProtonDBBadge game={game}/>
          </div>
          <h1>{game.title}</h1>
          <div className="gl-details-ownership">
            <MdCheckCircle/> {game.nonSteam?"Steam shortcut":"Owned on Steam"}
            <span className="gl-details-dot">·</span>
            <span>{installMode==="transfer"&&nativeDownload.transfer?
              transferLabel(nativeDownload.transfer):
              installMode==="preparing"?"Preparing installation":
              installMode==="play"?"Installed":"Not installed"}</span>
          </div>

          <div className="gl-details-hltb" aria-label="HowLongToBeat times and your playtime">
            <div className="gl-details-hltb-cell">
              <strong>{hours(hltbData?.main)}</strong><span>MAIN STORY</span>
            </div>
            <div className="gl-details-hltb-cell">
              <strong>{hours(hltbData?.extras)}</strong><span>MAIN + EXTRAS</span>
            </div>
            <div className="gl-details-hltb-cell">
              <strong>{hours(hltbData?.completionist)}</strong><span>COMPLETIONIST</span>
            </div>
            <div className="gl-details-hltb-cell">
              <strong>{playtimeLabel(playtime)}</strong><span>YOUR PLAYTIME</span>
            </div>
          </div>
          <div className="gl-details-action-row">
            <Focusable {...onAction("primary")}
                className="gl-details-focus gl-details-primary"
                onOKActionDescription={installMode==="play"?"Play game":
                  installMode==="transfer"?"Show Steam download status":
                  installMode==="preparing"?"Waiting for Steam installer":
                  "Open Steam installation wizard"}
                onActivate={action}>
              {installMode==="play"?<MdPlayArrow/>:<MdDownload/>}
              <strong>{primaryLabel}</strong>
            </Focusable>
            <div className="gl-details-space">
              <span>{installMode==="play"?"PLAYED":"SPACE REQUIRED"}</span>
              <strong>{installMode==="play"?playtimeLabel(playtime):formatSpace(required)}</strong>
            </div>
            {hltbLink&&<Focusable {...onAction("hltb")}
                className="gl-details-focus gl-details-secondary"
                onOKActionDescription="Open real HowLongToBeat page"
                onActivate={()=>onOpenHltb(hltbLink)}>
              HLTB details <MdOpenInNew/>
            </Focusable>}
            <Focusable {...onAction("steam")}
                className="gl-details-focus gl-details-secondary"
                onOKActionDescription={isNativeSteam?"Open Steam Store page":"Open Steam game details"}
                onActivate={isNativeSteam?onOpenStore:onNativeDetails}>
              {isNativeSteam?"Steam Store":"Steam Details"} <MdOpenInNew/>
            </Focusable>
            <Focusable {...onAction("controller")}
                className="gl-details-focus gl-details-icon-button"
                title="Controller settings"
                onOKActionDescription="Controller settings"
                onActivate={openController}><MdSportsEsports/></Focusable>
            <Focusable {...onAction("settings")}
                className="gl-details-focus gl-details-icon-button"
                title="Steam game options (same as Start)"
                onOKActionDescription="Steam game context menu"
                onMenuButton={(e:GamepadEvent)=>{
                  e.preventDefault();e.stopPropagation();
                  if(!e.detail?.is_repeat)openGameOptions();
                }}
                onMenuActionDescription="Game options"
                onActivate={openGameOptions}><MdSettings/></Focusable>
          </div>
          {installMode==="transfer"&&nativeDownload.transfer&&
            <div className="gl-details-download" aria-label="Steam installation progress">
              <div className="gl-details-download-header">
                <div className="gl-details-download-caption">
                  <span>{transferLabel(nativeDownload.transfer)}</span>
                  <strong>{nativeDownload.transfer.percent===null?
                    "Waiting for Steam":nativeDownload.transfer.percent+"%"}</strong>
                </div>
              </div>
              <div className="gl-details-download-main">
                <div className="gl-details-download-track" role="progressbar"
                    aria-label="Steam download progress"
                    aria-valuemin={0} aria-valuemax={100}
                    aria-valuenow={nativeDownload.transfer.percent??undefined}>
                  <div className="gl-details-download-fill"
                    style={{width:(nativeDownload.transfer.percent??0)+"%"}}/>
                </div>
                <div className="gl-details-download-controls">
                  <Focusable {...onAction("download-toggle")}
                      className="gl-details-focus gl-details-download-control"
                      onOKActionDescription={nativeDownload.transfer.phase==="paused"||
                        nativeDownload.transfer.phase==="queued"?"Resume download":"Pause download"}
                      onActivate={()=>{void toggleDownload();}}>
                    {nativeDownload.transfer.phase==="paused"||
                      nativeDownload.transfer.phase==="queued"?
                      <MdPlayArrow/>:<MdPause/>}
                    <span>{nativeDownload.transfer.phase==="paused"||
                      nativeDownload.transfer.phase==="queued"?"Resume":"Pause"}</span>
                  </Focusable>
                  <Focusable {...onAction("download-cancel")}
                      className="gl-details-focus gl-details-download-control gl-details-download-cancel"
                      onOKActionDescription="Cancel download and remove its new-install data"
                      onActivate={confirmCancelDownload}>
                    <MdDeleteOutline/><span>{downloadBusy?"Sending...":cancelRequested?"Cancel requested":"Cancel download"}</span>
                  </Focusable>
                </div>
              </div>
              <div className="gl-details-download-metrics" aria-label="Steam download size and time">
                {nativeDownload.metrics.totalBytes!==null&&
                  nativeDownload.metrics.downloadedBytes!==null&&<>
                    <span><b>Downloaded</b> {formatDownloadBytes(nativeDownload.metrics.downloadedBytes)}
                      {" / "}{formatDownloadBytes(nativeDownload.metrics.totalBytes)}</span>
                    <span><b>Remaining</b> {formatDownloadBytes(Math.max(0,
                      nativeDownload.metrics.totalBytes-nativeDownload.metrics.downloadedBytes))}</span>
                  </>}
                <span><b>Time left</b> {nativeDownload.transfer.phase==="paused"||
                  nativeDownload.transfer.phase==="queued"?"—":
                  formatDownloadTime(nativeDownload.metrics.remainingSeconds)}</span>
              </div>
            </div>}
          {installMode==="preparing"&&
            <div className="gl-details-install-help">
              Checking Steam download status. If progress does not appear, open Game Info for diagnostics.
            </div>}
          {installMode==="install"&&
            <div className="gl-details-install-help">Install opens Steam's drive selection and confirmation dialog.</div>}
          {cancelFeedback&&
            <div className="gl-details-download-feedback" role="status">
              {cancelFeedback}
            </div>}
        </div>
      </div>

      <nav className="gl-details-tabs" aria-label="Game details sections">
        {PAGE_TABS.map(item=><Focusable key={item.id} {...onAction("tab-"+item.id)}
            className={"gl-details-focus gl-details-tab"+
              (tab===item.id?" gl-details-tab-active":"")}
            aria-label={item.label}
            onOKActionDescription={item.label}
            onActivate={()=>setTab(item.id)}>
          {item.label}
          {item.id==="game-info"&&<MdCheckCircle aria-hidden="true"/>}
        </Focusable>)}
      </nav>
      <div className="gl-details-panel" aria-live="polite">
        {tab==="activity"?<>
          <h2>Activity</h2>
          <div className="gl-details-activity-grid">
            <div className="gl-details-stat"><MdAccessTime/><div>
              <small>LAST PLAYED</small><strong>{lastPlayedLabel(lastPlayed)}</strong>
            </div></div>
            <div className="gl-details-stat"><MdSportsEsports/><div>
              <small>PLAYTIME</small><strong>{playtimeLabel(playtime)}</strong>
            </div></div>
          </div>
          <div className="gl-details-context">
            <div><strong>Steam Activity</strong>
              <p>News, posts and friends' activity remain available in Steam.</p></div>
            <Focusable {...onAction("steam-activity")}
                className="gl-details-focus gl-details-secondary"
                onOKActionDescription="Open Steam game activity"
                onActivate={onNativeDetails}>View in Steam <MdOpenInNew/></Focusable>
          </div>
        </>:tab==="your-stuff"?<>
          <h2>Your Stuff</h2>
          <div className="gl-details-stuff-row">
            <AchievementsCard game={game}/>
            <div className="gl-details-stat"><MdAccessTime/><div>
              <small>YOUR PLAYTIME</small><strong>{playtimeLabel(playtime)}</strong>
            </div></div>
          </div>
        </>:tab==="community"?<>
          <h2>Community</h2>
          <div className="gl-details-context">
            <div><strong>Steam Community</strong>
              <p>See the game's community, discussions and player content.</p></div>
            <Focusable {...onAction("community")}
                className="gl-details-focus gl-details-secondary"
                onOKActionDescription="Open Steam community"
                onActivate={showCommunity}>Open community <MdOpenInNew/></Focusable>
          </div>
        </>:<>
          <h2>Game Info</h2>
          <div className="gl-details-info-grid">
            <div><small>STORE</small><strong>{game.nonSteam?"Non-Steam shortcut":"Steam"}</strong></div>
            <div><small>STATUS</small><strong>{installMode==="transfer"&&nativeDownload.transfer?
              transferLabel(nativeDownload.transfer):
              installMode==="preparing"?"Checking download":
              installMode==="play"?"Ready to play":"Not installed"}</strong></div>
            <div><small>LAST PLAYED</small><strong>{lastPlayedLabel(lastPlayed)}</strong></div>
            <div><small>PLAYTIME</small><strong>{playtimeLabel(playtime)}</strong></div>
            {game.releaseDate!==undefined&&game.releaseDate>0&&
              <div><small>RELEASE YEAR</small><strong>{new Date(game.releaseDate*1000).getFullYear()}</strong></div>}
          </div>
          {!game.nonSteam&&
            <div className="gl-details-download-diagnostics" aria-label="Steam download diagnostics">
              Steam AppID: {game.id} · Status: {nativeDownload.displayStatus??"unknown"}
              {" · "}Installed: {nativeDownload.installed===null?"unknown":String(nativeDownload.installed)}
              {" · "}Queue event: {nativeDownload.debug.items?"yes":"no"}
              {" · "}Progress event: {nativeDownload.debug.overview?"yes":"no"}
              {" · "}Native store: {nativeDownload.debug.store?"found":"missing"}
              {" · "}Local queue item: {nativeDownload.debug.queue?"found":"missing"}
              {" · "}Type: {nativeDownload.downloadNature}
              {" · "}Transfer: {nativeDownload.transfer?
                transferLabel(nativeDownload.transfer)+" "+
                (nativeDownload.transfer.percent===null?"unknown %":nativeDownload.transfer.percent+"%"):"not detected"}
            </div>}
        </>}
      </div>
      <footer className="gl-details-footer">A Select · B Back · D-pad / Left stick Navigate · Steam controls remain available</footer>
    </div>
  </section>;
}
