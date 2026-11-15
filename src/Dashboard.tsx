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
  LibraryGame, openDetails, play, playtimeLabel, posterUrl,
} from "./steam";
import { DASHBOARD_CSS } from "./theme";

type Filter = "playable" | "all" | "installed" | "favorites" | "nonsteam";
type Sort = "recent" | "alphabetical";

interface RailAction {
  id: string;
  label: string;
  icon: IconType;
  go: () => void;
}

const filters: Array<{ id: Filter; label: string }> = [
  { id: "playable", label: "Playable" },
  { id: "all", label: "Your Collection" },
  { id: "installed", label: "Installed" },
  { id: "favorites", label: "Favorites" },
  { id: "nonsteam", label: "Non-Steam" },
];

function filterGames(games: LibraryGame[], filter: Filter, sort: Sort): LibraryGame[] {
  const matching = games.filter((g) => {
    switch (filter) {
      case "playable": return g.installed || g.nonSteam;
      case "installed": return g.installed;
      case "favorites": return g.favorite;
      case "nonsteam": return g.nonSteam;
      default: return true;
    }
  });

  return matching.sort((a, b) => sort === "alphabetical"
    ? a.title.localeCompare(b.title)
    : b.lastPlayed - a.lastPlayed || a.title.localeCompare(b.title));
}

function GameCard({
  game, index, selected, onSelect, onLeftEdge, cardRef,
}: {
  game: LibraryGame;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onLeftEdge: () => void;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const poster = posterUrl(game);
  const handleDirection = (e: GamepadEvent) => {
    if (index === 0 && e.detail?.button === GamepadButton.DIR_LEFT) {
      e.preventDefault();
      e.stopPropagation();
      onLeftEdge();
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
      onGamepadDirection={handleDirection}
      onOKActionDescription="Play"
      onOptionsActionDescription="Game details"
    >
      <div className="gl-poster">
        {poster ? <img src={poster} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null}
        <span className="gl-poster-name">{game.title}</span>
        {game.installed && <MdCheckCircle className="gl-installed-indicator" aria-label="Installed" />}
      </div>
    </Focusable>
  );
}

export function Dashboard() {
  const [games, setGames] = useState<LibraryGame[]>(() => getLibraryGames());
  const [filter, setFilter] = useState<Filter>("playable");
  const [sort, setSort] = useState<Sort>("recent");
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [time, setTime] = useState(() => new Date());
  const railFirstRef = useRef<HTMLDivElement>(null);
  const gameFirstRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = window.setInterval(() => setGames(getLibraryGames()), 15000);
    const clock = window.setInterval(() => setTime(new Date()), 60000);
    return () => { window.clearInterval(refresh); window.clearInterval(clock); };
  }, []);

  const shown = useMemo(() => filterGames(games, filter, sort), [games, filter, sort]);
  const selected = shown.find((g) => g.id === selectedId) ?? shown[0];
  const hero = selected ? heroUrl(selected) : undefined;

  const railActions: RailAction[] = [
    { id: "home", label: "Home", icon: MdHome, go: () => Navigation.Navigate("/library/home") },
    { id: "library", label: "Library", icon: MdLibraryBooks, go: () => Navigation.Navigate("/library") },
    { id: "store", label: "Store", icon: MdShoppingCart, go: () => Navigation.NavigateToSteamWeb("https://store.steampowered.com/") },
    { id: "downloads", label: "Downloads", icon: MdDownload, go: () => Navigation.Navigate("/library/downloads") },
    { id: "settings", label: "Settings", icon: MdSettings, go: () => Navigation.Navigate("/settings") },
    { id: "power", label: "Power", icon: MdPowerSettingsNew, go: () => Navigation.OpenPowerMenu() },
  ];

  const goToGame = () => {
    const target = gameFirstRef.current;
    target?.focus();
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
                ref={index === 0 ? railFirstRef : undefined}
                className="gl-rail-item"
                focusClassName="gl-focused"
                noFocusRing
                onActivate={action.go}
                onOKActionDescription={action.label}
                onGamepadDirection={(e: GamepadEvent) => {
                  if (e.detail?.button === GamepadButton.DIR_RIGHT) {
                    e.preventDefault();
                    e.stopPropagation();
                    goToGame();
                  }
                }}
                onCancelButton={goToGame}
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
            {filters.map((item) => (
              <Focusable key={item.id}
                className={"gl-pill" + (filter === item.id ? " gl-active" : "")}
                focusClassName="gl-focused" noFocusRing
                onActivate={() => { setFilter(item.id); setSelectedId(undefined); }}
                onOKActionDescription={item.label}
              >
                {item.label}
                {item.id === "all" ? " (" + games.length + ")" : ""}
              </Focusable>
            ))}
          </Focusable>
          <Focusable className="gl-sort" focusClassName="gl-focused" noFocusRing
            onActivate={() => setSort((s) => s === "recent" ? "alphabetical" : "recent")}
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
                  onLeftEdge={() => railFirstRef.current?.focus()}
                  cardRef={index === 0 ? gameFirstRef : undefined}
                />
              ))}
            </Focusable>
            <div className="gl-pagination">{shown.length} games · D-pad Left from first game opens navigation</div>

            {selected && <section className="gl-feature" aria-label="Selected game">
              {hero && <img className="gl-hero" src={hero} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
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
            <h1>{games.length === 0 ? "Your library is not available yet" : "No games in this filter"}</h1>
            <p>{games.length === 0
              ? (hasLibraryStore() ? "Steam has not returned game metadata. Try reopening this page." : "Steam's app store is not ready in this client build.")
              : "Select another filter to see your games."}</p>
            <Focusable className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing
              onActivate={() => Navigation.Navigate("/library")} onOKActionDescription="Open Steam library">
              Open Steam Library
            </Focusable>
          </div>
        )}

        <footer className="gl-footer"><span>STEAM · Menu</span><span>A Select</span><span>B Back</span><span>← Navigation</span></footer>
      </div>
    </div>
  );
}
