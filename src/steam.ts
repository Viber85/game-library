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
/** Steam caches art on steamloopback.host and returns root-relative URLs. */
function resolveArtUrl(url: unknown): string | undefined {
  if (typeof url !== "string" || !url.trim()) return undefined;
  const candidate = url.trim();
  if (/^https?:\/\//i.test(candidate) || /^data:image\//i.test(candidate)) return candidate;
  if (candidate.startsWith("/")) return "https://steamloopback.host" + candidate;
  if (candidate.startsWith("steamloopback.host/")) return "https://" + candidate;
  return undefined;
}
function artList(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value])
    .map(resolveArtUrl).filter((v):v is string=>Boolean(v));
}
const pathFromAsset = (value:unknown) => artList(value)[0];

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
  // Unifideck registers shortcuts in its user-created Steam Collections.
  // They may not yet be included in the first hydrated built-in collection.
  try {
    const collections = globals().collectionStore?.userCollections;
    if (collections?.values) {
      for (const collection of collections.values()) {
        if (String(collection?.displayName || "").startsWith("[Unifideck] ")) {
          rows.push(...asArray(collection.allApps ?? collection.apps));
        }
      }
    }
  } catch (error) {
    console.warn("[game-library] user collection snapshot unavailable", error);
  }
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

/**
 * Resolve native Steam collections by ID first, then TabMaster's saved collection
 * name. Unifideck recreates a collection with a new ID after some syncs;
 * Steam's GetCollectionIDByUserTag and userCollections expose the replacement.
 */
export function getCollectionIdSet(collectionId: string, collectionName?: string): Set<number> | null {
  const cs = globals().collectionStore;
  if(!cs || typeof collectionId !== "string" || collectionId.length > 180) return null;
  const get=(id:string) => {
    try { return cs.GetCollection?.(id) ?? null; } catch { return null; }
  };
  const hasEntries=(collection:AnyObject) =>
    asArray(collection.allApps ?? collection.visibleApps ?? collection.apps);
  const validName=typeof collectionName === "string" && collectionName.trim().length>0 &&
    collectionName.length<=160 ? collectionName.trim() : "";
  let collection:AnyObject|null = get(collectionId);
  if(!collection && validName){
    try {
      const resolved=cs.GetCollectionIDByUserTag?.(validName);
      if(typeof resolved==="string")collection=get(resolved);
    }catch{/* continue searching the collection map */}
  }
  if(!collection && validName){
    try {
      const all=cs.userCollections;
      if(all?.values){
        for(const candidate of all.values()){
          if(candidate?.displayName === validName){
            collection=candidate;break;
          }
        }
      }
    }catch{/* source may not yet be hydrated */}
  }
  if(!collection)return null;
  return new Set(hasEntries(collection)
    .map(x=>Number(typeof x==="number"?x:x?.appid))
    .filter(x=>Number.isSafeInteger(x)&&x>0));
}

/** Map explicitly stored Epic/GOG TabMaster collections through Unifideck's
 * exact collection names, never by guessing shortcut titles or store flags. */
export function getUnifideckCollectionIds(store:"Epic"|"GOG"):Set<number>|null {
  const name="[Unifideck] "+store;
  const cs=globals().collectionStore;
  if(!cs)return null;
  let id="";
  try {id=cs.GetCollectionIDByUserTag?.(name) || "";} catch {/* fallback to map */}
  return getCollectionIdSet(id || name,name);
}

/**
 * ProtonDB accepts Steam store AppIDs. A non-Steam shortcut's own ID is
 * NOT a Steam game identifier, so never use it for ProtonDB ratings.
 */
