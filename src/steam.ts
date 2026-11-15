import { Navigation } from "@decky/ui";

export interface LibraryGame {
  id: number;
  title: string;
  installed: boolean;
  favorite: boolean;
  nonSteam: boolean;
  lastPlayed: number;
  playtimeMinutes: number;
  achievementsUnlocked?: number;
  achievementsTotal?: number;
  poster?: string;
  hero?: string;
}

type AnyObject = Record<string, any>;
type SteamGlobals = Window & {
  appStore?: AnyObject;
  collectionStore?: AnyObject;
  SteamClient?: AnyObject;
  App?: { m_CurrentUser?: { strSteamID?: string } };
  appAchievementProgressCache?: AnyObject;
};
const globals = () => window as SteamGlobals;
const obj = (v: unknown): AnyObject | null => v && typeof v === "object" ? v as AnyObject : null;
const asArray = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (v instanceof Map || v instanceof Set) return Array.from(v.values());
  if (v && typeof v === "object") return Object.values(v);
  return [];
};
const firstString = (...vs: unknown[]): string => vs.find(x => typeof x === "string" && x.length > 0) as string || "";
const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : 0;
const pathFromAsset = (v: unknown): string | undefined => {
  if (typeof v === "string" && /^(https?:|data:|file:)/.test(v)) return v;
  if (Array.isArray(v)) return v.map(pathFromAsset).find(Boolean);
  return undefined;
};

function collectionRows(id: string): any[] {
  try {
    const c = globals().collectionStore?.GetCollection?.(id);
    return asArray(c?.allApps ?? c?.visibleApps ?? c?.apps);
  } catch {
    return [];
  }
}

function allRows(): any[] {
  // Native Steam/TabMaster use collectionStore; the old adapter only read
  // appStore.m_rgApps and returned an empty array on current SteamOS versions.
  const ids = ["type-games", "type-nonsteam", "desk-desktop-apps", "favorite",
    "local-install", "AllGames", "all", "all-games"];
  const rows = ids.flatMap(collectionRows);
  if (rows.length) return rows;
  const store = globals().appStore;
  try {
    return asArray(store?.GetAllApps?.() ?? store?.m_rgApps ??
      store?.m_rgAllApps ?? store?.m_mapApps ?? store?.m_mapAppOverview);
  } catch (e) {
    console.warn("[game-library] overview fallback failed", e);
    return [];
  }
}

function gameFromRow(row: unknown): LibraryGame | null {
  const appStore = globals().appStore as AnyObject | undefined;
  const candidate = obj(row);
  const rawId = typeof row === "number" ? row
    : candidate?.appid ?? candidate?.app_id ?? candidate?.id;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const overview = obj(appStore?.GetAppOverviewByAppID?.(id)) || candidate;
  if (!overview) return null;
  const title = firstString(overview.display_name, overview.name, candidate?.display_name);
  if (!title) return null;
  const appType = Number(overview.app_type ?? candidate?.app_type ?? 1);
  const nonSteam = appType === 1073741824 || overview.is_shortcut === true ||
    overview.is_non_steam_game === true;
  const customPoster = pathFromAsset(appStore?.GetCustomVerticalCapsuleURLs?.(overview));
  const customHero = pathFromAsset(appStore?.GetCustomHeroImageURLs?.(overview));
  return {
    id, title,
    installed: !!(overview.installed ?? overview.BIsInstalled ??
      overview.bIsInstalled ?? overview.is_installed),
    favorite: !!(overview.is_favorite ?? overview.favorite),
    nonSteam,
    lastPlayed: finite(overview.rt_last_time_played ?? overview.rt_last_time_locally_played),
    playtimeMinutes: finite(overview.minutes_playtime_forever),
    achievementsUnlocked: typeof overview.achievements_achieved === "number" ? overview.achievements_achieved : undefined,
    achievementsTotal: typeof overview.achievements_total === "number" ? overview.achievements_total : undefined,
    poster: customPoster, hero: customHero,
  };
}

export function getLibraryGames(): LibraryGame[] {
  const games = new Map<number, LibraryGame>();
  for (const row of allRows()) {
    try {
      const game = gameFromRow(row);
      if (game) {
        const prev = games.get(game.id);
        if (!prev || (!prev.poster && game.poster)) games.set(game.id, game);
      }
    } catch (e) {
      // One broken overview must not blank the whole library.
      console.warn("[game-library] skipping overview", e);
    }
  }
  const favoriteIds = new Set(collectionRows("favorite").map(row =>
    Number(typeof row === "number" ? row : row?.appid)));
  const installedIds = new Set(collectionRows("local-install").map(row =>
    Number(typeof row === "number" ? row : row?.appid)));
  for (const game of games.values()) {
    if (favoriteIds.has(game.id)) game.favorite = true;
    if (installedIds.has(game.id)) game.installed = true;
  }
  return [...games.values()].sort((a,b)=>b.lastPlayed-a.lastPlayed || a.title.localeCompare(b.title));
}

export function getCollectionIdSet(collectionId: string): Set<number> | null {
  if (!/^[\w:.-]{1,150}$/.test(collectionId)) return null;
  try {
    const collection = globals().collectionStore?.GetCollection?.(collectionId);
    if (!collection) return null;
    return new Set(asArray(collection.allApps ?? collection.visibleApps ?? collection.apps)
      .map(x=>Number(typeof x === "number" ? x : x?.appid)).filter(Number.isSafeInteger));
  } catch { return null; }
}

export function getActiveUserId(): string {
  try {
    const steamId = globals().App?.m_CurrentUser?.strSteamID ||
      (window as any).SteamClient?.User?.GetSteamID?.();
    return steamId ? (BigInt(String(steamId)) & BigInt(0xffffffff)).toString() : "";
  } catch { return ""; }
}

export function hasLibraryStore(): boolean {
  return !!globals().collectionStore || !!globals().appStore;
}
export function posterUrl(game: LibraryGame): string | undefined {
  return game.poster || (game.nonSteam ? undefined :
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/"+game.id+"/library_600x900.jpg");
}
export function heroUrl(game: LibraryGame): string | undefined {
  return game.hero || (game.nonSteam ? undefined :
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/"+game.id+"/library_hero.jpg");
}
export function openDetails(game: LibraryGame): void {
  Navigation.Navigate("/library/app/"+game.id);
}
export function play(game: LibraryGame): void {
  try {
    const apps = globals().SteamClient?.Apps;
    if (typeof apps?.RunGame === "function" && (game.installed || game.nonSteam)) {
      apps.RunGame(String(game.id), "", 0, 100);
      return;
    }
  } catch (e) { console.warn("[game-library] unable to launch", e); }
  openDetails(game);
}
export function lastPlayedLabel(timestamp: number): string {
  if (!timestamp) return "Never";
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? "Unknown" :
    date.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
}
export function playtimeLabel(minutes: number): string {
  return minutes > 0 ? (minutes / 60).toFixed(1)+" h" : "—";
}
