import {useEffect,useMemo,useRef,useState,type RefObject} from "react";
import {Focusable,GamepadButton,type GamepadEvent} from "@decky/ui";
import {toaster} from "@decky/api";
import {
  MdArrowBack,MdCheckCircle,MdChevronRight,MdDoneAll,MdFolder,
  MdLibraryBooks,MdPlayCircleOutline,MdBookmarkBorder,
} from "react-icons/md";
import type {LibraryGame} from "./steam";
import {posterCandidates} from "./steam";
import {showNativeGameOptions} from "./nativeGameContextMenu";
import type {SteamTab} from "./tabmaster";
import {createBatchGamesForTab} from "./tabmaster";
import {getGridColumnCount,gridNeighbor,canEnterNavigationRail,type GridDirection} from "./gridNavigation";
import {SystemStatusBar} from "./SystemStatusBar";
import {
  readCollectionLocation,saveCollectionLocation,type CollectionSection,
  type CollectionLocation,
} from "./collectionsNavigation";

type Props={
  games:LibraryGame[];
  tabs:SteamTab[];
  membershipRevision:number;
  firstRef:RefObject<HTMLDivElement|null>;
  onFocusRail:()=>void;
  onOpenGame:(game:LibraryGame)=>void;
  onHome:()=>void;
};

type Tile={
  id:Exclude<CollectionSection,"home">;
  title:string;
  description:string;
  icon:typeof MdFolder;
  count:number|null;
  caption:string;
};

const CORE_TABS=new Set(["allgames","installed","favorites","nonsteam"]);
const isCustomTab=(tab:SteamTab):boolean=>
  !CORE_TABS.has(tab.id.toLowerCase())&&
  !["all games","installed","favorites","non-steam","steam","epic","gog"]
    .includes(tab.title.trim().toLowerCase());

const CONSUME=(event:GamepadEvent)=>{
  event.preventDefault();event.stopPropagation();
};

/** Dedicated Collections hub, kept separate from Dashboard's proven grid
 * navigation. Continue Playing uses real Steam activity. Manual Backlog and
 * Completed are intentionally empty until manual membership is implemented;
 * never infer completion from missing playtime/achievement metadata.
 */
