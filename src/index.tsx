import { callable, definePlugin, routerHook } from "@decky/api";
import {
  ButtonItem, Navigation, PanelSection, PanelSectionRow, ToggleField,
} from "@decky/ui";
import { Component, ReactNode, useEffect, useState } from "react";
import { MdLibraryBooks } from "react-icons/md";
import { Dashboard } from "./Dashboard";
import { LibraryDiagnostics } from "./LibraryDiagnostics";
import { BuiltinThemePanel } from "./BuiltinThemePanel";
import { startBuiltInThemeRuntime, stopBuiltInThemeRuntime } from "./builtinThemeRuntime";
import { loadDefaultTheme } from "./themeController";
import { startAutoTabSource, stopAutoTabSource } from "./autoTabSource";
import {returnDestinationFromHome,clearDetailsOrigin} from "./detailsReturn";

const DASHBOARD_ROUTE = "/game-library/dashboard";
const LIBRARY_ROUTE = "/game-library/library";
const APPEARANCE_ROUTE = "/game-library/appearance";
const LIBRARY_DIAGNOSTICS_ROUTE = "/game-library/library-diagnostics";
const HOME_ROUTE = "/library/home";
const getSettings = callable<[], { default_home: boolean }>("get_dashboard_settings");
const setSettings = callable<[boolean], boolean>("set_dashboard_settings");

/** Only Steam Home is patched; Midnight Library is an independent Decky route. */
type HomePatch = Parameters<typeof routerHook.addPatch>[1];
let homePatch: HomePatch | undefined;
let defaultHome = true;
let unloaded = false;
const listeners = new Set<() => void>();

function emit() { for (const notify of listeners) notify(); }

class NativeHomeFallback extends Component<
  { native: ReactNode; children: ReactNode }, { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("[game-library] Home rendering failed; showing Steam Home", error); }
  render() { return this.state.failed ? this.props.native : this.props.children; }
}

/** A one-shot return redirect, never a global Game Mode B replacement.
 * When Steam's native details route sends B to Home (instead of a custom
 * Decky route), only a Game Library-launched details session may redirect.
 * Disabled Home replacement still renders the native Home unmodified.
 */
function HomeReturnGate({native}:{native:ReactNode}){
  const [destination]=useState(()=>returnDestinationFromHome());
  useEffect(()=>{
    if(destination)Navigation.Navigate(destination);
  },[destination]);
  if(destination)return null;
  if(!defaultHome)return <>{native}</>;
  return <NativeHomeFallback native={native}>
    <Dashboard originRoute={HOME_ROUTE}/>
  </NativeHomeFallback>;
}

/** Keep a lightweight route gate even if the Home replacement is disabled.
 * Normal native Home content is returned untouched when not restoring a
 * Game Library details session. No global navigator/B listeners are changed.
 */
function updateHomePatch() {
  if (unloaded) return;
  if(homePatch){
    routerHook.removePatch(HOME_ROUTE,homePatch);
    homePatch=undefined;
  }
  try {
    homePatch=routerHook.addPatch(HOME_ROUTE, (props)=>({
      ...props,
      children:<HomeReturnGate native={props.children}/>,
      component:undefined,
      render:undefined,
    }));
  } catch(error){
    console.error("[game-library] Steam Home return gate unavailable",error);
    homePatch=undefined;
  }
}

function ControlPanel() {
  const [home, setHome] = useState(defaultHome);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const refresh = () => setHome(defaultHome);
    listeners.add(refresh);
    return () => { listeners.delete(refresh); };
  }, []);
  const changeHome = (enabled: boolean) => {
    if (busy) return;
    setBusy(true);
    setStatus("");
    void setSettings(enabled).then((saved) => {
      if (!saved) throw new Error("Settings could not be saved");
      defaultHome = enabled;
      setHome(enabled);
      updateHomePatch();
      emit();
    }).catch((error) => {
      setStatus("Could not save startup option: " + String(error));
    }).finally(() => setBusy(false));
  };

  return (
    <>
      <PanelSection title="Game Library · Game Mode">
        <PanelSectionRow>
          <ToggleField
            label="Use as Steam Home"
            description="Show Game Library when Game Mode opens Home, including on return from Desktop and after reboot. Turn off to restore Steam's original Home."
            checked={home}
            disabled={busy}
            onChange={changeHome}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => {
            Navigation.Navigate(DASHBOARD_ROUTE);
            Navigation.CloseSideMenus();
          }}>
            Open Game Library
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => {
            Navigation.Navigate(LIBRARY_DIAGNOSTICS_ROUTE);
            Navigation.CloseSideMenus();
          }}>
            Inspect Library Sources
          </ButtonItem>
        </PanelSectionRow>
        {status && <PanelSectionRow><div style={{fontSize:12}}>{status}</div></PanelSectionRow>}
        <PanelSectionRow>
          <div style={{fontSize:12,opacity:.75,lineHeight:1.5}}>
            Home replacement applies only to Steam's Home route. The original Library,
            games and Quick Access remain available. Disable this switch if another
            plugin also replaces Home.
          </div>
        </PanelSectionRow>
      </PanelSection>
      <BuiltinThemePanel />
    </>
  );
}

export default definePlugin(() => {
  unloaded = false;
  routerHook.addRoute(DASHBOARD_ROUTE,
    ()=> <Dashboard originRoute={DASHBOARD_ROUTE}/>, { exact: true });
  routerHook.addRoute(LIBRARY_ROUTE, ()=> <Dashboard initialMode="library"/>,
    {exact:true});
  routerHook.addRoute(APPEARANCE_ROUTE, ()=> <Dashboard initialMode="appearance"/>,
    {exact:true});
  routerHook.addRoute(LIBRARY_DIAGNOSTICS_ROUTE, LibraryDiagnostics, { exact: true });
  // Tab synchronization belongs to the plugin, not the dashboard route. Decky
  // can hide/unmount Game Mode while enabling TabMaster and UnifiedDeck.
  startAutoTabSource();
  // Built-in Midnight system colors are applied automatically as soon as
  // Decky loads this plugin; CSS Loader is not needed or consulted.
  startBuiltInThemeRuntime();
  void loadDefaultTheme().catch(error=>{
    console.error("[game-library] built-in theme startup failed", error);
  });
  // Load persisted settings before patching so disabled Home never flashes on at boot.
  void getSettings().then((saved) => {
    if(unloaded) return;
    defaultHome = saved.default_home !== false;
    updateHomePatch();
    emit();
  }).catch((error) => {
    console.warn("[game-library] settings unavailable; retaining default Home behavior", error);
    if(!unloaded) { updateHomePatch(); emit(); }
  });
  return {
    name: "Game Library",
    titleView: <div>Game Library</div>,
    content: <ControlPanel />,
    icon: <MdLibraryBooks />,
    onDismount() {
      unloaded = true;
      stopAutoTabSource();
      stopBuiltInThemeRuntime();
      clearDetailsOrigin();
      listeners.clear();
      if(homePatch) {
        routerHook.removePatch(HOME_ROUTE, homePatch);
        homePatch = undefined;
      }
      routerHook.removeRoute(DASHBOARD_ROUTE);
      routerHook.removeRoute(LIBRARY_ROUTE);
      routerHook.removeRoute(APPEARANCE_ROUTE);
      routerHook.removeRoute(LIBRARY_DIAGNOSTICS_ROUTE);
    },
  };
});
