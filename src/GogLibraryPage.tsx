import {useEffect,useMemo,useRef,useState} from "react";
import {callable} from "@decky/api";
import {Focusable,GamepadButton,Navigation,TextField,type GamepadEvent} from "@decky/ui";
import {MdArrowBack,MdCheckCircle,MdRefresh,MdSettings,MdStorefront} from "react-icons/md";
import {getActiveUserId} from "./steam";
import {normalizeSearchText} from "./librarySearch";
import {getGridColumnCount,gridNeighbor,type GridDirection} from "./gridNavigation";
import {GogArtwork,type GogOwnedGame} from "./GogArtwork";
import type {GogAccount} from "./GogIntegrationPanel";

type LibraryReply={ok:boolean;games:GogOwnedGame[];synced_at?:number;
  needs_art_refresh?:boolean;reason?:string};
type SyncReply={ok:boolean;count?:number;reason?:string};
const readAccount=callable<[string],GogAccount>("get_gog_account");
const readLibrary=callable<[string],LibraryReply>("get_gog_library");
const syncLibrary=callable<[string],SyncReply>("sync_gog_library");
const stop=(e:GamepadEvent)=>{e.preventDefault();e.stopPropagation();};

/** Owned GOG products are not Steam shortcuts and intentionally have no
 * Play/Install action until the independent installer is implemented.
 */