export function CollectionsPage({
  games,tabs,membershipRevision,firstRef,onFocusRail,onOpenGame,onHome,
}:Props){
  const [location,setLocation]=useState<CollectionLocation>(readCollectionLocation);
  const [focusedId,setFocusedId]=useState<number|null>(null);
  const headerRef=useRef<HTMLDivElement>(null);
  const tileRefs=useRef<Array<HTMLDivElement|null>>([]);
  const backRef=useRef<HTMLDivElement>(null);
  const collectionRefs=useRef<Array<HTMLDivElement|null>>([]);
  const gameRefs=useRef<Array<HTMLDivElement|null>>([]);
  const gridRef=useRef<HTMLDivElement>(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  const restoreFocus=useRef(location.gameId);

  const customTabs=useMemo(()=>tabs.filter(isCustomTab).sort((a,b)=>
    a.position-b.position||a.title.localeCompare(b.title)),[tabs]);
  const recent=useMemo(()=>{
    const last30Days=Math.floor(Date.now()/1000)-30*24*60*60;
    return games.filter(game=>game.lastPlayed>=last30Days&&game.lastPlayed>0)
      .sort((a,b)=>b.lastPlayed-a.lastPlayed||a.title.localeCompare(b.title));
  },[games]);
  const selectedTab=customTabs.find(tab=>tab.id===location.tabId)??null;
  const selectedResult=useMemo(()=>{
    if(!selectedTab)return null;
    return createBatchGamesForTab()(selectedTab,games);
  },[selectedTab,games,membershipRevision]);

  const entries=location.section==="continue"?recent:
    location.section==="my"&&selectedTab&&selectedResult?.supported?
      selectedResult.games:[];
  const title=location.section==="continue"?"Continue Playing":
    location.section==="backlog"?"Backlog":
    location.section==="completed"?"Completed":
    selectedTab?.title??"My Collections";

  const changeLocation=(next:CollectionLocation)=>{
    saveCollectionLocation(next);
    setLocation(next);
    setFocusedId(null);
    if(scrollRef.current)scrollRef.current.scrollTop=0;
  };
  const openSection=(section:Exclude<CollectionSection,"home">)=>{
    changeLocation({section,tabId:null,gameId:null});
  };
  const back=()=>{
    if(location.section==="home"){onHome();return;}
    if(location.section==="my"&&location.tabId){
      changeLocation({section:"my",tabId:null,gameId:null});
      return;
    }
    changeLocation({section:"home",tabId:null,gameId:null});
  };
  const focusGame=(index:number)=>{
    const target=gameRefs.current[index];
    if(!target)return;
    target.focus();
    target.scrollIntoView({block:"nearest",inline:"nearest"});
    setFocusedId(entries[index]?.id??null);
  };
  const handleGridDirection=(event:GamepadEvent,index:number)=>{
    const button=event.detail?.button;
    const direction:GridDirection|undefined=
      button===GamepadButton.DIR_LEFT?"left":
      button===GamepadButton.DIR_RIGHT?"right":
      button===GamepadButton.DIR_UP?"up":
      button===GamepadButton.DIR_DOWN?"down":undefined;
    if(!direction)return;
    CONSUME(event);
    const columns=getGridColumnCount(gridRef.current);
    if(direction==="up"&&index<columns){backRef.current?.focus();return;}
    if(canEnterNavigationRail(index,entries.length,columns,direction)){
      onFocusRail();return;
    }
    const next=gridNeighbor(index,entries.length,columns,direction);
    focusGame(next);
  };

  // Focus the new view's first control after React commits the card change.
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>{
      if(location.section==="home"){
        firstRef.current=tileRefs.current[0];
        tileRefs.current[0]?.focus();
      }else{
        firstRef.current=backRef.current;
        const selectedIndex=entries.findIndex(g=>g.id===restoreFocus.current);
        if(selectedIndex>=0){
          restoreFocus.current=null;
          focusGame(selectedIndex);
        }else backRef.current?.focus();
      }
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[location.section,location.tabId]);
  useEffect(()=>()=>{
    firstRef.current=null;
  },[]);

  const cards:Tile[]=[
    {id:"continue",title:"Continue Playing",description:"Games played in the last 30 days",
      icon:MdPlayCircleOutline,count:recent.length,caption:"AUTO"},
    {id:"backlog",title:"Backlog",description:"Games you plan to play",
      icon:MdBookmarkBorder,count:0,caption:"MANUAL · NEXT PHASE"},
    {id:"completed",title:"Completed",description:"Games you have finished",
      icon:MdDoneAll,count:0,caption:"MANUAL · NEXT PHASE"},
    {id:"my",title:"My Collections",description:"Your existing Steam / TabMaster groups",
      icon:MdFolder,count:customTabs.length,caption:"LIBRARY GROUPS"},
  ];

  return <div className="gl-collections-page" aria-label="Collections">
    <header className="gl-header gl-library-topbar" aria-label="Collections navigation">
      <div className="gl-topbar-titles">
        <span className="gl-topbar-current">Collections</span>
      </div>
      <SystemStatusBar statusRef={headerRef} onStatusButtonDown={event=>{
        if(event.detail?.button===GamepadButton.DIR_DOWN){
          CONSUME(event);
          (location.section==="home"?tileRefs.current[0]:backRef.current)?.focus();
        }
      }}/>
    </header>
    <div className="gl-collections-scroll" ref={scrollRef}>
      {location.section==="home"?<>
        <div className="gl-collections-intro">
          <span className="gl-collections-eyebrow">GAME LIBRARY / ORGANIZE</span>
          <h1>My Collections</h1>
          <p>Everything you want to play, in one place.</p>
        </div>
        <div className="gl-collections-cards">
          {cards.map((card,index)=>{
            const Icon=card.icon;
            return <Focusable key={card.id}
              ref={el=>{tileRefs.current[index]=el;if(index===0)firstRef.current=el;}}
              className="gl-collections-card" focusClassName="gl-focused" noFocusRing
              onActivate={()=>openSection(card.id)}
              onCancelButton={onHome}
              onOKActionDescription={"Open "+card.title}
              onButtonDown={(event:GamepadEvent)=>{
                const b=event.detail?.button;
                const next=b===GamepadButton.DIR_RIGHT&&index%2===0?index+1:
                  b===GamepadButton.DIR_LEFT&&index%2===1?index-1:
                  b===GamepadButton.DIR_DOWN&&index<2?index+2:
                  b===GamepadButton.DIR_UP&&index>=2?index-2:-1;
                if(next>=0){CONSUME(event);tileRefs.current[next]?.focus();}
                else if(b===GamepadButton.DIR_LEFT){CONSUME(event);onFocusRail();}
              }}>
              <div className="gl-collections-card-top">
                <Icon className="gl-collections-card-icon" aria-hidden="true"/>
                <span className="gl-collections-card-count">{card.count}</span>
              </div>
              <span className="gl-collections-card-tag">{card.caption}</span>
              <strong>{card.title}</strong>
              <small>{card.description}</small>
              <MdChevronRight className="gl-collections-card-arrow" aria-hidden="true"/>
            </Focusable>;
          })}
        </div>
      </>:<>
        <div className="gl-collections-detail-heading">
          <Focusable ref={el=>{backRef.current=el;firstRef.current=el;}}
            className="gl-grid-back" focusClassName="gl-focused" noFocusRing
            onActivate={back} onCancelButton={back}
            onOKActionDescription="Back to collections"
            onButtonDown={(event:GamepadEvent)=>{
              const b=event.detail?.button;
              if(b===GamepadButton.DIR_LEFT){CONSUME(event);onFocusRail();}
              else if(b===GamepadButton.DIR_DOWN){CONSUME(event);
                if(location.section==="my"&&!location.tabId)
                  collectionRefs.current[0]?.focus();
                else focusGame(0);
              }
            }}><MdArrowBack/> Back</Focusable>
          <div className="gl-collections-detail-copy">
            <h1>{title}</h1>
            <span>{location.section==="continue"?
              recent.length+" recently played games":
              location.section==="my"&&!location.tabId?
                customTabs.length+" groups from your library":
                entries.length+" games"}</span>
          </div>
        </div>
        {location.section==="my"&&!location.tabId?(
          customTabs.length?
          <div className="gl-collections-groups">
            {customTabs.map((tab,index)=><Focusable key={tab.id}
              ref={el=>{collectionRefs.current[index]=el;}}
              className="gl-collections-group" focusClassName="gl-focused" noFocusRing
              onActivate={()=>changeLocation({section:"my",tabId:tab.id,gameId:null})}
              onCancelButton={back}
              onButtonDown={(e:GamepadEvent)=>{
                const b=e.detail?.button;
                if(b===GamepadButton.DIR_LEFT){CONSUME(e);onFocusRail();}
                else if(b===GamepadButton.DIR_UP){CONSUME(e);index?
                  collectionRefs.current[index-1]?.focus():backRef.current?.focus();}
                else if(b===GamepadButton.DIR_DOWN){CONSUME(e);
                  collectionRefs.current[Math.min(index+1,customTabs.length-1)]?.focus();}
              }}>
              <MdFolder aria-hidden="true"/><strong>{tab.title}</strong>
              <MdChevronRight aria-hidden="true"/>
            </Focusable>)}
          </div>:<div className="gl-collections-empty">
            <MdFolder aria-hidden="true"/>
            <h2>No personal groups yet</h2>
            <p>Steam and TabMaster collections are still available in Library.
              Creating your own Game Library collections comes next.</p>
          </div>
        ):entries.length?(
          <div className="gl-collections-grid gl-full-grid" ref={gridRef}>
            {entries.map((game,index)=>{
              const images=posterCandidates(game);
              return <Focusable key={game.id}
                ref={el=>{gameRefs.current[index]=el;}}
                className="gl-game" focusClassName="gl-focused" noFocusRing
                onActivate={()=>{
                  saveCollectionLocation({...location,gameId:game.id});
                  onOpenGame(game);
                }}
                onGamepadFocus={()=>setFocusedId(game.id)}
                onCancelButton={back}
                onMenuButton={(event:GamepadEvent)=>{
                  CONSUME(event);
                  if(!showNativeGameOptions(game.id,event.currentTarget))
                    toaster.toast({title:"Game Library",
                      body:"Game options are unavailable on this client."});
                }}
                onOKActionDescription={"Game details: "+game.title}
                onMenuActionDescription="Game options"
                onButtonDown={(event:GamepadEvent)=>handleGridDirection(event,index)}>
                <div className="gl-poster">
                  {images.length>0&&<img src={images[0]} loading="lazy" alt=""/>}
                  <span className="gl-poster-name">{game.title}</span>
                  {game.installed&&<MdCheckCircle className="gl-installed-indicator"
                    aria-label="Installed"/>}
                </div>
              </Focusable>;
            })}
          </div>
        ):<div className="gl-collections-empty">
          <MdLibraryBooks aria-hidden="true"/>
          <h2>{location.section==="continue"?"Nothing played recently":
            location.section==="my"&&selectedResult&&!selectedResult.supported?
              "Collection unavailable":"No games here yet"}</h2>
          <p>{location.section==="continue"?
            "Games played in the last 30 days will appear here automatically.":
            location.section==="my"?
              selectedResult?.reason??"The group is empty.":
              "Manual game assignment to Backlog and Completed is coming in the next phase."}</p>
        </div>}
      </>}
    </div>
    <footer className="gl-footer">
      <span>GAME LIBRARY · Collections</span>
      <span>A Select</span><span>B Back</span><span>← Navigation</span>
    </footer>
  </div>;
}
