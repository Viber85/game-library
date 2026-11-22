/** Game Mode's *full* per-game Controller Settings screen.
 *
 * Source: Steam's own GamepadUI routes:
 * ClientRoutes.GamepadUI.ControllerConfigurator.Main(appId)
 *   => /app/<appid>/controllerconfigurator/main
 *
 * This is the page with Current Button Layout, Edit Layout and Quick
 * Settings. In contrast, steam://controllerconfig/<appid> opens straight
 * into the layout editor on the user's MSI Claw.
 */
export function controllerSettingsRoute(appId:number):string{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)
    throw new Error("Invalid Steam AppID");
  return "/app/"+appId+"/controllerconfigurator/main";
}

/** Route through the same native Game Mode navigator used by Steam's own
 * game-detail gamepad icon. No synthetic controller input or DOM patching.
 * Returns true only if navigation was dispatched without throwing; on-device
 * route rendering must still be verified.
 */
export function openControllerSettingsRoute(
  appId:number,navigate:(route:string)=>void
):boolean{
  let route:string;
  try{route=controllerSettingsRoute(appId);}catch{return false;}
  try{
    navigate(route);
    return true;
  }catch(error){
    console.warn("[game-library] Steam Controller Settings route rejected",error);
    return false;
  }
}
