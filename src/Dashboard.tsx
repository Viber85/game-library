import { useEffect, useMemo, useRef, useState } from "react";
import { Focusable, GamepadButton, GamepadEvent, Navigation } from "@decky/ui";
import {
  MdAccessTime, MdCheckCircle, MdDownload, MdGridView, MdHome, MdInfo,
  MdLibraryBooks, MdPlayArrow, MdPowerSettingsNew, MdSettings,
  MdShoppingCart, MdStar, MdVideogameAsset, MdChevronRight, MdArrowBack,
} from "react-icons/md";
import type { IconType } from "react-icons";
import {
  getLibraryGames, hasLibraryStore, heroUrl, lastPlayedLabel,
  LibraryGame, openDetails, play, gameActionLabel, playtimeLabel, posterCandidates, heroCandidates, logoCandidates,
} from "./steam";
import { DASHBOARD_CSS } from "./theme";
import { SystemStatusBar } from "./SystemStatusBar";
import { fallbackTabs, gamesForTab, loadSteamTabs, SteamTab } from "./tabmaster";
import { getActiveUserId } from "./steam";
import { HowLongToBeatCard } from "./HltbCard";
import { ProtonDBBadge } from "./ProtonDBBadge";
import { AchievementsCard } from "./AchievementsCard";
import { getGridColumnCount, gridNeighbor, canEnterNavigationRail, type GridDirection } from "./gridNavigation";

type Sort = "recent" | "alphabetical";
const INITIAL_GAME_COUNT = 15;

interface RailAction {
  id: string;
  label: string;
  icon: IconType;
  go: () => void;
}

const consume = (e: GamepadEvent) => { e.preventDefault(); e.stopPropagation(); };

/** Tries each custom/local/store asset until one actually loads. */
function HeroBackdrop({game}:{game:LibraryGame}) {
  const [imageIndex,setImageIndex] = useState(0);
  const [artRevision,setArtRevision] = useState(0);
  // Steam may not have loaded library assets when the game first receives focus.
  // Request only the selected game's details; never prefetch the whole library.
  useEffect(() => {
    let live=true;
    const store=(window as any).appDetailsStore;
    if(typeof store?.RequestAppDetails==="function"){
      try {
        void Promise.resolve(store.RequestAppDetails(game.id)).then(()=>{
          if(live){setImageIndex(0);setArtRevision(n=>n+1);}
        }).catch(()=>{/* cached art fallback stays available */});
      } catch {/* stock assets may still be available */ }
    }
    return ()=>{live=false};
  },[game.id]);
  const candidates = useMemo(() => heroCandidates(game),
    [game.id,game.hero,game.poster,artRevision]);
  const src = candidates[imageIndex];
  if (!src) return null;
  return <img className="gl-hero" src={src} alt="" key={src}
    onError={() => setImageIndex(n => n+1)}/>;
}

/** The user-selected title logo appears above the game's name. */
function GameLogo({game}:{game:LibraryGame}) {
  const [sourceIndex,setSourceIndex]=useState(0);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let mounted=true;
    const details=(window as any).appDetailsStore;
    if(typeof details?.RequestAppDetails === "function"){
      try { void Promise.resolve(details.RequestAppDetails(game.id)).then(()=>{
        if(mounted){setSourceIndex(0);setRefresh(n=>n+1);}
      }).catch(()=>{ /* Use existing cached assets */ }); }
      catch { /* logo may already be cached */ }
    }
    return ()=>{mounted=false;};
  },[game.id]);
  const candidates=useMemo(()=>logoCandidates(game),[game.id,game.nonSteam,refresh]);
  const src=candidates[sourceIndex];
  return src?<img className="gl-game-logo" src={src} alt="" key={src}
    onError={()=>setSourceIndex(n=>n+1)}/>:null;
}

