/**
 * Use Steam's own URL protocol to request the native uninstall confirmation.
 *
 * This is NOT Steam's private React UninstallDialog (which crashed Game Mode),
 * and not OpenUninstallWizard(..., true) (which bypasses the prompt).
 * Only SteamClient.URL.ExecuteSteamURL owns dispatching steam:// URLs.
 */
export type SteamUrlClient={
  URL?:{ExecuteSteamURL?:(url:string)=>unknown};
};
export type UninstallLinkResult={sent:boolean;reason?:"invalid-app"|"unavailable"|"failed"};

export function requestSteamUninstallLink(
  appId:number,nonSteam:boolean,client:SteamUrlClient|null|undefined
):UninstallLinkResult{
  if(nonSteam||!Number.isSafeInteger(appId)||appId<=0||appId>=0x80000000)
    return {sent:false,reason:"invalid-app"};
  if(typeof client?.URL?.ExecuteSteamURL!=="function")
    return {sent:false,reason:"unavailable"};
  try{
    // The client owns navigation AND the destructive-confirmation dialog.
    // A void return means dispatched, not confirmed. Never delete here.
    client.URL.ExecuteSteamURL("steam://uninstall/"+appId);
    return {sent:true};
  }catch(error){
    console.warn("[game-library] Steam uninstall URL dispatch failed",error);
    return {sent:false,reason:"failed"};
  }
}
