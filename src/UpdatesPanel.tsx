import { useEffect, useState } from "react";
import { callable } from "@decky/api";
import {
  ButtonItem, ConfirmModal, Field, Navigation,
  PanelSection, PanelSectionRow, showModal,
} from "@decky/ui";
import { MdSystemUpdate } from "react-icons/md";

const RELEASES_API = "https://api.github.com/repos/Viber85/game-library/releases?per_page=30";
const RELEASES_URL = "https://github.com/Viber85/game-library/releases";
type GithubRelease = {
  version:string; tag:string; notes:string; asset_url:string;
  sha256:string; release_url:string;
};
type UpdateInfo = {
  ok:boolean; current?:string; available:boolean; latest:GithubRelease|null;
  error?:string;
};
type Loader = { callable?: (route:string)=>(...args:any[])=>Promise<any> };
const loader = ():Loader|null => (window as Window & {DeckyBackend?:Loader}).DeckyBackend ?? null;
const checkUpdates = callable<[], UpdateInfo>("check_updates");
const validateReleases = callable<[string], UpdateInfo>("validate_github_releases");
const getVersion = callable<[],{version:string;error?:string}>("get_installed_version");
const limited = <T,>(p:Promise<T>) => Promise.race([
  p, new Promise<T>((_,reject)=>setTimeout(()=>reject(new Error("Request timed out")),12000))
]);

export function UpdatesPanel() {
  const [installed,setInstalled] = useState("Loading…");
  const [checking,setChecking] = useState(false);
  const [message,setMessage] = useState("Check GitHub for updates.");
  const [manual,setManual] = useState("");
  useEffect(()=>{
    let active=true;
    void getVersion().then(v=>{
      if(active)setInstalled(v.version||"Unknown");
    }).catch(e=>{if(active)setInstalled("Unavailable: "+String(e))});
    return ()=>{active=false};
  },[]);

  const requestInstall = (release:GithubRelease) => {
    if(!release.sha256) {
      setManual(release.asset_url);
      setMessage("GitHub has not published a SHA-256 digest. Use manual Decky ZIP install.");
      return;
    }
    const host=loader();
    if(typeof host?.callable !== "function"){
      setManual(release.asset_url);
      setMessage("Decky installation service unavailable. Use Decky Developer → Install from ZIP/URL.");
      return;
    }
    try {
      const install=host.callable("utilities/install_plugin");
      if(typeof install !== "function") throw new Error("Missing install route");
      setMessage("Update request sent to Decky. Confirm installation in its dialog.");
      void install(release.asset_url,"Game Library",release.version,release.sha256,2)
        .catch((e:unknown)=>{
          setManual(release.asset_url);
          setMessage("Decky could not install update: "+String(e));
        });
    } catch(e) {
      setManual(release.asset_url);
      setMessage("Installer unavailable: "+String(e));
    }
  };

  const confirm = (release:GithubRelease) => {
    const modal=showModal(
      <ConfirmModal strTitle={"Game Library "+release.tag}
        strOKButtonText="Install" onCancel={()=>modal.Close()}
        onOK={()=>{modal.Close();requestInstall(release);}}>
        <div style={{padding:10}}>
          <div style={{fontSize:13,marginBottom:8}}>
            New development version available. Decky will download and validate the ZIP before updating.
          </div>
          <div style={{fontSize:12,whiteSpace:"pre-wrap",maxHeight:210,overflowY:"auto"}}>
            {release.notes}
          </div>
          <div style={{fontSize:12,marginTop:10}}>
            If Decky cannot install this release, use the download link in GitHub Releases.
          </div>
        </div>
      </ConfirmModal>
    );
  };

  const check = async () => {
    if(checking)return;
    setChecking(true);setManual("");setMessage("Checking GitHub…");
    let upstreamError="";
    try {
      let result:UpdateInfo|null=null;
      const host=loader();
      if(typeof host?.callable==="function"){
        try {
          const http=await limited(host.callable("utilities/http_request")(
            "GET",RELEASES_API,{
              headers:{"Accept":"application/vnd.github+json",
                "X-GitHub-Api-Version":"2022-11-28"}
            },8)) as {status:number;body:string};
          if(http.status!==200) throw new Error("GitHub HTTP "+http.status);
          result=await limited(validateReleases(http.body));
          if(!result.ok) throw new Error(result.error||"Invalid GitHub response.");
        } catch(e) {upstreamError=String(e);result=null;}
      }
      if(!result){
        const fallback=await limited(checkUpdates());
        if(!fallback.ok)throw new Error((fallback.error||"GitHub unavailable")+
          (upstreamError?" · Decky: "+upstreamError:""));
        result=fallback;
      }
      if(result.available && result.latest){
        setMessage("New version: "+result.latest.tag+" · Installed: "+(result.current||installed));
        confirm(result.latest);
      } else {
        setMessage("Installed "+(result.current||installed)+" — no newer release.");
      }
    }catch(e){
      setMessage("Update check failed: "+String(e).slice(0,320));
    }finally{setChecking(false);}
  };

  return <PanelSection title="Game Library Updates">
    <PanelSectionRow><Field label="Installed version" description={installed}/></PanelSectionRow>
    <PanelSectionRow>
      <ButtonItem layout="below" disabled={checking} onClick={()=>{void check();}}>
        <MdSystemUpdate style={{marginRight:8}} />{checking?"Checking GitHub…":"Check for updates"}
      </ButtonItem>
    </PanelSectionRow>
    <PanelSectionRow><Field label="Update status" description={message}/></PanelSectionRow>
    {manual && <PanelSectionRow><Field label="Manual ZIP install" description={manual}/></PanelSectionRow>}
    <PanelSectionRow><ButtonItem layout="below"
      onClick={()=>Navigation.NavigateToExternalWeb(RELEASES_URL)}>
      Open GitHub Releases
    </ButtonItem></PanelSectionRow>
    <PanelSectionRow><Field label="Private GitHub repository"
      description="Unauthenticated update checks return HTTP 404 for private repos. Automatic updates require a public release source."/>
    </PanelSectionRow>
  </PanelSection>;
}