export function protonDbAppId(game:LibraryGame):number|null {
  if(!game.nonSteam)return Number.isSafeInteger(game.id)&&game.id>0?game.id:null;
  try {
    const overview = globals().appStore?.GetAppOverviewByAppID?.(game.id) as AnyObject | undefined;
    const candidate=Number(overview?.unifideck_steam_app_id ?? overview?.matched_steam_appid);
    if(Number.isSafeInteger(candidate)&&candidate>0&&candidate!==game.id){
      return candidate;
    }
  } catch {/* no verified external Steam AppID mapping */}
  return null;
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
/**
 * Match Steam's own hero resolution. Both jpg/png custom candidates are tested,
 * then cached Steam details, then the public store hero and wide header.
 * Calling this on selection (instead of only when app overviews load)
 * also picks up freshly configured SteamGridDB/Steam custom artwork.
 */
export function heroCandidates(game: LibraryGame): string[] {
  const store = globals().appStore as AnyObject | undefined;
  const details = (window as any).appDetailsStore as AnyObject | undefined;
  const overview = store?.GetAppOverviewByAppID?.(game.id);
  const candidates: string[] = [];
  const add = (value:unknown) => { candidates.push(...artList(value)); };
  try {
    if (overview) {
      add(store?.GetCustomHeroImageURLs?.(overview));
      const hero = details?.GetHeroImages?.(overview);
      add(hero?.rgHeroImages);
      add(details?.GetHeaderImages?.(overview));
    }
  } catch (error) {
    console.warn("[game-library] Steam hero lookup failed", error);
  }
  add(game.hero);
  if (!game.nonSteam) {
    add("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/"+game.id+"/library_hero.jpg");
  }
  add(game.poster);
  if (!game.nonSteam) {
    add("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/"+game.id+"/header.jpg");
  }
  return [...new Set(candidates)];
}
/** Steam's configured logo for this game, including SteamGridDB custom images. */
export function logoCandidates(game: LibraryGame): string[] {
  const store = globals().appStore as AnyObject | undefined;
  const details = (window as any).appDetailsStore as AnyObject | undefined;
  const candidates:string[] = [];
  const add = (source:unknown) => candidates.push(...artList(source));
  try {
    const overview = store?.GetAppOverviewByAppID?.(game.id);
    if (overview) {
      add(store?.GetCustomLogoImageURLs?.(overview)); // jpg, png; invalid files skipped on image error
      add(details?.GetLogoImages?.(overview)?.rgLogoImages);
    }
    const logoFile = details?.GetAppDetails?.(game.id)?.libraryAssets?.strLogoImage;
    if (typeof logoFile === "string" && logoFile) {
      add("https://steamloopback.host/assets/"+game.id+"/"+encodeURIComponent(logoFile));
    }
  } catch (error) {
    console.warn("[game-library] game logo lookup failed", error);
  }
  if (!game.nonSteam) add(
    "https://shared.steamstatic.com/store_item_assets/steam/apps/"+game.id+"/logo.png"
  );
  return [...new Set(candidates)];
}
export function posterCandidates(game:LibraryGame): string[] {
  const store = globals().appStore as AnyObject | undefined;
  const overview = store?.GetAppOverviewByAppID?.(game.id);
  const out:string[]=[];
  try {
    if(overview)out.push(...artList(store?.GetCustomVerticalCapsuleURLs?.(overview)));
  } catch { /* a cover may still have a regular Steam asset */ }
  out.push(...artList(game.poster));
  if(!game.nonSteam)out.push("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/"+game.id+"/library_600x900.jpg");
  return [...new Set(out)];
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
/** Steam's native game page owns install flows (download target, language,
 * store-specific Unifideck prompts). Never RunGame for an uninstalled shortcut. */
export function gameActionLabel(game: LibraryGame): "Play" | "Install" {
  return game.installed ? "Play" : "Install";
}
export function play(game: LibraryGame): void {
  // Not installed: hand off to native Steam/Unifideck details so the real
  // install wizard can select a location and validate entitlements. The
  // dashboard does not claim installation has started until Steam does.
  if (!game.installed) {
    openDetails(game);
    return;
  }
  try {
    const apps = globals().SteamClient?.Apps;
    if (typeof apps?.RunGame === "function") {
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
