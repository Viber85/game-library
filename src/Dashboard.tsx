import { useEffect, useMemo, useRef, useState } from "react";
import {toaster} from "@decky/api";
import {showNativeGameOptions} from "./nativeGameContextMenu";
import { Focusable, GamepadButton, GamepadEvent, Navigation } from "@decky/ui";
import {
  MdAccessTime, MdCheckCircle, MdDownload, MdGridView, MdHome, MdInfo,
  MdLibraryBooks, MdPlayArrow, MdPalette, MdMenu, MdSearch, MdCollectionsBookmark,
  MdVideogameAsset, MdChevronRight, MdArrowBack, MdSettings,
} from "react-icons/md";
import type { IconType } from "react-icons";
import {
  getActiveUserId, getLibraryGames, getUnifideckCollectionIds, hasLibraryStore, lastPlayedLabel,
  LibraryGame, openDetails, play, gameActionLabel, playtimeLabel, posterCandidates,
} from "./steam";
import { DASHBOARD_CSS } from "./theme";
import {getMissingSteamArt,subscribeArtworkSettingsChanged} from "./steamGridArtwork";
import { SystemStatusBar } from "./SystemStatusBar";
import {LibrarySearchToolbar} from "./LibrarySearchToolbar";
import {searchLibraryGames} from "./librarySearch";
import {SEARCH_ROUTE,rememberSearchOrigin,searchBackRoute,
  readSearchSelection,saveSearchSelection} from "./searchNavigation";
import {AppearancePage} from "./AppearancePage";
import {LibraryAlphabetIndicator} from "./LibraryAlphabetIndicator";
import {SteamInstallSizeBadge,hydrateCachedSteamSizes} from "./SteamInstallSizeBadge";
import {HltbPosterBadge} from "./HltbPosterBadge";
import {alphabetIndicatorEnabled,isRightEdgeGame} from "./libraryAlphabet";
import {CollectionsPage} from "./CollectionsPage";
import {resetCollectionLocation} from "./collectionsNavigation";
import {openNativeSteamMenu} from "./nativeSteamMenu";
import {DEFAULT_LIBRARY_TABS,createLibraryTabResolver,gamesForLibraryTab,
  visibleLibraryTabs,type LibraryTab} from "./libraryTabs";
import {TabManager} from "./TabManager";
import {PluginSettingsPage} from "./PluginSettingsPage";
import {GogDashboardCard} from "./GogDashboardCard";
import {GogArtwork} from "./GogArtwork";
import {SharedLibraryDetails} from "./SharedLibraryDetails";
import {SteamGameDetails} from "./SteamGameDetails";
import {focusNativeMenuControl} from "./nativeMenuGamepad";
import {useGogDashboardCatalog} from "./useGogDashboardCatalog";
import {combineDashboardEntries,combineSearchEntries,searchGogEntries,
  type DashboardEntry} from "./dashboardCatalog";
import {fromGogLibraryGame} from "./unifiedLibraryGame";
import {SharedLibraryGrid,SharedLibraryCardFace} from "./SharedLibraryGrid";
import {useNativeMenuGamepad} from "./nativeMenuGamepad";
import { getAutoTabs, subscribeAutoTabs, type AutoTabSnapshot } from "./autoTabSource";
import {sortForTab,sortGames,sortLabel,externalSortKind,SORT_OPTIONS,type HomeSort} from "./homeSort";
import {getSortData,primeHltbCache,sortMetadataProgress,startSortMetadata} from "./sortMetadata";
import {sameLibraryGames,libraryTabSignature} from "./librarySnapshot";
import {SortProgressNotice} from "./SortProgressNotice";
import {HeroBackdrop,GameLogo} from "./SelectedGameArtwork";
import {RunningGameIcon,RunningGameLabel} from "./RunningGameVisuals";
import {useRunningGameState} from "./useRunningGameState";
import { HowLongToBeatCard } from "./HltbCard";
import { ProtonDBBadge } from "./ProtonDBBadge";
import { AchievementsCard } from "./AchievementsCard";
import { getGridColumnCount, gridNeighbor, canEnterNavigationRail, type GridDirection } from "./gridNavigation";
import { resumeRunningGame } from "./runningGame";
import {
  consumeDetailsOrigin,peekDetailsOrigin,rememberDetailsOrigin,
  type DetailsOriginRoute,
} from "./detailsReturn";

type Sort = HomeSort;
const INITIAL_GAME_COUNT = 15;
const LIBRARY_ROUTE = "/game-library/library";
const APPEARANCE_ROUTE = "/game-library/appearance";
const COLLECTIONS_ROUTE="/game-library/collections";
const TABS_ROUTE="/game-library/tabs";
const PLUGIN_SETTINGS_ROUTE="/game-library/plugin-settings";
let lastSelectedLibraryTab="AllGames";
const rememberedSorts:Record<string,Sort>={};

interface RailAction {
  id: string;
  label: string;
  icon: IconType;
  go: () => void;
}

const consume = (e: GamepadEvent) => { e.preventDefault(); e.stopPropagation(); };

function GameCard({
  game, index, onSelect, onMove, onSort, cardRef, activate, onCancel, captureVertical=false,
  showInstallSize=false, selectedForSize=false,
}: {
  game: LibraryGame;
  index: number;
  onSelect: () => void;
  onMove: (button: GamepadButton) => void;
  onSort: () => void;
  cardRef?: React.Ref<HTMLDivElement>;
  activate?: () => void;
  onCancel?: () => void;
  captureVertical?: boolean;
  showInstallSize?: boolean;
  selectedForSize?: boolean;
}) {
  const [coverIndex,setCoverIndex] = useState(0);
  const [remoteCover,setRemoteCover] = useState<string|null>(null);
  const [lookupFinished,setLookupFinished] = useState(false);
  useEffect(()=>subscribeArtworkSettingsChanged(()=>{
    setRemoteCover(null);
    setLookupFinished(false);
    setCoverIndex(0);
  }),[game.id]);
  const covers = posterCandidates(game);
  const poster = covers[coverIndex] ?? remoteCover;
  // Only search once every native Steam cover candidate returned an image
  // error (or there was no native cover). Off-screen Steam images are lazy.
  useEffect(()=>{
    if(game.nonSteam || covers[coverIndex] || lookupFinished)return;
    let mounted=true;
    void getMissingSteamArt(game).then(art=>{
      if(mounted){setRemoteCover(art.cover);setLookupFinished(true);}
    }).catch(()=>{if(mounted)setLookupFinished(true);});
    return ()=>{mounted=false;};
  },[game.id,game.title,game.nonSteam,covers.length,coverIndex,lookupFinished]);
  const handleDirection = (e: GamepadEvent) => {
    const b = e.detail?.button;
    // Select/View is intentionally not mapped inside Game Library.
    if (b === GamepadButton.DIR_LEFT || b === GamepadButton.DIR_RIGHT ||
        b === GamepadButton.DIR_UP || b === GamepadButton.DIR_DOWN ||
        b === GamepadButton.BUMPER_LEFT ||
        b === GamepadButton.BUMPER_RIGHT) {
      consume(e);
      onMove(b);
    }
  };

  return (
    <Focusable
      ref={cardRef}
      className="gl-game"
      focusClassName="gl-focused"
      noFocusRing
      preferredFocus={!captureVertical && index === 0}
      onActivate={activate ?? (() => play(game))}
      onCancelButton={onCancel}
      onOptionsButton={(e:GamepadEvent)=>{consume(e);onSort();}}
      onMenuButton={(e:GamepadEvent)=>{
        consume(e);
        const opened=showNativeGameOptions(game.id,e.currentTarget);
        if(!opened)toaster.toast({
          title:"Game Library",
          body:"Steam game options unavailable on this client. Open the original Steam Library to use the native menu."
        });
      }}
      onMenuActionDescription="Game options"
      onGamepadFocus={onSelect}
      onMouseEnter={captureVertical ? undefined : onSelect}
      onButtonDown={handleDirection}
      onOKActionDescription={activate ? "Game details" : gameActionLabel(game)}
      onOptionsActionDescription="Sort games"
    >
      <SharedLibraryCardFace title={game.title}
          sizeActive={showInstallSize} installed={game.installed&&!showInstallSize}>
        {poster ? <img src={poster} alt="" loading="lazy" key={poster}
          onError={() => {
            if(covers[coverIndex])setCoverIndex(n=>n+1);
            else setRemoteCover(null);
          }} /> : null}
        {showInstallSize&&<div className="gl-poster-meta">
          <SteamInstallSizeBadge key={"size-"+game.id} game={game} active={selectedForSize}/>
          <HltbPosterBadge key={"hltb-"+game.id} game={game} active={selectedForSize}/>
        </div>}
      </SharedLibraryCardFace>
    </Focusable>
  );
}


