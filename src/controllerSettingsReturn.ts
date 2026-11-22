import type {DetailsOriginRoute} from "./detailsReturn";

/** A Steam GamepadUI native page unmounts the Decky Dashboard. Therefore
 * browser history returns to the *route*, not the React-only open Details.
 * This short-lived one-shot token restores our own Details on the same
 * origin route when B returns from Controller Settings.
 */
export type GameDetailsReturnTarget={
  kind:"grid"|"home-card"|"home-action"|"collections";
  gameId:number;
  index:number;
  scrollTop:number;
};
export type ControllerSettingsReturn={
  route:DetailsOriginRoute;
  appId:number;
  target:GameDetailsReturnTarget;
};
type Pending=ControllerSettingsReturn&{at:number};
const MAX_AGE_MS=10*60*1000;
let pending:Pending|null=null;

export function armControllerSettingsReturn(
  value:ControllerSettingsReturn,
  now=Date.now(),
):boolean{
  const {appId,route,target}=value;
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff||
    !route.startsWith("/")||
    !["/library/home","/game-library/dashboard","/game-library/library",
      "/game-library/search","/game-library/collections"].includes(route)||
    !target||target.gameId!==appId||
    !["grid","home-card","home-action","collections"].includes(target.kind)||
    !Number.isInteger(target.index)||target.index<0||
    !Number.isFinite(target.scrollTop)||target.scrollTop<0||
    !Number.isFinite(now))return false;
  pending={route,appId,target:{...target},at:now};
  return true;
}

export function consumeControllerSettingsReturn(
  route:DetailsOriginRoute,
  now=Date.now(),
):ControllerSettingsReturn|null{
  if(!pending)return null;
  if(now-pending.at>MAX_AGE_MS||now<pending.at){
    pending=null;
    return null;
  }
  if(pending.route!==route)return null;
  const {at:_ignored,...value}=pending;
  pending=null;
  return {...value,target:{...value.target}};
}

export function clearControllerSettingsReturn(appId?:number):void{
  if(appId===undefined||pending?.appId===appId)pending=null;
}

/** Steam's external browser also unmounts our React-only Game Details.
 * Use the SAME single-use, route-scoped return token instead of pushing a
 * second overlapping native return mechanism or reconstructing history.
 */
export function armGameDetailsWebReturn(
  value:ControllerSettingsReturn,
  now=Date.now(),
):boolean{
  return armControllerSettingsReturn(value,now);
}

