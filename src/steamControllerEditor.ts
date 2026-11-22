import {Navigation} from "@decky/ui";
import {openControllerSettingsRoute} from "./steamControllerEditorCore";

/** Opens the exact *pre-edit* Controller Settings screen shown in Steam
 * Game Mode: Current Button Layout / Edit Layout / Quick Settings.
 *
 * Steam itself navigates to
 *   ClientRoutes.GamepadUI.ControllerConfigurator.Main(appId)
 * instead of steam://controllerconfig/<appId> (which drops directly into
 * layout editing, as confirmed on the user's actual MSI Claw).
 *
 * The custom Game Details stays intact; B uses Steam's native history.
 */
export async function openSteamControllerEditor(
  appId:number,
  navigate:(route:string)=>void=route=>Navigation.Navigate(route)
):Promise<boolean>{
  return openControllerSettingsRoute(appId,navigate);
}
