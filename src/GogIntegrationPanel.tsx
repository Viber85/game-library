import {useEffect,useState} from "react";
import {callable} from "@decky/api";
import {ButtonItem,Navigation,PanelSection,PanelSectionRow,TextField} from "@decky/ui";
import {getActiveUserId} from "./steam";

export type GogAccount={
  ok:boolean;connected:boolean;username?:string;count?:number;
  synced_at?:number;login_url?:string;reason?:string;
};
type Reply={ok:boolean;reason?:string;warning?:string;count?:number};
const readAccount=callable<[string],GogAccount>("get_gog_account");
const connect=callable<[string,string],Reply>("connect_gog_account");
const synchronize=callable<[string],Reply>("sync_gog_library");
const disconnect=callable<[string],Reply>("disconnect_gog_account");

/** Auth code is submitted to our own Python backend; no other plugin is queried. */
export function GogIntegrationPanel(){
  const [account,setAccount]=useState<GogAccount|null>(null);
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const steamId=getActiveUserId()||"";

  useEffect(()=>{
    let active=true;
    if(!steamId){setError("Sign in to Steam before connecting GOG.");return;}
    void readAccount(steamId).then(value=>{
      if(active){setAccount(value);if(!value.ok)setError(value.reason||"GOG account is unavailable.");}
    }).catch(()=>{
      if(active)setError("Unable to read GOG account settings.");
    });
    return ()=>{active=false;};
  },[steamId]);

  const reload=async()=>{
    const current=await readAccount(steamId);
    setAccount(current);
    if(!current.ok)throw new Error(current.reason||"Unable to load account.");
  };
  const signIn=()=>{
    if(busy||!steamId||!draft.trim())return;
    const submitted=draft.trim();
    setDraft("");setBusy(true);setError("");setNotice("");
    void connect(steamId,submitted).then(async reply=>{
      if(!reply.ok)throw new Error(reply.reason||"GOG sign-in failed.");
      await reload();
      setNotice(reply.warning||"GOG account connected. Owned games are available in Library > GOG.");
    }).catch(e=>setError(e instanceof Error?e.message:"Sign-in failed."))
      .finally(()=>setBusy(false));
  };
  const sync=()=>{
    if(busy||!steamId)return;
    setBusy(true);setError("");setNotice("");
    void synchronize(steamId).then(async reply=>{
      if(!reply.ok)throw new Error(reply.reason||"Sync failed.");
      await reload();
      setNotice("Synced "+(reply.count??0)+" owned GOG games.");
    }).catch(e=>setError(e instanceof Error?e.message:"Sync failed."))
      .finally(()=>setBusy(false));
  };
  const signOut=()=>{
    if(busy||!steamId)return;
    setBusy(true);setError("");setNotice("");
    void disconnect(steamId).then(async reply=>{
      if(!reply.ok)throw new Error(reply.reason||"Disconnect failed.");
      await reload();setNotice("Disconnected. Local GOG tokens and cache were deleted.");
    }).catch(e=>setError(e instanceof Error?e.message:"Disconnect failed."))
      .finally(()=>setBusy(false));
  };

  return <PanelSection title="Game Library · GOG Account">
    <PanelSectionRow>
      <div style={{fontSize:13,lineHeight:1.55}}>
        {account?.connected?
          <><strong>Connected{account.username?" as "+account.username:""}</strong>
            <div>{account.count??0} owned games
              {account.synced_at?
                " · Last sync "+new Date(account.synced_at*1000).toLocaleString():" · Not synced yet"}</div>
          </>:
          <><strong>Not connected</strong>
            <div>Connect directly to GOG to show your purchased games in the GOG library tab.</div>
          </>}
      </div>
    </PanelSectionRow>
    {!account?.connected&&<>
      <PanelSectionRow><div style={{fontSize:12,opacity:.85,lineHeight:1.5}}>
        1. Open the GOG sign-in page and log in to GOG in your browser.
        2. After signing in, copy the entire URL from the GOG login-success page
        (it contains <code>code=</code>). Paste it below and choose Connect.
        Do not paste your GOG password. The code is single-use.
      </div></PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={busy||!account?.login_url} onClick={()=>{
          if(account?.login_url)Navigation.NavigateToExternalWeb(account.login_url);
        }}>Open GOG sign-in page</ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <TextField label="GOG login-success URL or authorization code"
          value={draft} disabled={busy} onChange={event=>setDraft(event.target.value)}/>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={busy||!steamId||draft.trim().length<12}
          onClick={signIn}>{busy?"Connecting…":"Connect GOG account"}</ButtonItem>
      </PanelSectionRow>
    </>}
    {account?.connected&&<>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={sync}>
        {busy?"Synchronizing…":"Refresh GOG library"}
      </ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={()=>
        Navigation.Navigate("/game-library/library")}>Open Library (GOG tab)</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={signOut}>
        Disconnect GOG and delete local credentials</ButtonItem></PanelSectionRow>
    </>}
    <PanelSectionRow><div style={{fontSize:12,opacity:.78,lineHeight:1.5}}>
      Independent integration. Tokens are stored in Game Library's own restricted
      settings folder for this Steam account. Existing Steam games and other
      plugins are not modified. Installation and launching come in a later phase.
    </div></PanelSectionRow>
    {notice&&<PanelSectionRow><div style={{color:"#b9ebd2",fontSize:12}}>{notice}</div></PanelSectionRow>}
    {error&&<PanelSectionRow><div role="alert" style={{color:"#ffafb8",fontSize:12}}>{error}</div></PanelSectionRow>}
  </PanelSection>;
}
