/** Native Steam Install button (GamepadUI).
 *
 * Steam's own InstallApp store calls SteamClient.Installs.OpenInstallWizard
 * with the selected AppID, which opens Steam's normal drive/location picker.
 * We must not call ContinueInstall: the player chooses the library location,
 * accepts any prompts and confirms the actual installation in Steam's UI.
 *
 * The extra local client ID "0" is used by working Decky implementations
 * when calling OpenInstallWizard directly as a compatibility fallback.
 */
export const STEAM_LOCAL_INSTALL_CLIENT_ID="0";

export type NativeInstallStore={InstallApp?:(appId:number,localClientId?:string)=>unknown};
export type NativeInstallClient={Installs?:{
  OpenInstallWizard?:(appIds:number[],localClientId?:string)=>unknown
}};
export type InstallWizardResult=
  |{opened:true;method:"steam-ui-store"|"steam-installs"}
  |{opened:false;reason:"invalid-app"|"non-steam"|"unavailable"|"request-failed"};

export function requestNativeSteamInstallWizard(
  appId:number,
  nonSteam:boolean,
  store:NativeInstallStore|null|undefined,
  client:NativeInstallClient|null|undefined,
):InstallWizardResult{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)
    return {opened:false,reason:"invalid-app"};
  // Non-Steam shortcuts (including games imported from other launchers)
  // have different installers; never pass their shortcut IDs to Steam.
  if(nonSteam||appId>=0x80000000)return {opened:false,reason:"non-steam"};

  let failed=false;
  const installFromStore=store?.InstallApp;
  if(typeof installFromStore==="function"){
    try{
      installFromStore.call(store,appId,STEAM_LOCAL_INSTALL_CLIENT_ID);
      return {opened:true,method:"steam-ui-store"};
    }catch(error){
      failed=true;
      console.warn("[game-library] Steam UI InstallApp rejected request",error);
    }
  }

  const open=client?.Installs?.OpenInstallWizard;
  if(typeof open==="function"){
    try{
      open.call(client!.Installs,[appId],STEAM_LOCAL_INSTALL_CLIENT_ID);
      return {opened:true,method:"steam-installs"};
    }catch(error){
      failed=true;
      console.warn("[game-library] Steam Install wizard rejected request",error);
    }
  }

  return {opened:false,reason:failed?"request-failed":"unavailable"};
}
