import {useEffect,useMemo,useRef,useState,type RefObject} from "react";
import {Focusable,GamepadButton,TextField,type GamepadEvent} from "@decky/ui";
import {toaster} from "@decky/api";
import {
  MdArrowBack,MdCheckCircle,MdChevronRight,MdDoneAll,MdFolder,
  MdLibraryBooks,MdPlayCircleOutline,MdBookmarkBorder,MdAdd,MdSearch,
} from "react-icons/md";
import type {LibraryGame} from "./steam";
import {posterCandidates} from "./steam";
import {showNativeGameOptions} from "./nativeGameContextMenu";
import type {SteamTab} from "./tabmaster";
import {createBatchGamesForTab} from "./tabmaster";
import {continuePlayingGames,personalCollectionTabs} from "./collectionViews";
import {searchLibraryGames} from "./librarySearch";
import {
  emptyManualCollections,manualGames,loadManualCollections,changeManualCollection,
  type ManualSection,
} from "./manualCollections";
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

const CONSUME=(event:GamepadEvent)=>{
  event.preventDefault();event.stopPropagation();
};

/** Dedicated Collections hub, kept separate from Dashboard's proven grid
 * navigation. Continue Playing uses real Steam activity. Manual Backlog and
 * Completed are persisted in Decky settings, never inferred from playtime
 * or missing achievements.
 */