function GameCard({
  game, index, selected, onSelect, onMove, cardRef, activate, onCancel, captureVertical=false,
}: {
  game: LibraryGame;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (button: GamepadButton) => void;
  cardRef?: React.Ref<HTMLDivElement>;
  activate?: () => void;
  onCancel?: () => void;
  captureVertical?: boolean;
}) {
  const [coverIndex,setCoverIndex] = useState(0);
  const covers = posterCandidates(game);
  const poster = covers[coverIndex];
  const handleDirection = (e: GamepadEvent) => {
    const b = e.detail?.button;
    if (b === GamepadButton.DIR_LEFT || b === GamepadButton.DIR_RIGHT ||
        b === GamepadButton.DIR_UP || (captureVertical && b === GamepadButton.DIR_DOWN) ||
        b === GamepadButton.BUMPER_LEFT ||
        b === GamepadButton.BUMPER_RIGHT) {
      consume(e);
      onMove(b);
    }
  };

  return (
    <Focusable
      ref={cardRef}
      className={"gl-game" + (selected ? " gl-selected" : "")}
      focusClassName="gl-focused"
      noFocusRing
      preferredFocus={!captureVertical && index === 0}
      onActivate={activate ?? (() => play(game))}
      onCancelButton={onCancel}
      onOptionsButton={() => openDetails(game)}
      onGamepadFocus={onSelect}
      onMouseEnter={captureVertical ? undefined : onSelect}
      onButtonDown={handleDirection}
      onOKActionDescription={activate ? "Game details" : gameActionLabel(game)}
      onOptionsActionDescription="Game details"
    >
      <div className="gl-poster">
        {poster ? <img src={poster} alt="" loading="lazy" key={poster} onError={() => setCoverIndex(n => n+1)} /> : null}
        <span className="gl-poster-name">{game.title}</span>
        {game.installed && <MdCheckCircle className="gl-installed-indicator" aria-label="Installed" />}
      </div>
    </Focusable>
  );
}

