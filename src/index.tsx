import { callable, definePlugin, routerHook } from "@decky/api";
import {
  ButtonItem, DropdownItem, Navigation, PanelSection, PanelSectionRow, ToggleField,
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
type TabSource = "auto" | "steam" | "tabmaster";
const getSettings = callable<[], { default_home: boolean; tab_source?: TabSource }>("get_dashboard_settings");
const setSettings = callable<[boolean], boolean>("set_dashboard_settings");
const saveTabSource = callable<[TabSource], boolean>("set_tab_source");

/** Home patch only: other Steam UI and game routes remain completely native. */
type HomePatch = Parameters<typeof routerHook.addPatch>[1];
let homePatch: HomePatch | undefined;
let defaultHome = true;
let tabSource: TabSource = "auto";
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
  const [source,setSource] = useState<TabSource>(tabSource);
  const [busy, setBusy] = useState(false);
  const [sourceBusy,setSourceBusy] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const refresh = () => { setHome(defaultHome);setSource(tabSource); };
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

  const changeTabSource = (next: TabSource) => {
    if(sourceBusy || next===source)return;
    setSourceBusy(true);
    setStatus("");
    void saveTabSource(next).then((saved)=>{
      if(!saved)throw new Error("Tab source could not be saved");
      tabSource=next;
      setSource(next);
      emit();
    }).catch(error=>{
      setStatus("Could not save tab source: "+String(error));
    }).finally(()=>setSourceBusy(false));
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
          <DropdownItem label="Library tabs"
            description="Auto uses TabMaster only when Decky has it enabled. Steam shows built-in library filters."
            rgOptions={[
              {data:"auto",label:"Auto (recommended)"},
              {data:"steam",label:"Steam"},
              {data:"tabmaster",label:"TabMaster"},
            ]}
            selectedOption={source}
            disabled={sourceBusy}
            onChange={(option)=>{
              const next=option.data as TabSource;
              if(next==="auto"||next==="steam"||next==="tabmaster")changeTabSource(next);
            }}
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
    tabSource = saved.tab_source==="steam" || saved.tab_source==="tabmaster"
      ? saved.tab_source : "auto";
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
