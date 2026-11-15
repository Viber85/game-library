import { callable } from "@decky/api";
import { getCollectionIdSet, getUnifideckCollectionIds, LibraryGame } from "./steam";

export type TabMasterFilter = { type: string; inverted?: boolean; params?: Record<string, any> };
export type SteamTab = {
  id: string;
  title: string;
  position: number;
  filters: TabMasterFilter[] | null;
  filtersMode: "and" | "or";
};
type TabResponse = { available: boolean; reason: string; tabs: SteamTab[] };

const getTabMasterTabs = callable<[string], TabResponse>("get_tabmaster_tabs");

export async function loadSteamTabs(userId: string): Promise<TabResponse> {
  if (!userId) return { available: false, reason: "Steam account not ready", tabs: [] };
  try {
    const tabs = await getTabMasterTabs(userId);
    return tabs && Array.isArray(tabs.tabs) ? tabs
      : { available:false, reason:"Invalid TabMaster response", tabs:[] };
  } catch (e) {
    return { available:false, reason:"TabMaster bridge unavailable: "+String(e), tabs:[] };
  }
}

export const fallbackTabs: SteamTab[] = [
  { id:"AllGames", title:"All Games", position:0, filters:null, filtersMode:"and" },
  { id:"Installed", title:"Installed", position:1, filters:null, filtersMode:"and" },
  { id:"Favorites", title:"Favorites", position:2, filters:null, filtersMode:"and" },
  { id:"NonSteam", title:"Non-Steam", position:3, filters:null, filtersMode:"and" },
];

type Predicate = (game: LibraryGame) => boolean;

function matchFilter(filter: TabMasterFilter, depth=0): Predicate | null {
  const p = filter.params ?? {};
  let fn: Predicate | null = null;
  if (depth > 3) return null;
  switch (filter.type) {
    case "collection": {
      const id = p.id ?? p.collection;
      const name = typeof p.name === "string" ? p.name : undefined;
      const set = typeof id === "string" ? getCollectionIdSet(id, name) : null;
      if (set) fn = g => set.has(g.id);
      break;
    }
    case "installed":
      if (typeof p.installed === "boolean")
        fn = g => g.installed === p.installed;
      break;
    case "platform":
      if (p.platform === "steam" || p.platform === "nonSteam")
        fn = g => g.nonSteam === (p.platform === "nonSteam");
      break;
    case "whitelist":
    case "blacklist": {
      if (!Array.isArray(p.games)) break;
      const ids = new Set(p.games.map(Number).filter(Number.isSafeInteger));
      fn = filter.type === "whitelist" ? g => ids.has(g.id) : g => !ids.has(g.id);
      break;
    }
    case "regex":
      if (typeof p.regex !== "string" || p.regex.length > 120) break;
      try {
        const pattern = new RegExp(p.regex, "i");
        fn = g => pattern.test(g.title);
      } catch { /* invalid TabMaster pattern; use native Steam instead */ }
      break;
    case "merge": {
      const children = Array.isArray(p.filters) ? p.filters.map((f:TabMasterFilter)=>matchFilter(f,depth+1)) : [];
      if (!children.length || children.some(x=>x===null)) break;
      const preds=children as Predicate[];
      fn = p.mode === "or" ? g=>preds.some(f=>f(g)) : g=>preds.every(f=>f(g));
      break;
    }
    default: break;
  }
  // TabMaster only permits inversion for selected filter types.
  if (fn && filter.inverted) {
    const wrapped = fn;
    return g => !wrapped(g);
  }
  return fn;
}

/** Unsupported custom TabMaster filters fail CLOSED rather than displaying a false result. */
export function gamesForTab(tab: SteamTab, games: LibraryGame[]): {
  supported: boolean;
  games: LibraryGame[];
  reason?: string;
} {
  // TabMaster may have an Epic/GOG tab whose backing Unifideck collection
  // was recreated with a different ID. Resolve the exact native Steam collection.
  const source = /^epic$/i.test(tab.title.trim()) ? "Epic" :
    /^gog$/i.test(tab.title.trim()) ? "GOG" : null;
  const collectionFallback = (source && (!tab.filters ||
    (tab.filters.length === 1 && tab.filters[0].type === "collection")))
      ? getUnifideckCollectionIds(source) : null;
  if (!tab.filters) {
    if (collectionFallback !== null)
      return {supported:true, games:games.filter(g=>collectionFallback.has(g.id))};
    switch(tab.id.toLowerCase()) {
      case "allgames": return { supported:true, games };
      case "installed": return { supported:true, games:games.filter(g=>g.installed) };
      case "favorites": return { supported:true, games:games.filter(g=>g.favorite) };
      case "nonsteam": return { supported:true, games:games.filter(g=>g.nonSteam) };
      default:
        return { supported:false, games:[], reason:"This native Steam tab cannot be reproduced here yet." };
    }
  }
  const predicates = tab.filters.map(f=>matchFilter(f));
  if (predicates.some(x=>x===null)) {
    if(collectionFallback !== null) {
      return {supported:true, games:games.filter(g=>collectionFallback.has(g.id))};
    }
    return { supported:false, games:[], reason:
      source ? "Unifideck "+source+" collection not available. Sync Unifideck and restart Steam." :
      "This TabMaster tab uses filters that require Steam's native tab view." };
  }
  const fns=predicates as Predicate[];
  return { supported:true, games:games.filter(g=>tab.filtersMode==="or"
    ? fns.some(fn=>fn(g)) : fns.every(fn=>fn(g))) };
}
