/** Native Steam Input Controller Settings page for ONE selected game.
 * Uses Steam's public steam://controllerconfig/<AppID> deep link.
 * This is distinct from ShowControllerConfigurator(), whose popup was not
 * the full settings page the MSI Claw user requested.
 */
export type SteamClientLike={
  URL?:{ExecuteSteamURL?:(url:string)=>void};
};

export function controllerSettingsUrl(appId:number):string{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)
    throw new Error("Invalid Steam AppID");
  return "steam://controllerconfig/"+appId;
}

export function openControllerFromClient(
  appId:number,client:SteamClientLike|null|undefined
):boolean{
  let url:string;
  try{url=controllerSettingsUrl(appId);}catch{return false;}
  const api=client?.URL;
  if(typeof api?.ExecuteSteamURL!=="function")return false;
  try{api.ExecuteSteamURL.call(api,url);return true;}
  catch(error){
    console.warn("[game-library] native Steam controller settings URL failed",error);
    return false;
  }
}

/** Can run only in a CEF target actually exposed by Steam/Decky. The source
 * interpolates validated numeric AppID only, never a user-controlled string.
 * A boolean 'true' means the URL handler accepted the command, not proof of
 * the screen's appearance; we still require on-device validation.
 */
export function controllerEditorScript(appId:number):string{
  const url=controllerSettingsUrl(appId);
  return `(() => {
    try {
      const api=globalThis.SteamClient?.URL;
      if(typeof api?.ExecuteSteamURL!=="function")return false;
      api.ExecuteSteamURL(${JSON.stringify(url)});
      return true;
    } catch { return false; }
  })()`;
}
