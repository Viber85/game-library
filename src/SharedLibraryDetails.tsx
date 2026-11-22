import {useEffect,useRef,useState,type ReactNode,type Ref} from "react";
import {Focusable,GamepadButton,type GamepadEvent} from "@decky/ui";
import {
  MdAccessTime,MdArrowBack,MdCheckCircle,MdDownload,
  MdInfoOutline,MdShield,MdStorefront,MdSportsEsports
} from "react-icons/md";
import type {UnifiedLibraryGame} from "./unifiedLibraryGame";
import {requestGogHltbTimes,requestProtonRating,type HltbReply,type ProtonRating} from "./metadataRequests";
import {SystemStatusBar} from "./SystemStatusBar";
import {focusNativeMenuControl} from "./nativeMenuGamepad";
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
type DetailTab="activity"|"your-stuff"|"community"|"game-info";
const TABS:readonly {id:DetailTab;label:string}[]=[
  {id:"activity",label:"Activity"},
  {id:"your-stuff",label:"Your Stuff"},
  {id:"community",label:"Community"},
  {id:"game-info",label:"Game Info"}
];
const hours=(value:number|null|undefined)=>
  typeof value==="number"&&Number.isFinite(value)&&value>0?
    value.toFixed(1)+" hours":"—";

export function SharedLibraryDetails({
  game,cover,onBack,backRef,actions,gogAccountId="",
}:{
  game:UnifiedLibraryGame;
  cover:ReactNode;
  onBack:()=>void;
  backRef?:Ref<HTMLDivElement>;
  actions?:ReactNode;
  gogAccountId?:string;
}){
  const [tab,setTab]=useState<DetailTab>("activity");
  const [hltb,setHltb]=useState<HltbReply|null>(null);
  const [proton,setProton]=useState<ProtonRating|null>(null);
  const [nativeHeroFailed,setNativeHeroFailed]=useState(false);
  const [remoteHero,setRemoteHero]=useState<string|null>(null);
  const [remoteHeroFailed,setRemoteHeroFailed]=useState(false);
  const [artworkRevision,setArtworkRevision]=useState(0);
  const statusRef=useRef<HTMLDivElement>(null);
  const internalBackRef=useRef<HTMLDivElement|null>(null);
  const store=STORE_LABELS[game.store];
  const status=game.availability==="installed"?"Installed":
    game.availability==="not-installed"?"Not installed":"Owned";
  useEffect(()=>{
    setTab("activity");setHltb(null);setProton(null);
    setNativeHeroFailed(false);setRemoteHero(null);setRemoteHeroFailed(false);
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

  return <section className="gl-game-details gl-gog-steam-details gl-unified-details"
      aria-label={game.title+" details"}>
    <div className="gl-details-scroller">
      <div className="gl-details-hero" aria-hidden="true">
        {hero&&<img className="gl-hero" src={hero} alt=""
          onError={()=>{
            if(hero===nativeHero)setNativeHeroFailed(true);
            else setRemoteHeroFailed(true);
          }}/>} 
        <div className="gl-details-hero-shade"/>
      </div>
      <header className="gl-details-top">
        <Focusable ref={node=>{
            internalBackRef.current=node;
            if(typeof backRef==="function")backRef(node);
            else if(backRef&&"current" in backRef)backRef.current=node;
          }} className="gl-details-focus gl-details-back"
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
        <SystemStatusBar statusRef={statusRef} onStatusButtonDown={event=>{
          if(event.detail?.button===GamepadButton.DIR_DOWN){
            stop(event);
            if(internalBackRef.current)
              focusNativeMenuControl(internalBackRef.current,GamepadButton.DIR_DOWN);
          }
        }}/>
      </header>

      <div className="gl-details-intro">
        <div className="gl-details-poster gl-details-gog-poster">{cover}</div>
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
          <div className="gl-details-hltb" aria-label="HowLongToBeat estimates and local playtime">
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
          <div className="gl-details-action-row">
            {actions ? <div className="gl-actions">{actions}</div>:
              <div className="gl-details-primary gl-gog-install-pending"
                  aria-disabled="true" title="GOG downloader integration in progress">
                <MdDownload/><strong>Install</strong>
              </div>}
            <div className="gl-details-space">
              <span>INSTALL LOCATION</span>
              <strong>Not selected</strong>
            </div>
          </div>
          {!actions&&<div className="gl-details-install-help">
            GOG installation requires a separate gogdl downloader, a drive picker
            and Proton setup. These actions are not connected yet.
          </div>}
        </div>
      </div>

      <nav className="gl-details-tabs" aria-label="Game details sections">
        {TABS.map(item=><Focusable key={item.id}
            className={"gl-details-focus gl-details-tab"+
              (tab===item.id?" gl-details-tab-active":"")}
            focusClassName="gl-focused" noFocusRing
            onActivate={()=>setTab(item.id)} onCancelButton={onBack}
            onOKActionDescription={item.label}>
          {item.label}
          {item.id==="game-info"&&<MdCheckCircle aria-hidden="true"/>}
        </Focusable>)}
      </nav>
      <div className="gl-details-panel" aria-live="polite">
        {tab==="activity"?<>
          <h2>Activity</h2>
          <div className="gl-details-activity-grid">
            <div className="gl-details-stat"><MdAccessTime/><div>
              <small>LAST PLAYED</small><strong>—</strong>
            </div></div>
            <div className="gl-details-stat"><MdSportsEsports/><div>
              <small>PLAYTIME</small><strong>{typeof game.playtimeMinutes==="number"?
                (game.playtimeMinutes/60).toFixed(1)+" hours":"—"}</strong>
            </div></div>
          </div>
          <div className="gl-details-context"><div>
            <strong>{store} Activity</strong>
            <p>Local play history will appear when GOG launching is implemented.</p>
          </div></div>
        </>:tab==="your-stuff"?<>
          <h2>Your Stuff</h2>
          <div className="gl-details-context"><div>
            <strong>{store} Library</strong>
            <p>Owned game. Achievements and save synchronization require the
              GOG installation and launch integration.</p>
          </div></div>
        </>:tab==="community"?<>
          <h2>Community</h2>
          <div className="gl-details-context"><div>
            <strong>GOG Community</strong>
            <p>Community features will become available once the GOG game
              details and launcher integration is complete.</p>
          </div></div>
        </>:<>
          <h2>Game Info</h2>
          <div className="gl-details-info-grid">
            <div><small>STORE</small><strong>{store}</strong></div>
            <div><small>STATUS</small><strong>{status}</strong></div>
            <div><small>PRODUCT ID</small><strong>{game.storeId}</strong></div>
            <div><small>INSTALLER</small><strong>Not connected</strong></div>
          </div>
          <div className="gl-details-context"><MdInfoOutline/><div>
            <strong>GOG installation is separate from Steam installation.</strong>
            <p>Steam AppIDs and native Steam download progress are never used
              for GOG products. Our gogdl backend will provide verified progress.</p>
          </div></div>
        </>}
      </div>
      <footer className="gl-details-footer">
        A Select · B Back · GOG actions remain separate from Steam
      </footer>
    </div>
  </section>;
}