export function GogLibraryPage({onFocusRail}:{onFocusRail:()=>void}){
  const steamId=getActiveUserId()||"";
  const [account,setAccount]=useState<GogAccount|null>(null);
  const [items,setItems]=useState<GogOwnedGame[]>([]);
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  const [detailId,setDetailId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const gridRef=useRef<HTMLDivElement>(null);
  const tiles=useRef<Array<HTMLDivElement|null>>([]);
  const detailBackRef=useRef<HTMLDivElement>(null);
  const refreshRef=useRef<HTMLDivElement>(null);
  const settingsRef=useRef<HTMLDivElement>(null);
  const searchWrap=useRef<HTMLDivElement>(null);

  const reload=async()=>{
    if(!steamId)throw new Error("Steam account unavailable.");
    const state=await readAccount(steamId);
    setAccount(state);
    if(!state.connected){setItems([]);return;}
    const result=await readLibrary(steamId);
    if(!result.ok)throw new Error(result.reason||"Unable to read GOG library.");
    setItems(result.games);
  };
  useEffect(()=>{
    let live=true;
    if(!steamId){setLoading(false);setError("Steam account unavailable.");return;}
    void Promise.all([readAccount(steamId),readLibrary(steamId)]).then(async([state,library])=>{
      if(!live)return;
      setAccount(state);
      if(state.connected&&library.ok){
        setItems(library.games);
        if(library.needs_art_refresh){
          // The previous version discarded GOG's artwork hashes. Upgrade that
          // snapshot exactly once after installation without reauthenticating.
          try{
            const result=await syncLibrary(steamId);
            if(result.ok){
              const renewed=await readLibrary(steamId);
              if(live&&renewed.ok)setItems(renewed.games);
            }else if(live)setError("GOG artwork refresh: "+(result.reason||"Try Refresh."));
          }catch{if(live)setError("Could not refresh old GOG artwork. Choose Refresh.");}
        }
      }else if(state.connected&&!library.ok){
        setError(library.reason||"Unable to load cached GOG games.");
      }
    }).catch(()=>{if(live)setError("GOG library service unavailable.");})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[steamId]);

  const filtered=useMemo(()=>{
    const q=normalizeSearchText(query);
    return items.filter(game=>!q||normalizeSearchText(game.title).startsWith(q))
      .sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:"base"}));
  },[items,query]);
  const visible=filtered.slice(0,1800);
  const current=filtered.find(game=>game.id===selected)??filtered[0];
  const detailGame=detailId?items.find(game=>game.id===detailId):undefined;
  const focusTile=(index:number)=>{
    const tile=tiles.current[index];
    tile?.focus();tile?.scrollIntoView({block:"nearest",inline:"nearest"});
  };
  const openDetail=(game:GogOwnedGame)=>{
    setSelected(game.id);
    setDetailId(game.id);
  };
  const closeDetail=()=>{
    const id=detailId;
    setDetailId(null);
    window.requestAnimationFrame(()=>{
      const target=visible.findIndex(game=>game.id===id);
      if(target>=0)focusTile(target);
    });
  };
  useEffect(()=>{
    if(!detailId)return;
    const frame=window.requestAnimationFrame(()=>detailBackRef.current?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[detailId]);

  const onTileDirection=(e:GamepadEvent,index:number)=>{
    const button=e.detail?.button;
    const direction:GridDirection|undefined=button===GamepadButton.DIR_LEFT?"left":
      button===GamepadButton.DIR_RIGHT?"right":
      button===GamepadButton.DIR_UP?"up":
      button===GamepadButton.DIR_DOWN?"down":undefined;
    if(!direction)return;
    stop(e);
    const columns=getGridColumnCount(gridRef.current,5);
    if(direction==="left"&&index%columns===0){onFocusRail();return;}
    if(direction==="up"&&index<columns){
      searchWrap.current?.querySelector<HTMLElement>("input")?.focus();
      return;
    }
    const neighbor=gridNeighbor(index,visible.length,columns,direction);
    if(neighbor!==index)focusTile(neighbor);
  };
  const refresh=()=>{
    if(busy||!account?.connected||!steamId)return;
    setBusy(true);setError("");
    void syncLibrary(steamId).then(async result=>{
      if(!result.ok)throw new Error(result.reason||"GOG synchronization failed.");
      await reload();
    }).catch(e=>setError(e instanceof Error?e.message:"GOG synchronization failed."))
      .finally(()=>setBusy(false));
  };
  const toSettings=()=>Navigation.Navigate("/game-library/plugin-settings");

  return <section className="gl-gog-library" aria-label="GOG owned library">
    {detailGame?
      <div className="gl-gog-detail-screen" aria-label={detailGame.title+" details"}>
        <div className="gl-gog-detail-top">
          <Focusable ref={detailBackRef} className="gl-grid-back gl-gog-detail-back"
            focusClassName="gl-focused" noFocusRing
            onActivate={closeDetail} onCancelButton={closeDetail}
            onButtonDown={(e:GamepadEvent)=>{
              if(e.detail?.button===GamepadButton.DIR_LEFT||
                 e.detail?.button===GamepadButton.DIR_UP){stop(e);closeDetail();}
            }}><MdArrowBack/> Back to GOG Library</Focusable>
          <span className="gl-gog-owned"><MdCheckCircle/> Owned on GOG</span>
        </div>
        <div className="gl-gog-detail-content">
          <div className="gl-gog-detail-cover">
            <GogArtwork game={detailGame} accountId={steamId} expanded/>
          </div>
          <div className="gl-gog-detail-info">
            <div className="gl-gog-detail-store"><MdStorefront/> GOG</div>
            <h2>{detailGame.title}</h2>
            <p>In your GOG library</p>
            <p className="gl-gog-detail-footnote">
              This is your owned GOG game, not a Steam shortcut.
              Installing, launching and managing GOG games will be available
              in a later integration phase.
            </p>
          </div>
        </div>
        <div className="gl-grid-hint">A: Back to games · B: Back to games</div>
      </div>
    :<>
      <div className="gl-gog-header">
        <div><h2>GOG Library</h2>
          <span>{account?.connected?
            items.length+" owned games · "+(account.username||"GOG account"):
            "Your purchased games, independently of Steam shortcuts"}</span></div>
        <div className="gl-gog-controls">
          <Focusable ref={settingsRef} className="gl-grid-back" noFocusRing focusClassName="gl-focused"
            onActivate={toSettings} onCancelButton={onFocusRail}
            onButtonDown={(e:GamepadEvent)=>{
              if(e.detail?.button===GamepadButton.DIR_LEFT){stop(e);onFocusRail();}
              if(e.detail?.button===GamepadButton.DIR_RIGHT){stop(e);refreshRef.current?.focus();}
              if(e.detail?.button===GamepadButton.DIR_DOWN){
                stop(e);searchWrap.current?.querySelector<HTMLElement>("input")?.focus();
              }
            }}><MdSettings/> GOG Settings</Focusable>
          <Focusable ref={refreshRef} className="gl-grid-back" noFocusRing focusClassName="gl-focused"
            onActivate={refresh} onCancelButton={onFocusRail}
            onButtonDown={(e:GamepadEvent)=>{
              if(e.detail?.button===GamepadButton.DIR_LEFT){stop(e);settingsRef.current?.focus();}
              if(e.detail?.button===GamepadButton.DIR_DOWN){
                stop(e);searchWrap.current?.querySelector<HTMLElement>("input")?.focus();
              }
            }}><MdRefresh/> {busy?"Syncing…":"Refresh"}</Focusable>
        </div>
      </div>
      {!account?.connected?
        <div className="gl-gog-empty">
          <MdStorefront size={38}/>
          <h2>{loading?"Loading GOG library…":"Connect GOG to see your purchased games"}</h2>
          <p>Open Plugin Settings → GOG Integration to sign in to your GOG account.</p>
          <Focusable className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing
            onActivate={toSettings} onButtonDown={(e:GamepadEvent)=>{
              if(e.detail?.button===GamepadButton.DIR_LEFT){stop(e);onFocusRail();}
            }}>Open GOG Settings</Focusable>
        </div>
      :<>
        <div className="gl-gog-search" ref={searchWrap}>
          <TextField label="Search owned GOG games" value={query}
            onChange={event=>{setQuery(event.target.value);setSelected(null);}}
            onKeyDown={(e:React.KeyboardEvent<HTMLInputElement>)=>{
              if(e.key==="ArrowDown"){e.preventDefault();focusTile(0);}
            }}/>
          <span>{filtered.length} results</span>
        </div>
        <div className="gl-gog-scroll">
          <div className="gl-gog-grid" ref={gridRef}>
            {visible.map((game,index)=><Focusable key={game.id}
              ref={el=>{tiles.current[index]=el;}}
              className="gl-game gl-gog-game" noFocusRing focusClassName="gl-focused"
              onActivate={()=>openDetail(game)}
              onGamepadFocus={()=>setSelected(game.id)}
              onMouseEnter={()=>setSelected(game.id)}
              onCancelButton={onFocusRail}
              onButtonDown={(e:GamepadEvent)=>onTileDirection(e,index)}
              onOKActionDescription="GOG game details">
              <div className="gl-poster">
                <GogArtwork game={game} accountId={steamId}/>
                <span className="gl-poster-name">{game.title}</span>
              </div>
            </Focusable>)}
          </div>
          {filtered.length===0&&<div className="gl-gog-empty">
            <h2>{query.trim()?"No matching GOG games":"No games in your GOG library"}</h2>
            <p>Try another title or refresh the account library.</p>
          </div>}
        </div>
        {current&&<div className="gl-gog-details">
          <span className="gl-gog-owned"><MdCheckCircle/> Owned on GOG</span>
          <strong>{current.title}</strong>
          <span>Press A for details · Install and Play coming in a later phase</span>
        </div>}
      </>}
      <div className="gl-grid-hint">
        D-pad / analog: Navigate · A: Game details · B: Navigation · GOG owned library
      </div>
    </>}
    {error&&<div role="alert" className="gl-tab-manager-error">{error}</div>}
  </section>;
}
