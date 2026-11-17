import { callable, definePlugin, routerHook } from "@decky/api";
import {
  ButtonItem, Navigation, PanelSection, PanelSectionRow, ToggleField,
} from "@decky/ui";
import { Component, ReactNode, useEffect, useState } from "react";
import { MdLibraryBooks } from "react-icons/md";
import { Dashboard } from "./Dashboard";
import { UpdatesPanel } from "./UpdatesPanel";
import { BuiltinThemePanel } from "./BuiltinThemePanel";
import { startBuiltInThemeRuntime, stopBuiltInThemeRuntime } from "./builtinThemeRuntime";
import { loadDefaultTheme } from "./themeController";

const DASHBOARD_ROUTE = "/game-library/dashboard";
const HOME_ROUTE = "/library/home";
const getSettings = callable<[], { default_home: boolean }>("get_dashboard_settings");
const setSettings = callable<[boolean], boolean>("set_dashboard_settings");

/** Home patch only: other Steam UI and game routes remain completely native. */
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

/** Installing the patch does not navigate the user away from a running game. */
function updateHomePatch() {
  if (unloaded) return;
  if (defaultHome && !homePatch) {
    try {
      homePatch = routerHook.addPatch(HOME_ROUTE, (props) => ({
        ...props,
        children: <NativeHomeFallback native={props.children}><Dashboard /></NativeHomeFallback>,
        component: undefined,
        render: undefined,
      }));
    } catch (error) {
      console.error("[game-library] Steam Home patch unavailable", error);
      homePatch = undefined;
    }
  } else if (!defaultHome && homePatch) {
    routerHook.removePatch(HOME_ROUTE, homePatch);
    homePatch = undefined;
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
            Open Game Library Dashboard
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
      <UpdatesPanel />
    </>
  );
}

export default definePlugin(() => {
  unloaded = false;
  routerHook.addRoute(DASHBOARD_ROUTE, Dashboard, { exact: true });
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
      stopBuiltInThemeRuntime();
      listeners.clear();
      if(homePatch) {
        routerHook.removePatch(HOME_ROUTE, homePatch);
        homePatch = undefined;
      }
      routerHook.removeRoute(DASHBOARD_ROUTE);
    },
  };
});
