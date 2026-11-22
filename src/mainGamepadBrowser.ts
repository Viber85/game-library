import {GAME_DETAILS_ROUTE} from "./gameDetailsRoute";

/** Real SteamOS Game Mode navigation is scoped to a SteamUIWindowInstance.
 * Decky's Navigation.NavigateToSteamWeb/ExternalWeb helpers resolve the
 * *focused* window first. After B from Controller Settings that can still
 * be the controller window, so its history resumes the controller screen.
 *
 * Route the HLTB / Store request explicitly to the GamepadUIMainWindowInstance
 * whose current page is OUR dedicated Game Details. Never silently fall back
 * to a focused/overlay/controller window (that reproduces the user's bug).
 *
 * Steam UI source:
 *  SteamUIStore.WindowStore.GamepadUIMainWindowInstance.m_Navigator
 *  m_Navigator.SteamWeb(url) / m_Navigator.ExternalWeb(url)
 */
export type MainGamepadNavigator={
  SteamWeb?:(url:string)=>void;
  ExternalWeb?:(url:string)=>void;
};
export type MainGamepadInstance={
  m_locationPathname?:string;
  m_Navigator?:MainGamepadNavigator;
  Navigator?:MainGamepadNavigator;
};
export type MainGamepadStore={
  WindowStore?:{GamepadUIMainWindowInstance?:MainGamepadInstance|null};
  GetFocusedWindowInstance?:()=>MainGamepadInstance|null;
};

export type MainGamepadOpenResult=
  |{opened:true;target:"main"}
  |{opened:false;reason:"no-main"|"wrong-route"|"no-api"|"failed";currentRoute?:string};

export function openBrowserFromMainGameDetails(
  kind:"hltb"|"store",
  url:string,
  steamUIStore:MainGamepadStore|null|undefined=
    (globalThis as {SteamUIStore?:MainGamepadStore}).SteamUIStore,
):MainGamepadOpenResult{
  const main=steamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
  if(!main)return {opened:false,reason:"no-main"};
  const currentRoute=main.m_locationPathname;
  // Do not dispatch into an old native Controller Settings history or
  // an overlay browser if the main page does not match our own route.
  if(currentRoute&&currentRoute!==GAME_DETAILS_ROUTE)
    return {opened:false,reason:"wrong-route",currentRoute};
  const navigator=main.m_Navigator??main.Navigator;
  const action=kind==="hltb"?navigator?.ExternalWeb:navigator?.SteamWeb;
  if(typeof action!=="function")return {opened:false,reason:"no-api",currentRoute};
  try{
    action.call(navigator,url);
    return {opened:true,target:"main"};
  }catch(error){
    console.warn("[game-library] Steam main Game Mode browser failed",error);
    return {opened:false,reason:"failed",currentRoute};
  }
}