export function Dashboard() {
  const [games, setGames] = useState<LibraryGame[]>(() => getLibraryGames());
  const [tabInfo, setTabInfo] = useState<{available: boolean; reason: string; tabs: SteamTab[]; mode?: string}>({available:false,reason:"Checking library tab source…",tabs:[],mode:"auto"});
  const [activeTab, setActiveTab] = useState("AllGames");
  const [sort, setSort] = useState<Sort>("alphabetical");
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [viewAll,setViewAll] = useState(false);
  const [gridLimit,setGridLimit] = useState(60);
  const [time,setTime] = useState(() => new Date());
  const railRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sidebarRef = useRef<HTMLElement>(null);
  const pillRefs = useRef<Array<HTMLDivElement | null>>([]);
  const headerSearchRef = useRef<HTMLDivElement>(null);
  const gameRefs = useRef<Array<HTMLDivElement | null>>([]);
  const fullGridRefs = useRef<Array<HTMLDivElement | null>>([]);
  const fullGridLayoutRef = useRef<HTMLDivElement>(null);
  const pendingGridIndex = useRef<number | null>(null);
  const lastGridFocusIndex = useRef(0);
  const viewMoreRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const [railIndex, setRailIndex] = useState(0);
  const [railExpanded, setRailExpanded] = useState(false);

  useEffect(() => {
    const refresh = window.setInterval(() => setGames(getLibraryGames()), 15000);
    const clock = window.setInterval(() => setTime(new Date()), 15000);
    return () => { window.clearInterval(refresh); window.clearInterval(clock); };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const result = await loadSteamTabs(getActiveUserId());
      if (active) setTabInfo(result);
    };
    void refresh();
    // Follow Decky's enable/disable switch without a Steam or Decky restart.
    const timer = window.setInterval(() => { void refresh(); }, 6000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const tabs = tabInfo.available && tabInfo.tabs.length ? tabInfo.tabs : fallbackTabs;
  const tabIds = tabs.map(t=>t.id).join("|");
  useEffect(()=>{
    if(tabs.some(t=>t.id===activeTab))return;
    // The selected TabMaster tab may disappear while a Decky plugin is
    // disabled. Reset to Steam All Games rather than retaining stale ID.
    setActiveTab(tabs[0]?.id ?? "AllGames");
    setSelectedId(undefined);
    setViewAll(false);
    setGridLimit(60);
    pendingGridIndex.current=null;
  },[tabIds,activeTab]);
  const tab = tabs.find(t => t.id === activeTab) ?? tabs[0];
  const tabCounts = useMemo(() => new Map(tabs.map(t => {
    const result = gamesForTab(t, games);
    return [t.id, result.supported ? result.games.length : null] as const;
  })), [tabs, games]);
  const tabResult = useMemo(() => gamesForTab(tab, games), [tab, games]);
  const shown = useMemo(() => [...tabResult.games].sort(sort === "recent"
    ? (a,b) => b.lastPlayed - a.lastPlayed || a.title.localeCompare(b.title)
    : (a,b) => a.title.localeCompare(b.title)), [tabResult.games,sort]);
  const selected = shown.find((g) => g.id === selectedId) ?? shown[0];
  const previewGames = shown.slice(0,INITIAL_GAME_COUNT);
  const visibleGridGames = shown.slice(0,gridLimit);
  // Hero images are resolved on selection to honor custom SteamGridDB artwork.

  const railActions: RailAction[] = [
    { id: "home", label: "Home", icon: MdHome, go: () => Navigation.Navigate("/library/home") },
    { id: "library", label: "Library", icon: MdLibraryBooks, go: () => Navigation.Navigate("/library") },
    { id: "store", label: "Store", icon: MdShoppingCart, go: () => Navigation.NavigateToSteamWeb("https://store.steampowered.com/") },
    { id: "downloads", label: "Downloads", icon: MdDownload, go: () => Navigation.Navigate("/library/downloads") },
    { id: "settings", label: "Settings", icon: MdSettings, go: () => Navigation.Navigate("/settings") },
    { id: "power", label: "Power", icon: MdPowerSettingsNew, go: () => Navigation.OpenPowerMenu() },
  ];

  const focusRail = (index: number) => {
    const target = (index + railActions.length) % railActions.length;
    setRailIndex(target);
    setRailExpanded(true);
    railRefs.current[target]?.focus();
  };
  const commitGridFocus = (index:number):boolean => {
    const node=fullGridRefs.current[index];
    if (!node || !node.isConnected) return false;
    node.focus();
    node.scrollIntoView({block:"nearest",inline:"nearest"});
    lastGridFocusIndex.current=index;
    if (shown[index]) setSelectedId(shown[index].id);
    return true;
  };
  const focusGrid = (index:number) => {
    if (!shown.length) return;
    const target=Math.max(0,Math.min(shown.length-1,index));
    if(target >= gridLimit) {
      pendingGridIndex.current=target;
      setGridLimit(limit=>Math.min(shown.length,Math.max(limit+60,target+1)));
      return;
    }
    if (!commitGridFocus(target)) pendingGridIndex.current=target;
    else pendingGridIndex.current=null;
  };
  // A newly requested batch may not be mounted when the D-pad event fires.
  // Complete that move after React has rendered it, never lose the input.
  useEffect(()=>{
    if(!viewAll || pendingGridIndex.current===null)return;
    const target=pendingGridIndex.current;
    if(target>=gridLimit)return;
    if(commitGridFocus(target))pendingGridIndex.current=null;
  },[viewAll,gridLimit,shown.length,activeTab,sort]);
  const moveInGrid = (index:number, button:GamepadButton) => {
    if(button===GamepadButton.BUMPER_LEFT){cycleTab(-1);return;}
    if(button===GamepadButton.BUMPER_RIGHT){cycleTab(1);return;}
    const direction:GridDirection|undefined =
      button===GamepadButton.DIR_LEFT?"left":
      button===GamepadButton.DIR_RIGHT?"right":
      button===GamepadButton.DIR_UP?"up":
      button===GamepadButton.DIR_DOWN?"down":undefined;
    if(!direction)return;
    const columns=getGridColumnCount(fullGridLayoutRef.current);
    if (canEnterNavigationRail(index, shown.length, columns, direction)) {
      // This is an explicit first-column -> sidebar transition, not Steam's
      // free-form spatial focus search. Right/B returns to the same game.
      lastGridFocusIndex.current=index;
      focusRail(railIndex);
      return;
    }
    const target=gridNeighbor(index,shown.length,columns,direction);
    if(target!==index)focusGrid(target);
    // Right/down/up at grid boundaries remain bounded to the grid.
  };
  const goToGame = (index?: number) => {
    setRailExpanded(false);
    if (viewAll) {
      focusGrid(index ?? lastGridFocusIndex.current);
      return;
    }
    const next = Math.max(0, Math.min(previewGames.length - 1, index ?? 0));
    const target = gameRefs.current[next];
    if (target) {
      target.focus();
      target.scrollIntoView({block:"nearest",inline:"nearest"});
      setSelectedId(previewGames[next].id);
    } else pillRefs.current[0]?.focus();
  };
  const openGrid = () => {
    lastGridFocusIndex.current=0;
    pendingGridIndex.current=0;
    setGridLimit(60);
    setViewAll(true);
  };
  const closeGrid = () => {
    lastGridFocusIndex.current=0;
    pendingGridIndex.current=null;
    setSelectedId(previewGames[0]?.id);
    setViewAll(false);
    window.requestAnimationFrame(()=>viewMoreRef.current?.focus());
  };
  const focusPill = (index:number) => {
    setRailExpanded(false);
    const target = pillRefs.current[Math.max(0,Math.min(tabs.length - 1,index))];
    target?.focus();
    target?.scrollIntoView({block:"nearest",inline:"nearest"});
  };
  /** LB/RB move between TabMaster tabs, matching Steam's native bumper shortcuts. */
  const cycleTab = (direction: number) => {
    if (!tabs.length) return;
    lastGridFocusIndex.current=0;
    const currentIndex = Math.max(0,tabs.findIndex(x => x.id === tab.id));
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
    pendingGridIndex.current=null;
    setViewAll(false);
    setGridLimit(60);
    setSelectedId(undefined);
    // Focus target after React applies the new selected tab and game list.
    window.requestAnimationFrame(() => focusPill(nextIndex));
  };
  const handleBumper = (e:GamepadEvent):boolean => {
    if (e.detail?.button === GamepadButton.BUMPER_LEFT) {
      consume(e);cycleTab(-1);return true;
    }
    if (e.detail?.button === GamepadButton.BUMPER_RIGHT) {
      consume(e);cycleTab(1);return true;
    }
    return false;
  };

  return (
    <div
      className={"gl-root" + (railExpanded ? " gl-nav-expanded" : "")}
      onFocusCapture={event => {
        // Focus moves within the sidebar must not collapse it; outside
        // focus (mouse, keyboard, controller) restores the compact rail.
        if (!sidebarRef.current?.contains(event.target as Node))
          setRailExpanded(false);
      }}
    >
      <style>{DASHBOARD_CSS}</style>
      <aside
        ref={sidebarRef}
        className="gl-sidebar"
        aria-label="Steam navigation"
        aria-expanded={railExpanded}
        onFocusCapture={() => setRailExpanded(true)}
      >
        <div className="gl-sidebar-brand" aria-hidden="true"><MdVideogameAsset /></div>
        <Focusable className="gl-rail" flow-children="column">
          {railActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Focusable
                key={action.id}
                ref={el => { railRefs.current[index] = el; }}
                className="gl-rail-item"
                focusClassName="gl-focused"
                noFocusRing
                onGamepadFocus={() => { setRailIndex(index); setRailExpanded(true); }}
                onActivate={action.go}
                onOKActionDescription={action.label}
                onButtonDown={(e: GamepadEvent) => {
                  if (handleBumper(e)) return;
                  const button = e.detail?.button;
                  if (button === GamepadButton.DIR_UP) { consume(e); focusRail(index-1); }
                  else if (button === GamepadButton.DIR_DOWN) { consume(e); focusRail(index+1); }
                  else if (button === GamepadButton.DIR_RIGHT) { consume(e); goToGame(); }
                }}
                onCancelButton={() => goToGame()}
                onCancelActionDescription="Return to games"
                title={action.label}
                aria-label={action.label}
              >
                <Icon className="gl-rail-icon" />
                <span className="gl-rail-label">{action.label}</span>
              </Focusable>
            );
          })}
        </Focusable>
      </aside>

      <div className="gl-main">
        {!viewAll && selected && <div className="gl-scene" aria-hidden="true">
          <HeroBackdrop key={selected.id} game={selected}/>
          <div className="gl-scene-shade"/>
        </div>}
        {/* Active tab title is separate from the floating, pill-shaped status controls. */}
        <header className="gl-header gl-library-topbar" aria-label="Library navigation">
          <div className="gl-topbar-titles">
            <span className="gl-topbar-current" title={tab.title} aria-live="polite">{tab.title}</span>
          </div>
          <SystemStatusBar time={time} searchRef={headerSearchRef}
            onStatusButtonDown={(e:GamepadEvent)=>{
              if(handleBumper(e))return;
              if(e.detail?.button===GamepadButton.DIR_DOWN){
                consume(e);
                focusPill(Math.max(0,tabs.indexOf(tab)));
              }
            }}
          />
        </header>

        <nav className="gl-filterbar" aria-label="Library filters">
          <Focusable className="gl-filters" flow-children="row">
            {tabs.map((item,index) => (
              <Focusable key={item.id}
                ref={el => { pillRefs.current[index] = el; }}
                className={"gl-pill" + (tab.id === item.id ? " gl-active" : "")}
                focusClassName="gl-focused" noFocusRing
                onActivate={() => { pendingGridIndex.current=null; setActiveTab(item.id); setViewAll(false); setGridLimit(60); setSelectedId(undefined); }}
                onButtonDown={(e:GamepadEvent) => {
                  if(handleBumper(e))return;
                  const b=e.detail?.button;
                  if(b===GamepadButton.DIR_UP){consume(e);headerSearchRef.current?.focus();}
                  else if(b===GamepadButton.DIR_DOWN){consume(e);goToGame();}
                  else if(b===GamepadButton.DIR_LEFT){consume(e);index===0?focusRail(0):focusPill(index-1);}
                  else if(b===GamepadButton.DIR_RIGHT){consume(e);index===tabs.length-1?sortRef.current?.focus():focusPill(index+1);}
                }}
                onOKActionDescription={item.title}
              >
                {item.title}{games.length > 0 && tabCounts.get(item.id) !== null
                  ? "  " + tabCounts.get(item.id) : ""}
              </Focusable>
            ))}
          </Focusable>
          <Focusable ref={sortRef} className="gl-sort" focusClassName="gl-focused" noFocusRing
            onActivate={() => setSort((s) => s === "recent" ? "alphabetical" : "recent")}
            onButtonDown={(e:GamepadEvent)=>{
              if(handleBumper(e))return;
              if(e.detail?.button===GamepadButton.DIR_LEFT){consume(e);focusPill(tabs.length-1);}
              else if(e.detail?.button===GamepadButton.DIR_DOWN){consume(e);goToGame();}
            }}
            onOKActionDescription="Sort games">
            <MdAccessTime /> {sort === "recent" ? "Recent" : "A–Z"}
          </Focusable>
        </nav>

        {shown.length > 0 ? (
          viewAll ? (
            <section className="gl-grid-page" aria-label={"All games: "+tab.title}>
              <div className="gl-grid-heading">
                <div><h2>{tab.title}</h2><span>{shown.length} games · Full library</span></div>
                <Focusable className="gl-grid-back" noFocusRing focusClassName="gl-focused"
                  onActivate={closeGrid} onCancelButton={closeGrid}
                  onOKActionDescription="Back to games">
                  <MdArrowBack/> Back to carousel
                </Focusable>
              </div>
              <div className="gl-full-grid-scroll">
                <div className="gl-full-grid" ref={fullGridLayoutRef}>
                  {visibleGridGames.map((game,index)=>(
                    <GameCard key={game.id} game={game} index={index}
                      selected={game.id===selected?.id}
                      onSelect={()=>{
                        setSelectedId(game.id);
                        if(index>=gridLimit-12 && gridLimit<shown.length)
                          setGridLimit(v=>Math.min(v+60,shown.length));
                      }}
                      activate={()=>openDetails(game)}
                      captureVertical
                      onCancel={closeGrid}
                      onMove={button=>moveInGrid(index,button)}
                      cardRef={el=>{fullGridRefs.current[index]=el;}}
                    />
                  ))}
                </div>
              </div>
              <div className="gl-grid-hint">← First column: Menu · → / B: Return · L1/R1 Tabs</div>
            </section>
          ) : (
          <>
            <Focusable className="gl-strip" flow-children="row">
              {previewGames.map((game, index) => (
                <GameCard
                  key={game.id}
                  game={game}
                  index={index}
                  selected={game.id === selected?.id}
                  onSelect={() => setSelectedId(game.id)}
                  onMove={button=>{
                    if(button===GamepadButton.DIR_LEFT)index===0?focusRail(railIndex):goToGame(index-1);
                    else if(button===GamepadButton.DIR_RIGHT) {
                      if (index===previewGames.length-1 && shown.length>INITIAL_GAME_COUNT) viewMoreRef.current?.focus();
                      else goToGame(index+1);
                    }
                    else if(button===GamepadButton.DIR_UP)focusPill(tabs.indexOf(tab));
                    else if(button===GamepadButton.BUMPER_LEFT)cycleTab(-1);
                    else if(button===GamepadButton.BUMPER_RIGHT)cycleTab(1);
                  }}
                  cardRef={el=>{gameRefs.current[index]=el;}}
                />
              ))}
              {shown.length>INITIAL_GAME_COUNT &&
                <Focusable ref={viewMoreRef} className="gl-view-more" noFocusRing focusClassName="gl-focused"
                  onActivate={openGrid} onOKActionDescription="View all games"
                  onButtonDown={(e:GamepadEvent)=>{
                    const b=e.detail?.button;
                    if(b===GamepadButton.DIR_LEFT){consume(e);goToGame(previewGames.length-1);}
                    else if(b===GamepadButton.DIR_UP){consume(e);focusPill(tabs.indexOf(tab));}
                    else if(handleBumper(e))return;
                  }}>
                  <MdChevronRight size={42}/>
                  <strong>View More</strong>
                  <span>All {shown.length} games</span>
                </Focusable>}
            </Focusable>

            {selected && <section className="gl-feature" aria-label="Selected game">
              <div className="gl-feature-content">
                <GameLogo key={"logo-"+selected.id} game={selected}/>
                <h1>{selected.title}</h1>
                <div className="gl-status">
                  <span><MdCheckCircle /> {selected.installed ? "Installed" : "Not installed"}</span>
                  {selected.nonSteam && <span><MdVideogameAsset /> Non-Steam</span>}
                  <ProtonDBBadge key={"proton-"+selected.id} game={selected}/>
                </div>
                <div className="gl-metrics">
                  <div className="gl-metric"><MdAccessTime /><div><small>PLAYTIME</small><strong>{playtimeLabel(selected.playtimeMinutes)}</strong></div></div>
                  <HowLongToBeatCard key={"hltb-"+selected.id} game={selected}/>
                  <div className="gl-metric"><MdGridView /><div><small>LAST PLAYED</small><strong>{lastPlayedLabel(selected.lastPlayed)}</strong></div></div>
                  <AchievementsCard key={"achievements-"+selected.id} game={selected}/>
                </div>
                <Focusable className="gl-actions" flow-children="row">
                  <Focusable className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing
                    onActivate={() => play(selected)} onOKActionDescription={gameActionLabel(selected)}>
                    {selected.installed ? <MdPlayArrow /> : <MdDownload />} {gameActionLabel(selected)}
                  </Focusable>
                  <Focusable className="gl-button" focusClassName="gl-focused" noFocusRing
                    onActivate={() => openDetails(selected)} onOKActionDescription="Game details">
                    <MdInfo /> Game Details
                  </Focusable>

                </Focusable>
              </div>
            </section>}
          </>
          )
        ) : (
          <div className="gl-empty">
            <h1>{!tabResult.supported ? "Open this tab in Steam" : games.length === 0 ? "Your library is not available yet" : "No games in this tab"}</h1>
            <p>{!tabResult.supported ? tabResult.reason
              : games.length === 0 ? (hasLibraryStore()
                ? "Steam has not returned app overviews yet." : "Steam collectionStore is not ready.")
                : "Choose another tab to find games."}</p>
            <Focusable className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing
              onActivate={() => Navigation.Navigate("/library")} onOKActionDescription="Open Steam library">
              Open Steam Library
            </Focusable>
          </div>
        )}

        {!tabInfo.available && tabInfo.mode==="tabmaster" &&
          <div className="gl-sync-note">TabMaster is unavailable: {tabInfo.reason}. Showing Steam tabs.</div>}
        <footer className="gl-footer"><span>STEAM · Menu</span><span>L1 / R1 · Tabs</span><span>A Select</span><span>B Back</span><span>← Navigation</span></footer>
      </div>
    </div>
  );
}