export function CollectionsPage({
  games,tabs,membershipRevision,firstRef,onFocusRail,onOpenGame,onHome,
}:Props){
  const [location,setLocation]=useState<CollectionLocation>(readCollectionLocation);
  const [manual,setManual]=useState(emptyManualCollections);
  const [manualLoaded,setManualLoaded]=useState(false);
  const [manualError,setManualError]=useState("");
  const [saving,setSaving]=useState(false);
  const [picker,setPicker]=useState<ManualSection|null>(null);
  const [pickerQuery,setPickerQuery]=useState("");
  const headerRef=useRef<HTMLDivElement>(null);
  const tileRefs=useRef<Array<HTMLDivElement|null>>([]);
  const backRef=useRef<HTMLDivElement>(null);
  const collectionRefs=useRef<Array<HTMLDivElement|null>>([]);
  const gameRefs=useRef<Array<HTMLDivElement|null>>([]);
  const gridRef=useRef<HTMLDivElement>(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  const restoreFocus=useRef(location.gameId);
  const manageRef=useRef<HTMLDivElement>(null);
  const pickerBackRef=useRef<HTMLDivElement>(null);
  const pickerInputRef=useRef<HTMLDivElement>(null);
  const pickerRows=useRef<Array<HTMLDivElement|null>>([]);

  const customTabs=useMemo(()=>personalCollectionTabs(tabs),[tabs]);
  const recent=useMemo(()=>continuePlayingGames(games),[games]);
  const selectedTab=customTabs.find(tab=>tab.id===location.tabId)??null;
  const selectedResult=useMemo(()=>{
    if(!selectedTab)return null;
    return createBatchGamesForTab()(selectedTab,games);
  },[selectedTab,games,membershipRevision]);

  const manualSection:ManualSection|null=location.section==="backlog"||
    location.section==="completed"?location.section:null;
  const entries=location.section==="continue"?recent:
    manualSection?manualGames(games,manual,manualSection):
    location.section==="my"&&selectedTab&&selectedResult?.supported?
      selectedResult.games:[];
  const pickerResults=useMemo(()=>{
    if(!picker)return [];
    const q=pickerQuery.trim();
    const matches=q?searchLibraryGames(games,q,"all","all",{epic:null,gog:null}):
      [...games].sort((a,b)=>a.title.localeCompare(b.title));
    return matches.slice(0,80);
  },[games,picker,pickerQuery]);
  const title=location.section==="continue"?"Continue Playing":
    location.section==="backlog"?"Backlog":
    location.section==="completed"?"Completed":
    selectedTab?.title??"My Collections";

  const changeLocation=(next:CollectionLocation)=>{
    setPicker(null);
    restoreFocus.current=null;
    saveCollectionLocation(next);
    setLocation(next);
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
  const openPicker=(section:ManualSection)=>{
    if(!manualLoaded)return;
    setPickerQuery("");
    setPicker(section);
  };
  const closePicker=()=>{
    setPicker(null);
    setPickerQuery("");
    window.requestAnimationFrame(()=>manageRef.current?.focus());
  };
  const editManual=async(section:ManualSection,game:LibraryGame,include:boolean)=>{
    if(saving)return;
    setSaving(true);
    try{
      const response=await changeManualCollection(section,game.id,include);
      if(!response.ok||!response.collections)
        throw new Error(response.reason||"Unable to save collection");
      setManual(response.collections);
      setManualError("");
      if(!include&&!picker)window.requestAnimationFrame(()=>manageRef.current?.focus());
    }catch(error){
      const message=error instanceof Error?error.message:"Unable to save collection";
      setManualError(message);
      toaster.toast({title:"Game Library",body:message});
    }finally{setSaving(false);}
  };
  const focusGame=(index:number)=>{
    const target=gameRefs.current[index];
    if(!target)return;
    target.focus();
    target.scrollIntoView({block:"nearest",inline:"nearest"});
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
    if(direction==="up"&&index<columns){
      (manualSection?manageRef.current:backRef.current)?.focus();return;}
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
  useEffect(()=>{
    let active=true;
    void loadManualCollections().then(response=>{
      if(!active)return;
      if(!response.ok||!response.collections)
        throw new Error(response.reason||"Unable to load saved collections");
      setManual(response.collections);
      setManualLoaded(true);
    }).catch(error=>{
      if(!active)return;
      setManualError(error instanceof Error?error.message:"Collection loading failed");
      setManualLoaded(false);
    });
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!picker)return;
    const frame=window.requestAnimationFrame(()=>
      pickerInputRef.current?.querySelector("input")?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[picker]);
  useEffect(()=>{
    if(!manualLoaded||!manualSection||!restoreFocus.current)return;
    const index=entries.findIndex(game=>game.id===restoreFocus.current);
    if(index<0)return;
    restoreFocus.current=null;
    const frame=window.requestAnimationFrame(()=>focusGame(index));
    return ()=>window.cancelAnimationFrame(frame);
  },[manualLoaded,manualSection,manual]);

  const cards:Tile[]=[
    {id:"continue",title:"Continue Playing",description:"Games played in the last 30 days",
      icon:MdPlayCircleOutline,count:recent.length,caption:"AUTO"},
    {id:"backlog",title:"Backlog",description:"Games you plan to play",
      icon:MdBookmarkBorder,count:manualLoaded?manual.backlog.length:null,caption:"MANUAL"},
    {id:"completed",title:"Completed",description:"Games you have finished",
      icon:MdDoneAll,count:manualLoaded?manual.completed.length:null,caption:"MANUAL"},
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
      {picker?<div className="gl-collections-picker" aria-label={"Choose "+picker+" games"}>
        <div className="gl-collections-detail-heading">
          <Focusable ref={pickerBackRef} className="gl-grid-back"
            focusClassName="gl-focused" noFocusRing
            onActivate={closePicker} onCancelButton={closePicker}
            onButtonDown={(event:GamepadEvent)=>{
              if(event.detail?.button===GamepadButton.DIR_LEFT){
                CONSUME(event);onFocusRail();
              }else if(event.detail?.button===GamepadButton.DIR_DOWN){
                CONSUME(event);
                pickerInputRef.current?.querySelector("input")?.focus();
              }
            }}><MdArrowBack/> Back</Focusable>
          <div className="gl-collections-detail-copy">
            <h1>{"Add games to "+(picker==="backlog"?"Backlog":"Completed")}</h1>
            <span>Select to add or remove. Games are saved automatically.</span>
          </div>
        </div>
        <div className="gl-library-search-field gl-collections-picker-search"
          ref={pickerInputRef}>
          <MdSearch aria-hidden="true"/>
          <div className="gl-library-search-native">
            <TextField aria-label="Find games for collection"
              style={{width:"100%",minWidth:0}} value={pickerQuery}
              placeholder="Find a game by title..."
              onChange={event=>setPickerQuery(event.target.value)}/>
          </div>
        </div>
        <div className="gl-collections-picker-note">
          {pickerQuery.trim()?"Matching games":"All library games (A–Z)"}
          {" · showing "+pickerResults.length+" titles"}
          {saving?" · Saving...":""}
        </div>
        {pickerResults.length?<div className="gl-collections-picker-list">
          {pickerResults.map((game,index)=>{
            const added=manual[picker].includes(game.id);
            const other=picker==="backlog"?"completed":"backlog";
            const elsewhere=manual[other].includes(game.id);
            return <Focusable key={game.id}
              ref={el=>{pickerRows.current[index]=el;}}
              className={"gl-collections-picker-row"+(added?" gl-collections-selected":"")}
              focusClassName="gl-focused" noFocusRing
              onActivate={()=>{void editManual(picker,game,!added);}}
              onCancelButton={closePicker}
              onOKActionDescription={(added?"Remove ":"Add ")+game.title}
              onButtonDown={(event:GamepadEvent)=>{
                const b=event.detail?.button;
                if(b===GamepadButton.DIR_UP){
                  CONSUME(event);
                  if(index===0)pickerInputRef.current?.querySelector("input")?.focus();
                  else pickerRows.current[index-1]?.focus();
                }else if(b===GamepadButton.DIR_DOWN){
                  CONSUME(event);
                  pickerRows.current[Math.min(index+1,pickerResults.length-1)]?.focus();
                }else if(b===GamepadButton.DIR_LEFT){
                  CONSUME(event);onFocusRail();
                }
              }}>
              <div className="gl-collections-picker-art">
                {posterCandidates(game)[0]&&
                  <img src={posterCandidates(game)[0]} alt="" loading="lazy"/>}
              </div>
              <span className="gl-collections-picker-name">{game.title}</span>
              <span className="gl-collections-picker-state">
                {added?"✓ Added":elsewhere?"Move from "+(other==="backlog"?"Backlog":"Completed"):"+ Add"}
              </span>
            </Focusable>;
          })}
        </div>:<div className="gl-collections-empty">
          <MdLibraryBooks aria-hidden="true"/>
          <h2>No matching games</h2><p>Try another title.</p>
        </div>}
      </div>:location.section==="home"?<>
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
                <span className="gl-collections-card-count">{card.count===null?"—":card.count}</span>
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
                else if(manualSection)manageRef.current?.focus();
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
        {manualSection&&<div className="gl-collections-manage">
          <Focusable ref={manageRef} className="gl-collections-add"
            focusClassName="gl-focused" noFocusRing
            onActivate={()=>openPicker(manualSection)}
            onCancelButton={back}
            onOKActionDescription="Add games to collection"
            onButtonDown={(event:GamepadEvent)=>{
              const b=event.detail?.button;
              if(b===GamepadButton.DIR_UP){CONSUME(event);backRef.current?.focus();}
              else if(b===GamepadButton.DIR_DOWN){CONSUME(event);focusGame(0);}
              else if(b===GamepadButton.DIR_LEFT){CONSUME(event);onFocusRail();}
            }}>
            <MdAdd/> Add games
          </Focusable>
          <span>{manualError||(!manualLoaded?"Loading saved games...":
            saving?"Saving...":"Y on a game to remove it")}</span>
        </div>}
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
                onCancelButton={back}
                onOptionsButton={manualSection?(event:GamepadEvent)=>{
                  CONSUME(event);void editManual(manualSection,game,false);
                }:undefined}
                onOptionsActionDescription={manualSection?"Remove from "+title:undefined}
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
                  {manualSection&&<span className="gl-collections-remove-hint">Y Remove</span>}
                </div>
              </Focusable>;
            })}
          </div>
        ):<div className="gl-collections-empty">
          <MdLibraryBooks aria-hidden="true"/>
          <h2>{manualSection&&!manualLoaded?"Unable to load games":
            location.section==="continue"?"Nothing played recently":
            location.section==="my"&&selectedResult&&!selectedResult.supported?
              "Collection unavailable":"No games here yet"}</h2>
          <p>{manualSection?manualError||"Choose Add games to select titles from your library.":
            location.section==="continue"?
              "Games played in the last 30 days will appear here automatically.":
              selectedResult?.reason??"The group is empty."}</p>
        </div>}
      </>}
    </div>
    <footer className="gl-footer">
      <span>GAME LIBRARY · Collections</span>
      <span>A Select</span><span>B Back</span>
      {manualSection&&!picker?<span>Y Remove</span>:<span>← Navigation</span>}
    </footer>
  </div>;
}
