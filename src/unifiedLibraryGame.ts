import type {LibraryGame} from "./steam";
import type {GogOwnedGame} from "./GogArtwork";

/**
 * Store-neutral inventory identity.
 *
 * Neither GOG nor any future provider is allowed to forge a Steam app ID.
 * Provider IDs remain strings and must be namespaced before used as keys.
 *
 * Only the Steam provider can request Steam's native install/launch actions.
 * External stores must explicitly implement their own installer/launcher;
 * UI never guesses that an owned title can be launched.
 */
export type GameStore="steam"|"gog"|"epic"|"ubisoft"|"ea"|"amazon"|"other";
export type GameAvailability="installed"|"not-installed"|"unknown";
export type GameCapability="details"|"install"|"launch"|"uninstall"|"update";
export type UnifiedLibraryGame={
  key:string;
  store:GameStore;
  storeId:string;
  steamAppId?:number;
  title:string;
  availability:GameAvailability;
  cover?:string;
  coverFallback?:string;
  hero?:string;
  playtimeMinutes?:number;
  lastPlayed?:number;
  capabilities:readonly GameCapability[];
};

const SAFE_STORE_ID=/^[A-Za-z0-9._-]{1,128}$/;

export function libraryGameKey(store:GameStore,id:string):string{
  if(!SAFE_STORE_ID.test(id))throw Error("Invalid store game identifier");
  return store+":"+id;
}

export function fromSteamLibraryGame(game:LibraryGame):UnifiedLibraryGame{
  return {
    key:libraryGameKey("steam",String(game.id>>>0)),
    store:"steam",
    storeId:String(game.id>>>0),
    steamAppId:game.id,
    title:game.title,
    availability:game.installed?"installed":"not-installed",
    cover:game.poster,
    hero:game.hero,
    playtimeMinutes:game.playtimeMinutes,
    lastPlayed:game.lastPlayed,
    capabilities:["details","install","launch"],
  };
}

export function fromGogLibraryGame(game:GogOwnedGame):UnifiedLibraryGame{
  return {
    key:libraryGameKey("gog",game.id),
    store:"gog",
    storeId:game.id,
    title:game.title,
    availability:"unknown",
    cover:game.image||undefined,
    coverFallback:game.imageFallback||undefined,
    hero:game.background||undefined,
    capabilities:["details","install"],
  };
}

/** Add future providers by extending adapters, not Dashboard rendering logic. */
export type StoreCatalogAdapter<T>={
  store:GameStore;
  toLibraryGame:(record:T)=>UnifiedLibraryGame;
};
export const steamCatalogAdapter:StoreCatalogAdapter<LibraryGame>={
  store:"steam",toLibraryGame:fromSteamLibraryGame,
};
export const gogCatalogAdapter:StoreCatalogAdapter<GogOwnedGame>={
  store:"gog",toLibraryGame:fromGogLibraryGame,
};
