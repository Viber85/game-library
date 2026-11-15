import { useEffect, useMemo, useRef, useState } from "react";
import { Focusable, GamepadButton, GamepadEvent, Navigation } from "@decky/ui";
import {
  MdAccessTime, MdCheckCircle, MdDownload, MdGridView, MdHome, MdInfo,
  MdLibraryBooks, MdPlayArrow, MdPowerSettingsNew, MdSearch, MdSettings,
  MdShoppingCart, MdStar, MdVideogameAsset,
} from "react-icons/md";
import type { IconType } from "react-icons";
import {
  getLibraryGames, hasLibraryStore, heroUrl, lastPlayedLabel,
  LibraryGame, openDetails, play, playtimeLabel, posterCandidates, heroCandidates,
} from "./steam";
import { DASHBOARD_CSS } from "./theme";
import { fallbackTabs, gamesForTab, loadSteamTabs, SteamTab } from "./tabmaster";
import { getActiveUserId } from "./steam";

type Sort = "recent" | "alphabetical";

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

function GameCard({
  game, index, selected, onSelect, onMove, cardRef,
}: {
  game: LibraryGame;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (button: GamepadButton) => void;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const [coverIndex,setCoverIndex] = useState(0);
  const covers = posterCandidates(game);
  const poster = covers[coverIndex];
  const handleDirection = (e: GamepadEvent) => {
    const b = e.detail?.button;
    if (b === GamepadButton.DIR_LEFT || b === GamepadButton.DIR_RIGHT ||
        b === GamepadButton.DIR_UP || b === GamepadButton.BUMPER_LEFT ||
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
      preferredFocus={index === 0}
      onActivate={() => play(game)}
      onOptionsButton={() => openDetails(game)}
      onGamepadFocus={onSelect}
      onMouseEnter={onSelect}
      onButtonDown={handleDirection}
      onOKActionDescription="Play"
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
  const [tabInfo, setTabInfo] = useState<{available: boolean; reason: string; tabs: SteamTab[]}>({available:false,reason:"Loading TabMaster…",tabs:[]});
  const [activeTab, setActiveTab] = useState("AllGames");
  const [sort, setSort] = useState<Sort>("recent");
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [time, setTime] = useState(() => new Date());
  const railRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pillRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gameRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sortRef = useRef<HTMLDivElement>(null);
  const [railIndex, setRailIndex] = useState(0);

  useEffect(() => {
    const refresh = window.setInterval(() => setGames(getLibraryGames()), 15000);
    const clock = window.setInterval(() => setTime(new Date()), 60000);
    return () => { window.clearInterval(refresh); window.clearInterval(clock); };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const result = await loadSteamTabs(getActiveUserId());
      if (active) setTabInfo(result);
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 20000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const tabs = tabInfo.available && tabInfo.tabs.length ? tabInfo.tabs : fallbackTabs;
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
    railRefs.current[target]?.focus();
  };
  const goToGame = (index = 0) => {
    const next = Math.max(0, Math.min(shown.length - 1, index));
    const target = gameRefs.current[next];
    if (target) {
      target.focus();
      target.scrollIntoView({block:"nearest",inline:"nearest"});
      setSelectedId(shown[next].id);
    } else pillRefs.current[0]?.focus();
  };
  const focusPill = (index:number) => {
    const target = pillRefs.current[Math.max(0,Math.min(tabs.length - 1,index))];
    target?.focus();
    target?.scrollIntoView({block:"nearest",inline:"nearest"});
  };
  /** LB/RB move between TabMaster tabs, matching Steam's native bumper shortcuts. */
  const cycleTab = (direction: number) => {
    if (!tabs.length) return;
    const currentIndex = Math.max(0,tabs.findIndex(x => x.id === tab.id));
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
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
    <div className="gl-root">
      <style>{DASHBOARD_CSS}</style>
      <aside className="gl-sidebar" aria-label="Steam navigation">
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
                onGamepadFocus={() => setRailIndex(index)}
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
              >
                <Icon className="gl-rail-icon" />
                <span className="gl-rail-label">{action.label}</span>
              </Focusable>
            );
          })}
        </Focusable>
      </aside>

      <div className="gl-main">
        <header className="gl-header">
          <div className="gl-brand">STEAM <span className="gl-brand-sub">LIBRARY</span></div>
          <div className="gl-header-tools">
            <Focusable className="gl-header-control" focusClassName="gl-focused" noFocusRing
              onActivate={() => Navigation.Navigate("/search")} onOKActionDescription="Search">
              <MdSearch />
            </Focusable>
            <span className="gl-time">{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </header>

        <nav className="gl-filterbar" aria-label="Library filters">
          <Focusable className="gl-filters" flow-children="row">
            {tabs.map((item,index) => (
              <Focusable key={item.id}
                ref={el => { pillRefs.current[index] = el; }}
                className={"gl-pill" + (tab.id === item.id ? " gl-active" : "")}
                focusClassName="gl-focused" noFocusRing
                onActivate={() => { setActiveTab(item.id); setSelectedId(undefined); }}
                onButtonDown={(e:GamepadEvent) => {
                  if(handleBumper(e))return;
                  const b=e.detail?.button;
                  if(b===GamepadButton.DIR_DOWN){consume(e);goToGame();}
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
          <>
            <Focusable className="gl-strip" flow-children="row">
              {shown.map((game, index) => (
                <GameCard
                  key={game.id}
                  game={game}
                  index={index}
                  selected={game.id === selected?.id}
                  onSelect={() => setSelectedId(game.id)}
                  onMove={button=>{
                    if(button===GamepadButton.DIR_LEFT)index===0?focusRail(railIndex):goToGame(index-1);
                    else if(button===GamepadButton.DIR_RIGHT)goToGame(index+1);
                    else if(button===GamepadButton.DIR_UP)focusPill(tabs.indexOf(tab));
                    else if(button===GamepadButton.BUMPER_LEFT)cycleTab(-1);
                    else if(button===GamepadButton.BUMPER_RIGHT)cycleTab(1);
                  }}
                  cardRef={el=>{gameRefs.current[index]=el;}}
                />
              ))}
            </Focusable>
            <div className="gl-pagination">{shown.length} games · ↑ Tabs · ← Navigation</div>

            {selected && <section className="gl-feature" aria-label="Selected game">
              <HeroBackdrop key={selected.id} game={selected} />
              <div className="gl-feature-shade" />
              <div className="gl-feature-content">
                <h1>{selected.title}</h1>
                <p className="gl-desc">Selected from your Steam library</p>
                <div className="gl-status">
                  <span><MdCheckCircle /> {selected.installed ? "Installed" : "Not installed"}</span>
                  {selected.nonSteam && <span><MdVideogameAsset /> Non-Steam</span>}
                </div>
                <div className="gl-metrics">
                  <div className="gl-metric"><MdAccessTime /><div><small>PLAYTIME</small><strong>{playtimeLabel(selected.playtimeMinutes)}</strong></div></div>
                  <div className="gl-metric"><MdGridView /><div><small>LAST PLAYED</small><strong>{lastPlayedLabel(selected.lastPlayed)}</strong></div></div>
                  <div className="gl-metric"><MdStar /><div><small>ACHIEVEMENTS</small><strong>{selected.achievementsTotal !== undefined ? String(selected.achievementsUnlocked ?? 0) + " / " + selected.achievementsTotal : "—"}</strong></div></div>
                </div>
                <Focusable className="gl-actions" flow-children="row">
                  <Focusable className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing
                    onActivate={() => play(selected)} onOKActionDescription="Play">
                    <MdPlayArrow /> {selected.installed || selected.nonSteam ? "Play" : "View Game"}
                  </Focusable>
                  <Focusable className="gl-button" focusClassName="gl-focused" noFocusRing
                    onActivate={() => openDetails(selected)} onOKActionDescription="Game details">
                    <MdInfo /> Game Details
                  </Focusable>
                </Focusable>
              </div>
            </section>}
          </>
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

        {!tabInfo.available && <div className="gl-sync-note">TabMaster: {tabInfo.reason}. Using default tabs.</div>}
        <footer className="gl-footer"><span>STEAM · Menu</span><span>L1 / R1 · Tabs</span><span>A Select</span><span>B Back</span><span>← Navigation</span></footer>
      </div>
    </div>
  );
}
