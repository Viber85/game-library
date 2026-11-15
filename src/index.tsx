import { definePlugin, routerHook } from "@decky/api";
import { ButtonItem, Navigation, PanelSection, PanelSectionRow } from "@decky/ui";
import { MdLibraryBooks } from "react-icons/md";
import { Dashboard } from "./Dashboard";

const DASHBOARD_ROUTE = "/game-library/dashboard";

function ControlPanel() {
  return (
    <PanelSection title="Game Library · Preview">
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => {
            Navigation.Navigate(DASHBOARD_ROUTE);
            Navigation.CloseSideMenus();
          }}
        >
          Open Game Library Dashboard
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: 1.4 }}>
          Independent preview. It does not replace Steam Home. D-pad Left on the
          first game moves to the always-visible icon rail.
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  routerHook.addRoute(DASHBOARD_ROUTE, Dashboard, { exact: true });
  return {
    name: "Game Library",
    titleView: <div>Game Library</div>,
    content: <ControlPanel />,
    icon: <MdLibraryBooks />,
    onDismount() {
      routerHook.removeRoute(DASHBOARD_ROUTE);
    },
  };
});
