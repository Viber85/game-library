import { Navigation } from "@decky/ui";

/** Steam's client-side app metadata is an internal API, so all reads are guarded. */
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
}

type UnknownRecord = Record<string, unknown>;

type SteamWindow = Window & {
  appStore?: Record<string, any>;
  collectionStore?: Record<string, any>;
  SteamClient?: Record<string, any>;
};

function client(): SteamWindow {
  return window as SteamWindow;
}

function toObject(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" ? value as UnknownRecord : null;
}

function fromStore(store: Record<string, any> | undefined): unknown[] {
  if (!store) return [];
  try {
    const candidates = [
      typeof store.GetAllApps === "function" ? store.GetAllApps() : null,
      store.m_rgApps,
      store.m_rgAllApps,
      store.m_mapApps,
    ];
    for (const value of candidates) {
      if (Array.isArray(value)) return value;
      if (value instanceof Map) return Array.from(value.values());
      if (value && typeof value === "object" && Symbol.iterator in Object(value)) {
        return Array.from(value as Iterable<unknown>);
      }
      if (value && typeof value === "object") {
        const vals = Object.values(value);
        if (vals.length && vals.some((v) => typeof v === "object")) return vals;
      }
    }
  } catch (error) {
    console.warn("[game-library] Steam app metadata not ready", error);
  }
  return [];
}

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function isFavorite(id: number, app: UnknownRecord): boolean {
  const collections = client().collectionStore;
  try {
    if (typeof collections?.BIsFavorite === "function") return !!collections.BIsFavorite(id);
    if (typeof collections?.BIsGameFavorite === "function") return !!collections.BIsGameFavorite(id);
  } catch {
    // Favorite support differs between Steam client builds.
  }
  return app.is_favorite === true || app.favorite === true;
}

export function getLibraryGames(): LibraryGame[] {
  const rows = fromStore(client().appStore);
  const ids = new Set<number>();
  const games: LibraryGame[] = [];

  for (const row of rows) {
    const a = toObject(row);
    if (!a) continue;

    const id = numberOr(a.appid, numberOr(a.app_id));
    const title = stringOr(a.display_name, stringOr(a.name));
    const type = numberOr(a.app_type, 1);
    // Games and non-Steam shortcuts only; omit tools and media when Steam reports the type.
    const nonSteam = type === 1073741824 || a.is_shortcut === true;
    if (id <= 0 || !title || ids.has(id)) continue;
    if (![0, 1, 2, 1073741824].includes(type) && !nonSteam) continue;
    ids.add(id);

    games.push({
      id,
      title,
      installed: a.installed === true || a.BIsInstalled === true,
      favorite: isFavorite(id, a),
      nonSteam,
      lastPlayed: numberOr(a.rt_last_time_played),
      playtimeMinutes: numberOr(a.minutes_playtime_forever),
      achievementsUnlocked: typeof a.achievements_achieved === "number" ? a.achievements_achieved : undefined,
      achievementsTotal: typeof a.achievements_total === "number" ? a.achievements_total : undefined,
    });
  }

  return games.sort((a, b) => b.lastPlayed - a.lastPlayed || a.title.localeCompare(b.title));
}

export function hasLibraryStore(): boolean {
  return !!client().appStore;
}

export function posterUrl(game: LibraryGame): string | undefined {
  return game.nonSteam ? undefined :
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/" + game.id + "/library_600x900.jpg";
}

export function heroUrl(game: LibraryGame): string | undefined {
  return game.nonSteam ? undefined :
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/" + game.id + "/library_hero.jpg";
}

export function openDetails(game: LibraryGame): void {
  Navigation.Navigate("/library/app/" + game.id);
}

export function play(game: LibraryGame): void {
  try {
    const run = client().SteamClient?.Apps?.RunGame;
    if (typeof run === "function" && (game.installed || game.nonSteam)) {
      const result = run(game.id, "", 100);
      if (result && typeof result.catch === "function") {
        void result.catch(() => openDetails(game));
      }
      return;
    }
  } catch (error) {
    console.warn("[game-library] launch failed, opening details", error);
  }
  openDetails(game);
}

export function lastPlayedLabel(timestamp: number): string {
  if (!timestamp) return "Never";
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function playtimeLabel(minutes: number): string {
  return minutes > 0 ? (minutes / 60).toFixed(1) + " h" : "—";
}
