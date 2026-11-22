export type SteamClientLike={Apps?:{ShowControllerConfigurator?:(appid:number)=>void}};

/** This is the documented Steam Input controller configurator, not the game's
 * Properties/Settings window. A missing function must NOT be substituted with
 * Navigation.Navigate("/library/app/:id").
 */
export function openControllerFromClient(
  appId:number,client:SteamClientLike|null|undefined
):boolean{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)return false;
  const apps=client?.Apps;
  const open=apps?.ShowControllerConfigurator;
  if(typeof open!=="function")return false;
  try{open.call(apps,appId);return true;}
  catch(error){
    console.warn("[game-library] Steam controller editor failed",error);
    return false;
  }
}

export function controllerEditorScript(appId:number):string{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)
    throw new Error("Invalid Steam AppID");
  // All data is validated numeric AppID; no user-controlled JS can be injected.
  return `(() => {
    try {
      const apps=globalThis.SteamClient?.Apps;
      if(typeof apps?.ShowControllerConfigurator!=="function")return false;
      apps.ShowControllerConfigurator(${appId});
      return true;
    } catch { return false; }
  })()`;
}
