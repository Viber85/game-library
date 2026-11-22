import type {LibraryGame} from "./steam";
import type {DetailsOriginRoute} from "./detailsReturn";
import type {GameDetailsReturnTarget} from "./controllerSettingsReturn";

export const GAME_DETAILS_ROUTE="/game-library/game-details";
export type GameDetailsOriginMode=
  "home"|"library"|"search"|"collections"|"appearance"|"tabs"|"settings";

export type GameDetailsRouteSession={
  game:LibraryGame;
  originRoute:DetailsOriginRoute;
  originMode:GameDetailsOriginMode;
  target:GameDetailsReturnTarget;
};

type Stored=GameDetailsRouteSession&{savedAt:number};
let active:Stored|null=null;
const MAX_AGE_MS=60*60*1000;

/** Game Details is a real Steam Game Mode history entry. Do not keep it as
 * transient React-only state on /game-library/library: B from HLTB/Store
 * otherwise replays stale Controller Settings and skips our game screen.
 */
export function stageGameDetailsRoute(session:GameDetailsRouteSession,now=Date.now()):boolean{
  if(!session||!session.game||
    !Number.isSafeInteger(session.game.id)||session.game.id<=0||
    !Number.isSafeInteger(session.target?.gameId)||
    session.target.gameId!==session.game.id||
    !Number.isFinite(now)||!session.originRoute.startsWith("/"))return false;
  active={...session,target:{...session.target},savedAt:now};
  return true;
}

export function readGameDetailsRoute(now=Date.now()):GameDetailsRouteSession|null{
  if(!active)return null;
  if(!Number.isFinite(now)||now<active.savedAt||now-active.savedAt>MAX_AGE_MS){
    active=null;
    return null;
  }
  return {
    game:active.game,originRoute:active.originRoute,originMode:active.originMode,
    target:{...active.target}
  };
}

export function clearGameDetailsRoute():void{active=null;}