export function Dashboard({initialMode="home",originRoute}:
  {initialMode?:"home"|"library"|"appearance"|"search"|"collections"|"tabs"|"settings";originRoute?:DetailsOriginRoute}={}) {
  const searchMode=initialMode==="search";
  const nativeMenuKind=initialMode==="tabs"?"tabs":
    initialMode==="settings"?"settings":
    initialMode==="appearance"?"appearance":
    initialMode==="collections"?"collections":null;
  const nativeMenuRoot=useRef<HTMLDivElement>(null);
  // Attach the native Game Mode focus bridge whenever our custom Details
  // replaces the grid, regardless of Home/Library/Collections origin.
  // The old Library route left Steam focus attached to its now-hidden grid.

  const collectionsMode=initialMode==="collections";
  const tabsMode=initialMode==="tabs";
  const settingsMode=initialMode==="settings";
  const actualRoute=originRoute??(initialMode==="library"?
    LIBRARY_ROUTE:initialMode==="appearance"?APPEARANCE_ROUTE:
      searchMode?SEARCH_ROUTE:collectionsMode?COLLECTIONS_ROUTE:
      tabsMode?TABS_ROUTE:settingsMode?PLUGIN_SETTINGS_ROUTE:"/library/home");
  // Read a single return snapshot only if this exact original route mounts.
  const [detailsReturn]=useState(()=>peekDetailsOrigin(actualRoute));
  useEffect(()=>{
    if(detailsReturn)consumeDetailsOrigin(actualRoute);
  },[actualRoute,detailsReturn]);
  const restorePending=useRef(detailsReturn);
  const [games, setGames] = useState<LibraryGame[]>(() => getLibraryGames());
  const gogAccountId=getActiveUserId();
  const gogCatalogEnabled=initialMode==="home"||initialMode==="library"||searchMode;
  const {games:gogGames}=useGogDashboardCatalog(gogAccountId,gogCatalogEnabled);
  const [gogDetailsId,setGogDetailsId]=useState<string|null>(null);
  const [steamDetailsGame,setSteamDetailsGame]=useState<LibraryGame|null>(null);
  useNativeMenuGamepad(steamDetailsGame?"details":nativeMenuKind,nativeMenuRoot);
  const [selectedGogId,setSelectedGogId]=useState<string|null>(null);
  const gogDetailBackRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(initialMode!=="library")return;
    // One local cached-bulk call only; never hit the Steam Store for each
    // library cover or block controller navigation.
    void hydrateCachedSteamSizes(games.filter(game=>
      !game.installed&&!game.nonSteam).map(game=>game.id));
  },[initialMode,games.length]);
  const [searchSelection,setSearchSelection]=useState(readSearchSelection);
  useEffect(()=>{
    if(searchMode)saveSearchSelection(searchSelection);
  },[searchMode,searchSelection]);
  const {runningGame,setRunningGame}=useRunningGameState();
  const [tabInfo, setTabInfo] = useState<AutoTabSnapshot>(()=>getAutoTabs());
  const [activeTab, setActiveTab] = useState(()=>
    detailsReturn?.tabId??
      (initialMode==="library"?lastSelectedLibraryTab:"AllGames"));
  useEffect(()=>{lastSelectedLibraryTab=activeTab;},[activeTab]);
  const [tabSorts, setTabSorts] = useState<Record<string,Sort>>(
    ()=>({...rememberedSorts}));
  const [sortOpen,setSortOpen]=useState(false);
  const sortMenuRefs=useRef<Array<HTMLDivElement|null>>([]);
  const sortReturnFocus=useRef<HTMLElement|null>(null);
  const [metaRevision,setMetaRevision]=useState(0);
  const [selectedId, setSelectedId] = useState<number | undefined>(
    detailsReturn?.gameId);
  const [viewAll,setViewAll] = useState(
    searchMode?true:(detailsReturn?.viewAll??(initialMode==="library")));
  const [gridLimit,setGridLimit] = useState(
    Math.max(60,detailsReturn?.gridLimit??60));
  const railRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sidebarRef = useRef<HTMLElement>(null);
  const pillRefs = useRef<Array<HTMLDivElement | null>>([]);
  const headerStatusRef = useRef<HTMLDivElement>(null);
  const searchInputRef=useRef<HTMLDivElement>(null);
  const firstSearchFilterRef=useRef<HTMLDivElement>(null);
  const appearanceEntryRef=useRef<HTMLDivElement>(null);
  const collectionsEntryRef=useRef<HTMLDivElement>(null);
  const tabsEntryRef=useRef<HTMLDivElement>(null);
  const settingsEntryRef=useRef<HTMLDivElement>(null);
  const [collectionsPageRevision,setCollectionsPageRevision]=useState(0);
  const gameRefs = useRef<Array<HTMLDivElement | null>>([]);
  const fullGridRefs = useRef<Array<HTMLDivElement | null>>([]);
  const fullGridLayoutRef = useRef<HTMLDivElement>(null);
  const fullGridScrollRef = useRef<HTMLDivElement>(null);
  const alphabetRailRef = useRef<HTMLDivElement>(null);
  const alphabetReturnGridIndex = useRef<number|null>(null);
  const pendingGridIndex = useRef<number | null>(null);
  const lastGridFocusIndex = useRef(detailsReturn?.gridFocusIndex??0);
  const steamReturnTarget=useRef<{
    kind:"grid"|"home-card"|"home-action"|"collections";
    gameId:number;index:number;scrollTop:number;
  }|null>(null);
  const viewMoreRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const searchBackRef=useRef<HTMLDivElement>(null);
  const nativeLibraryRef=useRef<HTMLDivElement>(null);
  const libraryBackRef=useRef<HTMLDivElement>(null);
  const homeActionRefs=useRef<Array<HTMLDivElement|null>>([]);
  const [railIndex, setRailIndex] = useState(0);
  const lastRailId=useRef(tabsMode?"settings":settingsMode?"settings":collectionsMode?"collections":initialMode==="appearance"?"appearance":searchMode?"search":initialMode==="library"?"library":"home");
  const [railExpanded, setRailExpanded] = useState(false);
  const tabsForRefresh=useRef<LibraryTab[]>(DEFAULT_LIBRARY_TABS);
  const membershipSignature=useRef<string|null>(null);
  const [membershipRevision,setMembershipRevision]=useState(0);

  useEffect(() => {
    const refresh=window.setInterval(()=>{
      const next=getLibraryGames();
      // Installed/Favorites membership can change
      // without a single CAppOverview field changing. Track real member
      // AppIDs separately before suppressing a no-op library rerender.
      const signature=libraryTabSignature(
        tabsForRefresh.current,next,createLibraryTabResolver());
      if(membershipSignature.current!==null&&
         membershipSignature.current!==signature)
        setMembershipRevision(revision=>revision+1);
      membershipSignature.current=signature;
      setGames(previous=>sameLibraryGames(previous,next)?previous:next);
    },15000);
    return ()=>{window.clearInterval(refresh);};
  },[]);

  useEffect(() => {
    // Watch the plugin-level source. It continues polling even while Steam
    // unmounts this route to show Decky's plugin manager.
    const unsubscribe=subscribeAutoTabs(setTabInfo);
    // Close the small render-to-subscribe race without requesting twice.
    setTabInfo(getAutoTabs());
    return unsubscribe;
  }, []);
  const tabs=useMemo(()=>{
    const own=visibleLibraryTabs(tabInfo.tabs.length?tabInfo.tabs:DEFAULT_LIBRARY_TABS);
    return own; // All built-in store tabs are owned by Tab Manager.
  },[tabInfo.tabs]);
  tabsForRefresh.current=tabs;
  const tabIds = tabs.map(t=>t.id).join("|");
  useEffect(()=>{
    membershipSignature.current=libraryTabSignature(tabs,games,createLibraryTabResolver());
  },[tabs,games]);
  useEffect(()=>{
    if(tabs.some(t=>t.id===activeTab))return;
    // Preserve a saved custom-tab origin while the Steam account loads.
    if(tabInfo.reason==="Waiting for Steam account"&&
       restorePending.current?.tabId===activeTab)return;
    // When a tab is actually removed, fall back to first valid native tab.
    setActiveTab(tabs[0]?.id ?? "AllGames");
    setSelectedId(undefined);setSelectedGogId(null);
    setViewAll(initialMode==="library");
    setGridLimit(60);
    pendingGridIndex.current=null;
  },[tabIds,activeTab,tabInfo.reason]);
  const tab = tabs.find(t => t.id === activeTab) ?? tabs[0];
  const sort = searchMode?(tabSorts["__search__"]??"alphabetical"):sortForTab(tab,tabSorts);
  const sortKind=externalSortKind(sort);
  // Phase 1 is visual-only, restricted to the dedicated Library's full grid
  // with alphabetic sorting. Home, Search and other routes remain unchanged.
  const libraryAlphabetActive=alphabetIndicatorEnabled(initialMode,sort,viewAll);
  const activeSortKind=useRef(sortKind);
  activeSortKind.current=sortKind;
  const tabCounts = useMemo(() => {
    const resolve=createLibraryTabResolver();
    return new Map(tabs.map(t => {
    const result = t.id==="GOG"?null:resolve(t, games);
    const count=t.id==="GOG"?gogGames.length:
      (result?.supported?result.games.length+
        (t.id==="AllGames"?gogGames.length:0):null);
    return [t.id,count] as const;
  }));
  }, [tabs, games, gogGames, membershipRevision]);
  // Search is global; the currently selected Library tab does not
  // exclude Steam or Unifideck games from the searchable inventory.
  const searchMembership=useMemo(()=>searchMode?{
    epic:getUnifideckCollectionIds("Epic"),
    gog:getUnifideckCollectionIds("GOG"),
  }:{epic:null,gog:null},[searchMode,games,membershipRevision]);
  const searchResults=useMemo(()=>searchMode?
    searchLibraryGames(games,searchSelection.query,searchSelection.source,
      searchSelection.installed,searchMembership):[],
    [searchMode,games,searchSelection,searchMembership]);
  const tabResult = useMemo(()=>searchMode?{supported:true,games:searchResults}:
    tab.id==="GOG"?{supported:true,games:[]}:
    gamesForLibraryTab(tab,games),[searchMode,searchResults,tab,games,membershipRevision]);
  const shown=useMemo(()=>sortGames(tabResult.games,sort,getSortData()),
    [tabResult.games,sort,metaRevision]);
  // Same Dashboard grid for Steam, GOG and search. Native Steam sort metadata
  // remains authoritative; GOG has no invented installation/playtime fields.
  const gridShown=useMemo(()=>{
    if(searchMode){
      const owned=searchGogEntries(gogGames,searchSelection.query,
        searchSelection.source,searchSelection.installed);
      return combineSearchEntries(shown,owned,sort);
    }
    return combineDashboardEntries(shown,gogGames,tab.id,sort);
  },[shown,gogGames,tab.id,sort,searchMode,searchSelection]);
  const detailGog=gogDetailsId?
    gogGames.find(game=>game.id===gogDetailsId):undefined;
  const selectedGridKey=selectedGogId!==null?"gog:"+selectedGogId:
    selectedId!==undefined?"steam:"+String(selectedId>>>0):undefined;
  const metaProgress=sortKind?
    sortMetadataProgress(sortKind,tabResult.games):null;
  // Native Steam refreshes its overviews every 15s. A fresh array with the
  // same games must NOT cancel an in-flight HLTB search and start it over.
  const metadataQueryIds=tabResult.games.map(g=>g.id+":"+g.title).join("|");
  // Warm the EXISTING local HLTB JSON as soon as a library tab becomes
  // available. This never calls HowLongToBeat; actual remote refresh only
  // begins if the user selects an HLTB sort. Overlapping readers coalesce.
  useEffect(()=>{
    if(!tabResult.supported||!tabResult.games.length)return;
    let mounted=true;
    void primeHltbCache(tabResult.games,()=>{
      // Preloading HLTB while viewing A-Z, Recent or ProtonDB must not
      // trigger an unrelated full-library re-sort and cover rerender.
      if(mounted&&activeSortKind.current==="hltb")
        setMetaRevision(revision=>revision+1);
    });
    return ()=>{mounted=false;};
  },[tab.id,metadataQueryIds,tabResult.supported]);
  useEffect(()=>{
    if(!sortKind||!tabResult.supported||!tabResult.games.length)return;
    return startSortMetadata(sortKind,tabResult.games,()=>
      setMetaRevision(revision=>revision+1));
  },[sortKind,tab.id,metadataQueryIds,tabResult.supported]);
  const homeSelection=gridShown.find(entry=>entry.key===selectedGridKey)??gridShown[0];
  const selected=homeSelection?.store==="steam"?homeSelection.steam:undefined;
  const selectedGog=homeSelection?.store==="gog"?homeSelection.gog:undefined;
  const previewGames = gridShown.slice(0,INITIAL_GAME_COUNT);
  const visibleGridGames = useMemo(()=>gridShown.slice(0,gridLimit),
    [gridShown,gridLimit]);
  /** Save the real origin before handing over to native Steam details. */
  const rememberGameDetails=(game:LibraryGame)=>{
    const focusedIndex=gridShown.findIndex(entry=>entry.store==="steam"&&entry.steam.id===game.id);
    rememberDetailsOrigin({
      route:actualRoute,
      tabId:tab.id,
      gameId:game.id,
      viewAll,
      gridLimit,
      gridScrollTop:fullGridScrollRef.current?.scrollTop??0,
      gridFocusIndex:focusedIndex>=0?focusedIndex:lastGridFocusIndex.current,
    });
  };
  const openGameDetails=(game:LibraryGame)=>{
    const index=gridShown.findIndex(entry=>
      entry.store==="steam"&&entry.steam.id===game.id);
    if(index>=0)lastGridFocusIndex.current=index;
    // The grid DOM is temporarily replaced by Game Details. Keep its exact
    // position and focus target rather than B landing on generic Library Home.
    const clickedHomeDetails=initialMode==="home"&&!viewAll&&
      (homeActionRefs.current[1]===document.activeElement||
       homeActionRefs.current[1]?.contains(document.activeElement));
    steamReturnTarget.current={
      kind:collectionsMode?"collections":viewAll||searchMode?"grid":
        clickedHomeDetails?"home-action":"home-card",
      gameId:game.id,index:index>=0?index:lastGridFocusIndex.current,
      scrollTop:fullGridScrollRef.current?.scrollTop??0,
    };
    setSteamDetailsGame(game);
  };
  const openNativeGameDetails=(game:LibraryGame)=>{
    rememberGameDetails(game);
    openDetails(game);
  };
  const runGameAction=(game:LibraryGame)=>{
    // Never arm a return for successful installed-game launches.
    if(!game.installed)rememberGameDetails(game);
    play(game);
  };
  // Hero images are resolved on selection to honor custom SteamGridDB artwork.
  const openLocalSearch=()=>{
    if(searchMode){
      // A on the selected Search rail item returns to the editable field.
      searchInputRef.current?.querySelector("input")?.focus();
      return;
    }
    rememberSearchOrigin(actualRoute);
    Navigation.Navigate(SEARCH_ROUTE);
  };

  const openCollections=()=>{
    // Opening Collections from the rail should always show the four cards,
    // not a previously selected group from a Game Details return.
    resetCollectionLocation();
    if(collectionsMode)setCollectionsPageRevision(revision=>revision+1);
    else Navigation.Navigate(COLLECTIONS_ROUTE);
  };

  const railActions: RailAction[] = [
    ...(runningGame ? [{
      id:"running",label:runningGame.title,icon:MdVideogameAsset,
      go:()=>{
        const ok=resumeRunningGame(runningGame,(window as any).SteamUIStore,
          ()=>Navigation.Navigate("/apprunning"));
        if(!ok)setRunningGame(null); // stale item; never try RunGame.
      }
    }] : []),
    { id: "home", label: "Home", icon: MdHome, go: () => Navigation.Navigate("/library/home") },
    { id: "library", label: "Library", icon: MdLibraryBooks, go: () => Navigation.Navigate(LIBRARY_ROUTE) },
    { id: "search", label: "Search", icon: MdSearch, go: openLocalSearch },
    { id: "collections", label: "Collections", icon: MdCollectionsBookmark, go: openCollections },
    { id: "appearance", label: "Appearance", icon: MdPalette, go: () => Navigation.Navigate(APPEARANCE_ROUTE) },
    { id: "settings", label: "Settings", icon: MdSettings, go: () => Navigation.Navigate(PLUGIN_SETTINGS_ROUTE) },
    { id: "steam-menu", label: "Steam Menu", icon: MdMenu, go: () => {
      if(!openNativeSteamMenu(Navigation))toaster.toast({
        title:"Game Library",
        body:"The native Steam menu is unavailable on this client. Use the Steam button."
      });
    } },
  ];

  // Inserting/removing the transient first item must not silently remap
  // the previously focused Home/Library/Search/Collections/Appearance icon to another action.
  useEffect(()=>{
    const index=railActions.findIndex(action=>action.id===lastRailId.current);
    if(index>=0){setRailIndex(index);return;}
    lastRailId.current="home";
    setRailIndex(0);
    if(railExpanded)window.requestAnimationFrame(()=>railRefs.current[0]?.focus());
  },[runningGame?.id]);

  const focusRail = (index: number) => {
    const target = (index + railActions.length) % railActions.length;
    setRailIndex(target);
    lastRailId.current=railActions[target].id;
    setRailExpanded(true);
    railRefs.current[target]?.focus();
  };
  const searchStarted=useRef(false);
  useEffect(()=>{
    if(!searchMode)return;
    if(!searchStarted.current){searchStarted.current=true;return;}
    pendingGridIndex.current=null;
    lastGridFocusIndex.current=0;
    setSelectedId(undefined);setSelectedGogId(null);
    setGridLimit(60);
    if(fullGridScrollRef.current)fullGridScrollRef.current.scrollTop=0;
  },[searchMode,searchSelection]);
  const commitGridFocus = (index:number):boolean => {
    const node=fullGridRefs.current[index];
    if (!node || !node.isConnected) return false;
    node.focus();
    node.scrollIntoView({block:"nearest",inline:"nearest"});
    lastGridFocusIndex.current=index;
    const entry=gridShown[index];
    if(entry?.store==="steam"){
      setSelectedId(entry.steam.id);
      setSelectedGogId(null);
    }else if(entry?.store==="gog"){
      setSelectedId(undefined);
      setSelectedGogId(entry.gog.id);
    }
    return true;
  };
  const focusGrid = (index:number) => {
    if (!gridShown.length) return;
    const target=Math.max(0,Math.min(gridShown.length-1,index));
    if(target >= gridLimit) {
      pendingGridIndex.current=target;
      setGridLimit(limit=>Math.min(gridShown.length,Math.max(limit+60,target+1)));
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
  },[viewAll,gridLimit,gridShown.length,activeTab,sort]);
  const enterAlphabet=(index:number)=>{
    if(!libraryAlphabetActive)return;
    alphabetReturnGridIndex.current=index;
    alphabetRailRef.current?.focus();
  };
  const leaveAlphabet=()=>{
    const index=alphabetReturnGridIndex.current??lastGridFocusIndex.current;
    alphabetReturnGridIndex.current=null;
    focusGrid(index);
  };
  const jumpFromAlphabet=(index:number)=>{
    alphabetReturnGridIndex.current=null;
    // focusGrid retains existing progressive 60-card loading. It focuses
    // the requested target only after that batch has actually rendered.
    focusGrid(index);
  };
  const moveInGrid = (index:number, button:GamepadButton) => {
    if(searchMode&&(button===GamepadButton.BUMPER_LEFT||
      button===GamepadButton.BUMPER_RIGHT))return;
    if(button===GamepadButton.BUMPER_LEFT){cycleTab(-1);return;}
    if(button===GamepadButton.BUMPER_RIGHT){cycleTab(1);return;}
    const direction:GridDirection|undefined =
      button===GamepadButton.DIR_LEFT?"left":
      button===GamepadButton.DIR_RIGHT?"right":
      button===GamepadButton.DIR_UP?"up":
      button===GamepadButton.DIR_DOWN?"down":undefined;
    if(!direction)return;
    const columns=getGridColumnCount(fullGridLayoutRef.current);
    if(searchMode&&direction==="up"&&index<columns){
      firstSearchFilterRef.current?.focus();
      return;
    }
    if (canEnterNavigationRail(index, gridShown.length, columns, direction)) {
      // This is an explicit first-column -> sidebar transition, not Steam's
      // free-form spatial focus search. Right/B returns to the same game.
      lastGridFocusIndex.current=index;
      focusRail(railIndex);
      return;
    }
    if(libraryAlphabetActive&&direction==="right"&&
       isRightEdgeGame(index,gridShown.length,columns)){
      enterAlphabet(index);
      return;
    }
    const target=gridNeighbor(index,gridShown.length,columns,direction);
    if(target!==index)focusGrid(target);
    // Right/down/up at grid boundaries remain bounded to the grid.
  };
  const goToGame = (index?: number) => {
    setRailExpanded(false);
    if(collectionsMode){
      collectionsEntryRef.current?.focus();
      return;
    }
    if(tabsMode){tabsEntryRef.current?.focus();return;}
    if(settingsMode){settingsEntryRef.current?.focus();return;}
    if(initialMode==="appearance"){
      appearanceEntryRef.current?.focus();
      return;
    }
    if(searchMode){
      // Right/B from the expanded Search rail always targets the input,
      // even when a previous query already has results.
      searchInputRef.current?.querySelector("input")?.focus();
      return;
    }
    if (viewAll) {
      focusGrid(index ?? lastGridFocusIndex.current);
      return;
    }
    const next = Math.max(0, Math.min(previewGames.length - 1, index ?? 0));
    const target = gameRefs.current[next];
    if (target) {
      target.focus();
      target.scrollIntoView({block:"nearest",inline:"nearest"});
      const entry=previewGames[next];
      if(entry.store==="steam"){
        setSelectedId(entry.steam.id);setSelectedGogId(null);
      }else{
        setSelectedId(undefined);setSelectedGogId(entry.gog.id);
      }
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
    const first=previewGames[0];
    setSelectedId(first?.store==="steam"?first.steam.id:undefined);
    setSelectedGogId(first?.store==="gog"?first.gog.id:null);
    setViewAll(false);
    window.requestAnimationFrame(()=>viewMoreRef.current?.focus());
  };
  const closeSteamDetails=()=>{
    // Never call Library's exitGrid, Steam Back, or Navigation.Navigate here.
    // Same Dashboard instance retains tab, sort, selected game and position.
    setSteamDetailsGame(null);
  };
  useEffect(()=>{
    if(steamDetailsGame||!steamReturnTarget.current)return;
    const snapshot=steamReturnTarget.current;
    if(snapshot.kind==="collections"){
      // CollectionsPage already persists {section, tabId, gameId} and
      // restores its actual card on remount. Don't override it with rail.
      steamReturnTarget.current=null;
      return;
    }
    let frame=0;
    let retry:ReturnType<typeof setTimeout>|undefined;
    let attempts=0;
    const restore=()=>{
      if(++attempts>10){
        // Never leave a repeating timeout running if Steam/React removed
        // the old card from this tab during the Details transition.
        steamReturnTarget.current=null;
        return;
      }
      if(!steamReturnTarget.current)return;
      const index=gridShown.findIndex(entry=>entry.store==="steam"&&
        entry.steam.id===snapshot.gameId);
      const targetIndex=index>=0?index:snapshot.index;
      if(snapshot.kind==="grid"&&targetIndex>=gridLimit){
        setGridLimit(limit=>Math.min(gridShown.length,Math.max(limit+60,targetIndex+1)));
        return;
      }
      const target=snapshot.kind==="grid"?fullGridRefs.current[targetIndex]:
        snapshot.kind==="home-action"?homeActionRefs.current[1]:
        gameRefs.current[targetIndex];
      if(!target?.isConnected){
        // Wait one extra React commit when restoring large virtualized grids.
        retry=window.setTimeout(restore,60);
        return;
      }
      if(snapshot.kind==="grid"&&fullGridScrollRef.current)
        fullGridScrollRef.current.scrollTop=snapshot.scrollTop;
      focusNativeMenuControl(target,GamepadButton.DIR_DOWN);
      lastGridFocusIndex.current=targetIndex;
      steamReturnTarget.current=null;
    };
    frame=window.requestAnimationFrame(restore);
    return ()=>{
      window.cancelAnimationFrame(frame);
      if(retry!==undefined)window.clearTimeout(retry);
    };
  },[steamDetailsGame,gridLimit]);
  const closeGogDetails=()=>{
    setGogDetailsId(null);
    window.requestAnimationFrame(()=>{
      if(viewAll||searchMode)focusGrid(lastGridFocusIndex.current);
      else gameRefs.current[lastGridFocusIndex.current]?.focus();
    });
  };
  useEffect(()=>{
    if(!gogDetailsId)return;
    const frame=window.requestAnimationFrame(()=>gogDetailBackRef.current?.focus());
    return ()=>window.cancelAnimationFrame(frame);
  },[gogDetailsId]);
  const openGogDetails=(entry:Extract<DashboardEntry,{store:"gog"}>,index:number)=>{
    lastGridFocusIndex.current=index;
    setGogDetailsId(entry.gog.id);
  };
  const exitGrid=()=>{
    if(searchMode)Navigation.Navigate(searchBackRoute());
    else if(initialMode==="library")Navigation.Navigate("/library/home");
    else closeGrid();
  };
  const showSortMenu=()=>{
    if(sortOpen)return;
    // Y can be pressed on a cover or the Sort pill; restore that focus on B/A.
    sortReturnFocus.current=document.activeElement instanceof HTMLElement?
      document.activeElement:null;
    setSortOpen(true);
  };
  const closeSortMenu=()=>{
    setSortOpen(false);
    window.requestAnimationFrame(()=>{
      const original=sortReturnFocus.current;
      sortReturnFocus.current=null;
      if(original?.isConnected)original.focus();
      else sortRef.current?.focus();
    });
  };
  const chooseSort=(id:Sort)=>{
    const sortId=searchMode?"__search__":tab.id;
    rememberedSorts[sortId]=id;
    setTabSorts(previous=>({...previous,[sortId]:id}));
    pendingGridIndex.current=null;
    lastGridFocusIndex.current=0;
    setSelectedId(undefined);setSelectedGogId(null);
    closeSortMenu();
  };
  const focusSortItem=(index:number)=>{
    const target=Math.max(0,Math.min(SORT_OPTIONS.length-1,index));
    const element=sortMenuRefs.current[target];
    element?.focus();
    element?.scrollIntoView({block:"nearest"});
  };
  useEffect(()=>{
    if(!sortOpen)return;
    const selectedIndex=Math.max(0,SORT_OPTIONS.findIndex(x=>x.id===sort));
    const frame=window.requestAnimationFrame(()=>focusSortItem(selectedIndex));
    return ()=>window.cancelAnimationFrame(frame);
  },[sortOpen]);
  const autoFocusedLibrary=useRef(false);
  useEffect(()=>{
    if(collectionsMode||!viewAll||!gridShown.length||autoFocusedLibrary.current)return;
    // Native Library is a grid; Home can be in View More full-grid mode.
    if(initialMode!=="library"&&!detailsReturn?.viewAll)return;
    if(searchMode&&!restorePending.current)return;
    const snapshot=restorePending.current;
    if(snapshot&&snapshot.tabId!==tab.id)return;
    const restoredIndex=snapshot?
      gridShown.findIndex(entry=>entry.store==="steam"&&entry.steam.id===snapshot.gameId):-1;
    const target=snapshot?
      restoredIndex>=0?restoredIndex:
        Math.min(snapshot.gridFocusIndex,gridShown.length-1):0;
    if(target>=gridLimit){
      setGridLimit(limit=>Math.max(limit,target+1));
      return;
    }
    autoFocusedLibrary.current=true;
    const frame=window.requestAnimationFrame(()=>{
      if(snapshot&&fullGridScrollRef.current)
        fullGridScrollRef.current.scrollTop=snapshot.gridScrollTop;
      focusGrid(target);
      restorePending.current=null;
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[initialMode,viewAll,tab.id,activeTab,gridShown.length,gridLimit]);
  const autoFocusedHome=useRef(false);
  useEffect(()=>{
    if(collectionsMode||viewAll||!detailsReturn||autoFocusedHome.current||
       detailsReturn.tabId!==tab.id)return;
    const index=previewGames.findIndex(entry=>entry.store==="steam"&&
      entry.steam.id===detailsReturn.gameId);
    if(index<0)return;
    autoFocusedHome.current=true;
    const frame=window.requestAnimationFrame(()=>{
      const card=gameRefs.current[index];
      card?.focus();
      card?.scrollIntoView({block:"nearest",inline:"nearest"});
      restorePending.current=null;
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[viewAll,tab.id,previewGames.length]);
  const focusPill = (index:number) => {
    setRailExpanded(false);
    const target = pillRefs.current[Math.max(0,Math.min(tabs.length - 1,index))];
    target?.focus();
    target?.scrollIntoView({block:"nearest",inline:"nearest"});
  };
  /** L1/R1 move through our own visible tab order. */
  const cycleTab = (direction: number) => {
    if (!tabs.length) return;
    lastGridFocusIndex.current=0;
    const currentIndex = Math.max(0,tabs.findIndex(x => x.id === tab.id));
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    // Refresh Steam's current collection snapshot on tab changes instead
    // of displaying a 15-second-old (possibly not-yet-hydrated) snapshot.
    setGames(getLibraryGames());
    setActiveTab(tabs[nextIndex].id);
    setSelectedGogId(null);
    pendingGridIndex.current=null;
    setViewAll(initialMode==="library");
    setSortOpen(false);
    setGridLimit(60);
    setSelectedId(undefined);
    // Focus target after React applies the new selected tab and game list.
    window.requestAnimationFrame(() => focusPill(nextIndex));
  };
  const handleBumper = (e:GamepadEvent):boolean => {
    if(initialMode==="appearance"||searchMode||collectionsMode||tabsMode||settingsMode)return false;
    if (e.detail?.button === GamepadButton.BUMPER_LEFT) {
      consume(e);cycleTab(-1);return true;
    }
    if (e.detail?.button === GamepadButton.BUMPER_RIGHT) {
      consume(e);cycleTab(1);return true;
    }
    return false;
  };

  /** One card renderer for Steam, GOG and future catalog providers. */
  const renderEntry=(entry:DashboardEntry,index:number,mode:"grid"|"home")=>{
    const select=()=>{
      if(entry.store==="steam"){
        setSelectedId(entry.steam.id);setSelectedGogId(null);
      }else{
        setSelectedId(undefined);setSelectedGogId(entry.gog.id);
      }
      if(mode==="grid"){
        lastGridFocusIndex.current=index;
        if(index>=gridLimit-12&&gridLimit<gridShown.length)
          setGridLimit(limit=>Math.min(limit+60,gridShown.length));
      }
    };
    const move=(button:GamepadButton)=>{
      if(mode==="grid"){moveInGrid(index,button);return;}
      if(button===GamepadButton.DIR_DOWN){
        homeActionRefs.current[0]?.focus();return;
      }
      if(button===GamepadButton.DIR_LEFT)
        index===0?focusRail(railIndex):goToGame(index-1);
      else if(button===GamepadButton.DIR_RIGHT){
        if(index===previewGames.length-1&&gridShown.length>INITIAL_GAME_COUNT)
          viewMoreRef.current?.focus();
        else goToGame(index+1);
      }else if(button===GamepadButton.DIR_UP)focusPill(tabs.indexOf(tab));
      else if(button===GamepadButton.BUMPER_LEFT)cycleTab(-1);
      else if(button===GamepadButton.BUMPER_RIGHT)cycleTab(1);
    };
    const cardRef=(node:HTMLDivElement|null)=>{
      if(mode==="grid")fullGridRefs.current[index]=node;
      else gameRefs.current[index]=node;
    };
    const activate=()=>entry.store==="steam"?
      (mode==="home"?runGameAction(entry.steam):openGameDetails(entry.steam)):
      openGogDetails(entry,index);
    if(entry.store==="steam")return <GameCard key={entry.key}
      game={entry.steam} index={index} captureVertical={mode==="grid"}
      onSelect={select} onMove={move} onSort={showSortMenu}
      cardRef={cardRef} activate={activate}
      onCancel={mode==="grid"?exitGrid:undefined}
      showInstallSize={mode==="grid"&&initialMode==="library"}
      selectedForSize={selectedId===entry.steam.id}/>;
    return <GogDashboardCard key={entry.key} entry={entry} accountId={gogAccountId}
      index={index} onSelect={select} onMove={move}
      onSort={showSortMenu} onActivate={activate}
      onCancel={mode==="grid"?exitGrid:()=>focusRail(railIndex)}
      cardRef={cardRef}/>;
  };

  return (
    <div ref={nativeMenuRoot}
      // Steam renders its original #header over custom Decky routes. The
      // Home replacement does not need this: Home already has one header.
      // The class and its CSS disappear immediately when this route unmounts.
      className={"gl-root" +
        (actualRoute!=="/library/home" ? " gl-own-status-only" : "") +
        (railExpanded ? " gl-nav-expanded" : "")}
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
        aria-label="Game Library navigation"
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
                className={"gl-rail-item"+(action.id==="running"?" gl-running-item":"")+
                  (action.id===(tabsMode?"settings":settingsMode?"settings":collectionsMode?"collections":initialMode==="appearance"?"appearance":
                    searchMode?"search":initialMode==="library"?"library":"home")?" gl-rail-current":"")}
                focusClassName="gl-focused"
                noFocusRing
                onGamepadFocus={() => {
                  lastRailId.current=action.id;
                  setRailIndex(index);
                  setRailExpanded(true);
                }}
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
                {action.id==="running"
                  ? <RunningGameIcon key={runningGame?.id} game={games.find(g=>g.id===runningGame?.id)}/>
                  : <Icon className="gl-rail-icon" />}
                {action.id==="running"
                  ? <RunningGameLabel title={action.label} expanded={railExpanded}/>
                  : <span className="gl-rail-label">{action.label}</span>}
                {action.id==="running"&&<span className="gl-running-indicator" aria-hidden="true"/>}
              </Focusable>
            );
          })}
        </Focusable>
      </aside>

      <div className={"gl-main"+(steamDetailsGame?" gl-main-details":"")}>
        {steamDetailsGame
          ? <SteamGameDetails key={steamDetailsGame.id}
              game={steamDetailsGame}
              onBack={closeSteamDetails}
              onNativeDetails={()=>openNativeGameDetails(steamDetailsGame)}
              onFocusRail={()=>focusRail(railIndex)}/>
          : collectionsMode
          ? <CollectionsPage key={collectionsPageRevision}
              firstRef={collectionsEntryRef}
              games={games} tabs={tabs} membershipRevision={membershipRevision}
              onFocusRail={()=>focusRail(railIndex)}
              onHome={()=>Navigation.Navigate("/library/home")}
              onOpenGame={game=>openGameDetails(game)}/>
          : initialMode==="appearance"
          ? <AppearancePage firstRef={appearanceEntryRef}
              onFocusRail={()=>focusRail(railIndex)}
              onBack={()=>Navigation.Navigate("/library/home")}/>
          : tabsMode ? <TabManager tabs={tabInfo.tabs} games={games}
              firstRef={tabsEntryRef} onFocusRail={()=>focusRail(railIndex)}
              onClose={()=>Navigation.Navigate(PLUGIN_SETTINGS_ROUTE)}/>
          : settingsMode ? <PluginSettingsPage firstRef={settingsEntryRef}
              onFocusRail={()=>focusRail(railIndex)}
              onBack={()=>Navigation.Navigate("/library/home")}/>
          : detailGog ? <SharedLibraryDetails
              game={fromGogLibraryGame(detailGog)}
              cover={<GogArtwork game={detailGog} accountId={gogAccountId} expanded/>}
              onBack={closeGogDetails} backRef={gogDetailBackRef}/>
          : searchMode ? <>
        <header className="gl-header gl-library-topbar" aria-label="Search navigation">
          <div className="gl-topbar-titles"><span className="gl-topbar-current">Search</span></div>
          <SystemStatusBar statusRef={headerStatusRef}
            onStatusButtonDown={(e:GamepadEvent)=>{
              if(e.detail?.button===GamepadButton.DIR_DOWN){
                consume(e);searchInputRef.current?.querySelector("input")?.focus();
              }
            }}/>
        </header>
        <LibrarySearchToolbar
          query={searchSelection.query}
          source={searchSelection.source} installed={searchSelection.installed}
          onQuery={value=>setSearchSelection(current=>({...current,query:value.slice(0,160)}))}
          onSource={value=>setSearchSelection(current=>({...current,source:value}))}
          onInstalled={value=>setSearchSelection(current=>({...current,installed:value}))}
          onFocusRail={()=>focusRail(railIndex)}
          onFocusResults={()=>{if(shown.length)focusGrid(0);}}
          onBack={exitGrid}
          inputRef={searchInputRef} firstFilterRef={firstSearchFilterRef}
          autoFocus={!detailsReturn}/>
        <section className="gl-grid-page gl-search-page" aria-label="Game Library search results">
          <div className="gl-grid-heading">
            <div><h2>Results</h2>
              <span aria-live="polite">{searchSelection.query.trim()
                ?gridShown.length+" matching games · Steam / Epic / GOG / Other"
                :"Search across your entire game library"}</span>
            </div>
            <div className="gl-grid-header-actions">
              <Focusable ref={sortRef} className="gl-grid-back" focusClassName="gl-focused"
                noFocusRing onActivate={showSortMenu}
                onCancelButton={exitGrid} onOKActionDescription="Sort search results"
                onButtonDown={(e:GamepadEvent)=>{
                  const b=e.detail?.button;
                  if(b===GamepadButton.DIR_RIGHT){consume(e);searchBackRef.current?.focus();}
                  else if(b===GamepadButton.DIR_LEFT){consume(e);firstSearchFilterRef.current?.focus();}
                  else if(b===GamepadButton.DIR_UP){consume(e);headerStatusRef.current?.focus();}
                  else if(b===GamepadButton.DIR_DOWN){consume(e);focusGrid(0);}
                }}>
                Sort · {sortLabel(sort)}
              </Focusable>
              <Focusable ref={searchBackRef} className="gl-grid-back" focusClassName="gl-focused"
                noFocusRing onActivate={exitGrid} onCancelButton={exitGrid}
                onOKActionDescription="Return to previous Game Library page"
                onButtonDown={(e:GamepadEvent)=>{
                  const b=e.detail?.button;
                  if(b===GamepadButton.DIR_LEFT){consume(e);sortRef.current?.focus();}
                  else if(b===GamepadButton.DIR_UP){consume(e);headerStatusRef.current?.focus();}
                  else if(b===GamepadButton.DIR_DOWN){consume(e);focusGrid(0);}
                }}>
                <MdArrowBack/> Back
              </Focusable>
            </div>
          </div>
          {sortOpen&&<Focusable className="gl-sort-menu gl-search-sort-menu"
            flow-children="column" aria-label="Sort search results">
            <div className="gl-sort-menu-title">SORT SEARCH RESULTS</div>
            {SORT_OPTIONS.map((option,index)=><Focusable key={option.id}
              ref={el=>{sortMenuRefs.current[index]=el;}}
              className={"gl-sort-option"+(sort===option.id?" gl-sort-selected":"")}
              focusClassName="gl-focused" noFocusRing
              onActivate={()=>chooseSort(option.id)}
              onCancelButton={closeSortMenu}
              onButtonDown={(e:GamepadEvent)=>{
                const button=e.detail?.button;
                if(button===GamepadButton.DIR_UP){consume(e);focusSortItem(index-1);}
                else if(button===GamepadButton.DIR_DOWN){consume(e);focusSortItem(index+1);}
                else if(button===GamepadButton.DIR_LEFT){consume(e);closeSortMenu();}
              }}>
              <span>{option.label}</span>
              {sort===option.id&&<MdCheckCircle aria-hidden="true"/>}
            </Focusable>)}
            <div className="gl-sort-menu-hint">A Select · B Close</div>
          </Focusable>}
          {gridShown.length>0
            ? <SharedLibraryGrid scrollRef={fullGridScrollRef} gridRef={fullGridLayoutRef}>
                {visibleGridGames.map((entry,index)=>renderEntry(entry,index,"grid"))}
              </SharedLibraryGrid>
            : <div className="gl-search-empty">
                <MdLibraryBooks aria-hidden="true"/>
                <h2>{searchSelection.query.trim()?"No matching games":"Find a game"}</h2>
                <p>{searchSelection.query.trim()
                  ?"Try another title or change the source / availability filters."
                  :"Enter a title to search Steam, Epic, GOG and other shortcuts."}</p>
              </div>}
          <div className="gl-grid-hint">A: Game details · Y: Sort · Start: Steam options · B: Back</div>
        </section>
          </> : <>
        {!viewAll && (selected||selectedGog) && <div className="gl-scene" aria-hidden="true">
          {selected?<HeroBackdrop key={selected.id} game={selected}/>:
            selectedGog?.background?<img className="gl-hero" src={selectedGog.background} alt=""/>:null}
          <div className="gl-scene-shade"/>
        </div>}
        {/* Active tab title is separate from the floating, pill-shaped status controls. */}
        <header className="gl-header gl-library-topbar" aria-label="Library navigation">
          <div className="gl-topbar-titles">
            <span className="gl-topbar-current" title={tab.title} aria-live="polite">{tab.title}</span>
          </div>
          <SystemStatusBar statusRef={headerStatusRef}
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
                onOptionsButton={(e:GamepadEvent)=>{consume(e);showSortMenu();}}
                onOptionsActionDescription="Sort games"
                onActivate={() => { pendingGridIndex.current=null; setGames(getLibraryGames()); setActiveTab(item.id); setSelectedGogId(null); setViewAll(initialMode==="library"); setSortOpen(false); setGridLimit(60); setSelectedId(undefined); }}
                onButtonDown={(e:GamepadEvent) => {
                  if(handleBumper(e))return;
                  const b=e.detail?.button;
                  if(b===GamepadButton.DIR_UP){consume(e);headerStatusRef.current?.focus();}
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
            onActivate={showSortMenu}
            onOptionsButton={(e:GamepadEvent)=>{consume(e);showSortMenu();}}
            onOptionsActionDescription="Sort games"
            onButtonDown={(e:GamepadEvent)=>{
              if(handleBumper(e))return;
              if(e.detail?.button===GamepadButton.DIR_LEFT){consume(e);focusPill(tabs.length-1);}
              else if(e.detail?.button===GamepadButton.DIR_DOWN){consume(e);showSortMenu();}
            }}
            onOKActionDescription="Choose sorting">
            <MdAccessTime /> {sortLabel(sort)}
          </Focusable>
          {sortOpen && <Focusable className="gl-sort-menu" flow-children="column"
            aria-label="Sort games">
            <div className="gl-sort-menu-title">SORT GAMES</div>
            {SORT_OPTIONS.map((option,index)=><Focusable
              key={option.id}
              ref={el=>{sortMenuRefs.current[index]=el;}}
              className={"gl-sort-option"+(sort===option.id?" gl-sort-selected":"")}
              focusClassName="gl-focused"
              noFocusRing
              onActivate={()=>chooseSort(option.id)}
              onCancelButton={closeSortMenu}
              onOKActionDescription={option.label}
              onButtonDown={(e:GamepadEvent)=>{
                const button=e.detail?.button;
                if(button===GamepadButton.DIR_UP){consume(e);focusSortItem(index-1);}
                else if(button===GamepadButton.DIR_DOWN){consume(e);focusSortItem(index+1);}
                else if(button===GamepadButton.DIR_LEFT){consume(e);closeSortMenu();}
              }}>
              <span>{option.label}</span>
              {sort===option.id&&<MdCheckCircle aria-hidden="true"/>}
            </Focusable>)}
            <div className="gl-sort-menu-hint">A Select · B Close · No Random</div>
          </Focusable>}
        </nav>
        {!viewAll && sortKind && metaProgress &&
          metaProgress.done<metaProgress.total &&
          <div className="gl-sort-progress-slot gl-sort-progress-home">
            <SortProgressNotice kind={sortKind} done={metaProgress.done}
              total={metaProgress.total}/>
          </div>}

        {gridShown.length > 0 ? (
          viewAll ? (
            <section className={"gl-grid-page"+
              (libraryAlphabetActive?" gl-alphabet-enabled":"")}
              aria-label={"All games: "+tab.title}>
              <div className="gl-grid-heading">
                <div><h2>{initialMode==="library"?"Library · "+tab.title:tab.title}</h2>
                  <span>{gridShown.length} games · Midnight Library</span></div>
                <div className="gl-grid-header-actions">
                  {initialMode==="library"&&<Focusable
                    ref={nativeLibraryRef}
                    className="gl-grid-back gl-native-library" noFocusRing focusClassName="gl-focused"
                    onActivate={()=>Navigation.Navigate("/library")}
                    onButtonDown={(e:GamepadEvent)=>{
                      const b=e.detail?.button;
                      if(b===GamepadButton.DIR_RIGHT){consume(e);libraryBackRef.current?.focus();}
                      else if(b===GamepadButton.DIR_LEFT){consume(e);focusRail(railIndex);}
                      else if(b===GamepadButton.DIR_DOWN){consume(e);focusGrid(0);}
                      else if(b===GamepadButton.DIR_UP){consume(e);headerStatusRef.current?.focus();}
                    }}
                    onOKActionDescription="Open original Steam library">
                    Steam Library
                  </Focusable>}
                  <Focusable ref={libraryBackRef} className="gl-grid-back" noFocusRing focusClassName="gl-focused"
                    onActivate={exitGrid} onCancelButton={exitGrid}
                    onButtonDown={(e:GamepadEvent)=>{
                      const b=e.detail?.button;
                      if(b===GamepadButton.DIR_LEFT){consume(e);
                        (initialMode==="library"?nativeLibraryRef.current:null)?.focus();
                        if(initialMode!=="library")focusRail(railIndex);
                      }else if(b===GamepadButton.DIR_DOWN){consume(e);focusGrid(0);}
                      else if(b===GamepadButton.DIR_UP){consume(e);headerStatusRef.current?.focus();}
                    }}
                    onOKActionDescription={initialMode==="library"?"Return Home":"Back to games"}>
                    <MdArrowBack/> {initialMode==="library"?"Home":"Back to carousel"}
                  </Focusable>
                </div>
              </div>
              {sortKind && metaProgress && metaProgress.done<metaProgress.total &&
                <div className="gl-sort-progress-slot gl-sort-progress-grid">
                  <SortProgressNotice kind={sortKind} done={metaProgress.done}
                    total={metaProgress.total}/>
                </div>}
              <SharedLibraryGrid scrollRef={fullGridScrollRef} gridRef={fullGridLayoutRef}>
                  {visibleGridGames.map((entry,index)=>renderEntry(entry,index,"grid"))}
              </SharedLibraryGrid>
              {libraryAlphabetActive&&<LibraryAlphabetIndicator
                key={tab.id+":"+sort}
                games={visibleGridGames} allGames={gridShown}
                focusedGameId={selectedId} focusedGameKey={selectedGridKey}
                descending={sort==="alphabetical-desc"}
                scrollRef={fullGridScrollRef} gridRef={fullGridLayoutRef}
                railRef={alphabetRailRef}
                onJumpToGame={jumpFromAlphabet}
                onReturnToGame={leaveAlphabet}
                onOpenSort={showSortMenu}
                onChangeTab={cycleTab}/>}
              <div className="gl-grid-hint">A: Game details · Y: Sort · Start: Steam options · B: {initialMode==="library"?"Home":"Back"} · L1/R1: Tabs</div>
            </section>
          ) : (
          <>
            <Focusable className="gl-strip" flow-children="row">
              {previewGames.map((entry,index)=>renderEntry(entry,index,"home"))}
              {gridShown.length>INITIAL_GAME_COUNT &&
                <Focusable ref={viewMoreRef} className="gl-view-more" noFocusRing focusClassName="gl-focused"
                  onOptionsButton={(e:GamepadEvent)=>{consume(e);showSortMenu();}}
                  onOptionsActionDescription="Sort games"
                  onActivate={openGrid} onOKActionDescription="View all games"
                  onButtonDown={(e:GamepadEvent)=>{
                    const b=e.detail?.button;
                    if(b===GamepadButton.DIR_LEFT){consume(e);goToGame(previewGames.length-1);}
                    else if(b===GamepadButton.DIR_UP){consume(e);focusPill(tabs.indexOf(tab));}
                    else if(b===GamepadButton.DIR_DOWN){
                      consume(e);homeActionRefs.current[0]?.focus();
                    }
                    else if(handleBumper(e))return;
                  }}>
                  <MdChevronRight size={42}/>
                  <strong>View More</strong>
                  <span>All {gridShown.length} games</span>
                </Focusable>}
            </Focusable>

            {selectedGog&&<section className="gl-feature" aria-label="Selected GOG game">
              <div className="gl-feature-content">
                <h1>{selectedGog.title}</h1>
                <div className="gl-status">
                  <span><MdCheckCircle/> Owned on GOG</span>
                  <span>GOG</span>
                </div>
                <div className="gl-metrics">
                  <div className="gl-metric">
                    <MdLibraryBooks/><div><small>LIBRARY</small><strong>GOG</strong></div>
                  </div>
                </div>
                <Focusable className="gl-actions" flow-children="row">
                  <Focusable ref={el=>{homeActionRefs.current[0]=el;}}
                    className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing
                    onActivate={()=>{
                      const entry=previewGames.find((x):x is Extract<DashboardEntry,{store:"gog"}>=>
                        x.store==="gog"&&x.gog.id===selectedGog.id);
                      if(entry)openGogDetails(entry,previewGames.indexOf(entry));
                    }}
                    onButtonDown={(e:GamepadEvent)=>{
                      const b=e.detail?.button;
                      if(b===GamepadButton.DIR_UP||b===GamepadButton.DIR_LEFT){
                        consume(e);
                        goToGame(Math.max(0,previewGames.findIndex(entry=>
                          entry.store==="gog"&&entry.gog.id===selectedGog.id)));
                      }
                    }} onCancelButton={()=>goToGame()}>
                    <MdInfo/> Game Details
                  </Focusable>
                </Focusable>
              </div>
            </section>}
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
                  <Focusable ref={el=>{homeActionRefs.current[0]=el;}}
                    className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing
                    onActivate={() => runGameAction(selected)} onOKActionDescription={gameActionLabel(selected)}
                    onButtonDown={(e:GamepadEvent)=>{
                      const b=e.detail?.button;
                      if(b===GamepadButton.DIR_RIGHT){consume(e);homeActionRefs.current[1]?.focus();}
                      else if(b===GamepadButton.DIR_LEFT||b===GamepadButton.DIR_UP){
                        consume(e);goToGame(Math.max(0,previewGames.findIndex(entry=>entry.store==="steam"&&entry.steam.id===selected.id)));
                      }
                    }} onCancelButton={()=>goToGame()}>
                    {selected.installed ? <MdPlayArrow /> : <MdDownload />} {gameActionLabel(selected)}
                  </Focusable>
                  <Focusable ref={el=>{homeActionRefs.current[1]=el;}}
                    className="gl-button" focusClassName="gl-focused" noFocusRing
                    onActivate={() => openGameDetails(selected)} onOKActionDescription="Game details"
                    onButtonDown={(e:GamepadEvent)=>{
                      const b=e.detail?.button;
                      if(b===GamepadButton.DIR_LEFT){consume(e);homeActionRefs.current[0]?.focus();}
                      else if(b===GamepadButton.DIR_UP){consume(e);
                        goToGame(Math.max(0,previewGames.findIndex(entry=>entry.store==="steam"&&entry.steam.id===selected.id)));
                      }
                    }} onCancelButton={()=>goToGame()}>
                    <MdInfo /> Game Details
                  </Focusable>

                </Focusable>
              </div>
            </section>}
          </>
          )
        ) : (
          <div className="gl-empty">
            <h1>{!tabResult.supported ? "Open this tab in Steam" :
              tab.id==="GOG"?"No GOG games in your library":
              games.length===0&&gogGames.length===0?"Your library is not available yet":
              "No games in this tab"}</h1>
            <p>{!tabResult.supported ? tabResult.reason
              : tab.id==="GOG"?"Connect or refresh your GOG account in Plugin Settings.":
                games.length===0&&gogGames.length===0?(hasLibraryStore()
                  ?"Steam has not returned app overviews yet.":"Steam collectionStore is not ready.")
                  :"Choose another tab to find games."}</p>
            <Focusable className="gl-button gl-primary" focusClassName="gl-focused" noFocusRing
              onActivate={()=>Navigation.Navigate(tab.id==="GOG"?
                "/game-library/plugin-settings":"/library")}
              onOKActionDescription={tab.id==="GOG"?"Open Plugin Settings":"Open Steam library"}>
              {tab.id==="GOG"?"GOG Settings":"Open Steam Library"}
            </Focusable>
          </div>
        )}


        <footer className="gl-footer"><span>STEAM · Menu</span><span>L1 / R1 · Tabs</span><span>A Select</span><span>B Back</span><span>← Navigation</span></footer>
        </>}
      </div>
    </div>
  );
}
