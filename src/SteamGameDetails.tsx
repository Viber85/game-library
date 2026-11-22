import {useEffect,useRef,useState} from "react";
import {Focusable,GamepadButton,Navigation,type GamepadEvent} from "@decky/ui";
import {
  MdArrowBack,MdCheckCircle,MdDownload,MdInfo,MdOpenInNew,MdPlayArrow,
  MdSettings,MdSportsEsports,MdStorefront,MdAccessTime,MdVideogameAsset
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
import {openSteamControllerEditor} from "./steamControllerEditor";
import {showNativeGameOptions} from "./nativeGameContextMenu";
import {toaster} from "@decky/api";

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

/** Steam's own game installation wizard remains authoritative. We never
 * claim a download began merely because the user selected Install.
 */
export function SteamGameDetails({game,onBack,onNativeDetails,onFocusRail}:{
  game:LibraryGame;
  onBack:()=>void;
  onNativeDetails:()=>void;
  onFocusRail:()=>void;
}){
  const [tab,setTab]=useState<PageTab>("activity");
  const [hltb,setHltb]=useState<HltbReply|null>(null);
  const [required,setRequired]=useState<number|null>(()=>
    typeof game.requiredBytes==="number"&&game.requiredBytes>0?
      game.requiredBytes:readNativeRequiredInstallBytes(game.id));
  const [installState,setInstallState]=useState(game.installed);
  const [playtime,setPlaytime]=useState(game.playtimeMinutes);
  const [lastPlayed,setLastPlayed]=useState(game.lastPlayed);
  const rootRef=useRef<HTMLElement>(null);
  const statusRef=useRef<HTMLDivElement>(null);
  const focusRefs=useRef<Record<string,HTMLDivElement|null>>({});
  const backRef=useRef<HTMLDivElement>(null);
  const userChangedFocus=useRef(false);

  useEffect(()=>{
    userChangedFocus.current=false;
    setTab("activity");
    setHltb(null);
    setRequired(typeof game.requiredBytes==="number"&&game.requiredBytes>0?
      game.requiredBytes:readNativeRequiredInstallBytes(game.id));
    setInstallState(game.installed);
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
    else if(direction==="left"&&id==="back")onFocusRail();
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
  const openController=()=>{
    void openSteamControllerEditor(game.id).then(opened=>{
      if(opened)return;
      // A verified Steam Input bridge is not always available, especially
      // on uninstalled games. The same native Start menu is the safe
      // fallback: never misdirect the user into ordinary game Properties.
      const anchor=focusRefs.current["controller"]??document.activeElement;
      const menuOpened=showNativeGameOptions(game.id,anchor);
      toaster.toast({
        title:"Steam controller layout",
        body:menuOpened
          ?"Steam Input could not be opened directly. Use the game's native menu to find Controller Layout."
          :"Steam Input is unavailable here. Open original Steam Details and select its controller icon."
      });
    }).catch(error=>{
      console.warn("[game-library] Steam controller editor unavailable",error);
      const anchor=focusRefs.current["controller"]??document.activeElement;
      const menuOpened=showNativeGameOptions(game.id,anchor);
      toaster.toast({title:"Controller layout unavailable",
        body:menuOpened
          ?"Use the opened Steam game menu for Controller Layout."
          :"Open original Steam Details and select the controller icon."});
    });
  };
  const action=()=>{
    if(installState)play({...game,installed:true});
    else onNativeDetails();
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
            <span>{installState?"Installed":"Not installed"}</span>
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
                onOKActionDescription={installState?"Play game":"Open Steam installation wizard"}
                onActivate={action}>
              {installState?<MdPlayArrow/>:<MdDownload/>}
              <strong>{gameActionLabel({...game,installed:installState})}</strong>
            </Focusable>
            <div className="gl-details-space">
              <span>{installState?"PLAYED":"SPACE REQUIRED"}</span>
              <strong>{installState?playtimeLabel(playtime):formatSpace(required)}</strong>
            </div>
            {hltbLink&&<Focusable {...onAction("hltb")}
                className="gl-details-focus gl-details-secondary"
                onOKActionDescription="Open real HowLongToBeat page"
                onActivate={()=>Navigation.NavigateToSteamWeb(hltbLink)}>
              HLTB details <MdOpenInNew/>
            </Focusable>}
            <Focusable {...onAction("steam")}
                className="gl-details-focus gl-details-secondary"
                onOKActionDescription="Original Steam game details"
                onActivate={onNativeDetails}>
              Steam Details <MdOpenInNew/>
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
          {!installState&&
            <div className="gl-details-install-help">Install opens Steam's original installer to choose a drive and confirm the download.</div>}
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
            <div><small>STATUS</small><strong>{installState?"Installed":"Not installed"}</strong></div>
            <div><small>LAST PLAYED</small><strong>{lastPlayedLabel(lastPlayed)}</strong></div>
            <div><small>PLAYTIME</small><strong>{playtimeLabel(playtime)}</strong></div>
            {game.releaseDate!==undefined&&game.releaseDate>0&&
              <div><small>RELEASE YEAR</small><strong>{new Date(game.releaseDate*1000).getFullYear()}</strong></div>}
          </div>
          <Focusable {...onAction("original-info")}
              className="gl-details-focus gl-details-secondary"
              onOKActionDescription="Original Steam details and install options"
              onActivate={onNativeDetails}><MdInfo/> Original Steam Details <MdOpenInNew/></Focusable>
        </>}
      </div>
      <footer className="gl-details-footer">A Select · B Back · D-pad / Left stick Navigate · Steam controls remain available</footer>
    </div>
  </section>;
}
