/** Ask Steam to open its REAL left menu. Do not duplicate native rows,
 * synthesize controller key presses or navigate to an imitation menu.
 */
type MenuHost={OpenMainMenu?:()=>void};
export function openNativeSteamMenu(navigation?:unknown,environment:unknown=globalThis):boolean{
  const root=environment as Record<string,any>;
  const steam=root?.SteamUIStore;
  const candidates:unknown[]=[
    navigation,root?.MainMenuStore,root?.mainMenuStore,
    steam?.m_MenuStore,steam?.m_MainMenuStore,steam?.MenuStore,
    root?.GamepadUIStore?.m_MenuStore,
  ];
  for(const candidate of candidates){
    const host=candidate as MenuHost|null|undefined;
    if(typeof host?.OpenMainMenu!=="function")continue;
    try{host.OpenMainMenu();return true;}
    catch(error){console.warn("[game-library] Steam main menu unavailable",error);}
  }
  return false;
}
