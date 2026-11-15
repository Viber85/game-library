import { ConfirmModal, showModal } from "@decky/ui";
import { MdHelpOutline } from "react-icons/md";
import type { LibraryGame } from "./steam";
import { openDetails } from "./steam";
import { Focusable } from "@decky/ui";

/**
 * The Steam client currently has a known native Linux shortcut regression:
 * forcing Windows Proton on AppImages / Flatpaks can prevent launch.
 * We do NOT modify Steam shortcut commands or compatibility tools.
 * Expose the native Steam entry for inspection instead.
 */
export function LinuxLaunchHelp({game}:{game:LibraryGame}) {
  const showHelp = () => {
    const dialog = showModal(
      <ConfirmModal
        strTitle="Non-Steam app won't start"
        strOKButtonText="Open Steam game details"
        strCancelButtonText="Close"
        onOK={() => { dialog.Close(); openDetails(game); }}
        onCancel={() => dialog.Close()}
      >
        <div style={{fontSize:13,lineHeight:1.5,padding:"6px 10px",maxHeight:350,overflowY:"auto"}}>
          <p style={{marginTop:0}}><strong>{game.title}</strong> is marked installed in Steam, but that only
            means Steam recognizes the shortcut. It does not verify the Linux executable.</p>
          <p><strong>1.</strong> Try the original Steam Library's Play button. If it fails there too,
            this is not caused by the Game Library dashboard.</p>
          <p><strong>2.</strong> In Steam game details open Properties → Compatibility. Native Linux AppImage
            and Flatpak applications should not be forced through Windows Proton. If Steam
            forces a tool, try Steam Linux Runtime or Steam-Play-None (if installed).</p>
          <p><strong>3.</strong> Under Properties → Shortcut, confirm AppImage's Target exists and is
            executable. For Flatpak, check that Target and Launch Options point to its
            actual `flatpak run ...` command.</p>
          <p style={{color:"#b5cae2"}}>This helper never changes permissions, app launch commands or Proton settings.</p>
        </div>
      </ConfirmModal>
    );
  };

  return <Focusable className="gl-button gl-help" focusClassName="gl-focused" noFocusRing
    onActivate={showHelp} onOKActionDescription="Linux launch help">
    <MdHelpOutline/> Launch Help
  </Focusable>;
}
